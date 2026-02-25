import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import type { ChunkWithScore } from './vectorStore.js';

const prisma = new PrismaClient();

export interface ChatResponse {
  response: string;
  citations: Citation[];
}

export interface Citation {
  chunkId: string;
  documentId: string;
  documentName: string;
  text: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Generate a chat response using RAG (Retrieval Augmented Generation)
 */
export async function generateChatResponse(
  query: string,
  relevantChunks: ChunkWithScore[],
  conversationHistory: ChatMessage[],
  apiKey: string,
  allDocumentNames: string[] = [],
  customAiModel?: string | null
): Promise<ChatResponse> {
  const isOpenAI = apiKey.startsWith('sk-');

  // Get document names for citations
  const documents = await prisma.document.findMany({
    where: {
      id: {
        in: relevantChunks.map(c => c.documentId),
      },
    },
  });

  const docMap = new Map(documents.map(d => [d.id, d.filename]));

  // Build context from relevant chunks, explicitly attributing the document name
  const context = relevantChunks
    .map((chunk, index) => {
      const docName = docMap.get(chunk.documentId) || 'Unknown Document';
      return `[Source ${index + 1}] (From document: ${docName})\n${chunk.content}`;
    })
    .join('\n\n');

  // Build the string list of all available documents
  const availableDocsString = allDocumentNames.length > 0
    ? `\n\nYou have access to the following documents in this project:\n${allDocumentNames.map(name => `- ${name}`).join('\n')}`
    : '';

  // Build the system prompt
  const systemPrompt = `You are a helpful research assistant for ScholarStack. Your role is to help researchers understand and synthesize information from their uploaded documents.${availableDocsString}

IMPORTANT INSTRUCTIONS:
1. Answer questions using ONLY the information provided in the context below. If asked about what documents you have access to, base your answer on the list provided above.
2. If the context doesn't contain enough information to answer the question, say so clearly.
3. ALWAYS cite your sources using [Source X] notation when referencing information.
4. When citing, try to be specific about which source supports each claim.
5. Do not make up or hallucinate information that isn't in the context.
6. Be concise but thorough in your explanations.

Context from documents:
${context}`;

  // Build messages array
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: query },
  ];

  try {
    let aiResponse = '';

    if (isOpenAI) {
      const openai = new OpenAI({ apiKey });
      const modelName = customAiModel || 'gpt-4o-mini';
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: messages as any,
        temperature: 0.3,
        max_tokens: 1000,
      });
      aiResponse = response.choices[0].message.content || '';
    } else {
      // Use Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = customAiModel || 'gemini-2.5-flash';
      const model = genAI.getGenerativeModel({ model: modelName });

      // Gemini handles system instruction specifically
      const geminiModel = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt
      });

      // Convert history to Gemini format (user vs model)
      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // In Gemini, we can just send the chat query and history if it's instantiating a ChatSession
      const chat = geminiModel.startChat({
        history: formattedHistory,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        }
      });

      const response = await chat.sendMessage(query);
      aiResponse = response.response.text();
    }

    // Extract citations from the response
    const citations = extractCitations(aiResponse, relevantChunks, docMap);

    return {
      response: aiResponse,
      citations,
    };
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw new Error('Failed to generate AI response');
  }
}

/**
 * Extract citations from the AI response
 */
function extractCitations(
  response: string,
  chunks: ChunkWithScore[],
  docMap: Map<string, string>
): Citation[] {
  const citations: Citation[] = [];
  const sourceRegex = /\[Source (\d+)\]/g;
  const seenChunks = new Set<string>();

  let match;
  while ((match = sourceRegex.exec(response)) !== null) {
    const sourceIndex = parseInt(match[1]) - 1;
    if (sourceIndex >= 0 && sourceIndex < chunks.length) {
      const chunk = chunks[sourceIndex];
      if (!seenChunks.has(chunk.id)) {
        seenChunks.add(chunk.id);
        citations.push({
          chunkId: chunk.id,
          documentId: chunk.documentId,
          documentName: docMap.get(chunk.documentId) || 'Unknown Document',
          text: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
        });
      }
    }
  }

  return citations;
}
