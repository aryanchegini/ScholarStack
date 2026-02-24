import express from 'express';
import { PrismaClient } from '@prisma/client';
import { findRelevantChunks } from '../services/vectorStore.js';
import { generateChatResponse } from '../services/ragService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Chat endpoint with RAG
router.post('/', async (req, res, next) => {
  try {
    const { projectId, query, conversationHistory = [] } = req.body;

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

    // Find relevant chunks from documents
    const relevantChunks = await findRelevantChunks(projectId, query, 5);

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
      apiKey
    );

    res.json({
      response,
      citations,
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

// Get chat history (placeholder for future implementation)
router.get('/history/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // For MVP, we're not storing chat history
    // This endpoint is a placeholder for future implementation
    res.json([]);
  } catch (error) {
    next(error);
  }
});

export default router;
