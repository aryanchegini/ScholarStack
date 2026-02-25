import express from 'express';
import { PrismaClient } from '@prisma/client';
import { findRelevantChunks } from '../services/vectorStore.js';
import { generateChatResponse } from '../services/ragService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Chat endpoint with RAG
router.post('/', async (req, res, next) => {
  try {
    const { projectId, query, conversationHistory = [], sessionId } = req.body;

    if (!projectId || !query) {
      return res.status(400).json({ error: 'Project ID and query are required' });
    }

    // Get user's API key
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { user: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const apiKey = project.user?.apiKey;
    if (!apiKey) {
      return res.status(400).json({ error: 'Please set your API key in settings' });
    }

    // Find relevant chunks from documents (pull 20 chunks to ensure enough context across papers for summaries)
    const relevantChunks = await findRelevantChunks(projectId, query, 20, apiKey);

    // Get all documents in the project to provide full context to the AI
    const allProjectDocuments = await prisma.document.findMany({
      where: { projectId },
      select: { filename: true }
    });

    if (relevantChunks.length === 0) {
      return res.json({
        response: "I couldn't find any relevant information in your documents to answer this question. Please try uploading more documents or rephrasing your question.",
        citations: [],
        sources: []
      });
    }

    // Generate chat response using RAG
    const { response, citations } = await generateChatResponse(
      query,
      relevantChunks,
      conversationHistory,
      apiKey,
      allProjectDocuments.map(d => d.filename),
      (project.user as any)?.aiModel
    );

    // Save chat history to database
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const newSession = await prisma.chatSession.create({
        data: {
          projectId,
          title: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
        }
      });
      activeSessionId = newSession.id;
    }

    // Save User message
    await prisma.chatMessage.create({
      data: {
        sessionId: activeSessionId,
        role: 'user',
        content: query,
      }
    });

    // Save Assistant message
    await prisma.chatMessage.create({
      data: {
        sessionId: activeSessionId,
        role: 'assistant',
        content: response,
        citations: JSON.stringify(citations),
      }
    });

    res.json({
      response,
      citations,
      sessionId: activeSessionId,
      sources: relevantChunks.map(chunk => ({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        content: chunk.content.substring(0, 200) + '...',
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get all chat sessions for a project
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const sessions = await prisma.chatSession.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

// Get all messages for a specific chat session
router.get('/session/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

export default router;
