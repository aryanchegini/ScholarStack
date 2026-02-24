import OpenAI from 'openai';
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
  apiKey: string
): Promise<ChatResponse> {
  const openai = new OpenAI({ apiKey });

  // Get document names for citations
  const documents = await prisma.document.findMany({
    where: {
      id: {
        in: relevantChunks.map(c => c.documentId),
      },
    },
  });

  const docMap = new Map(documents.map(d => [d.id, d.filename]));

  // Build context from relevant chunks
  const context = relevantChunks
    .map((chunk, index) => {
      return `[Source ${index + 1}] ${chunk.content}`;
    })
    .join('\n\n');

  // Build the system prompt
  const systemPrompt = `You are a helpful research assistant for ScholarStack. Your role is to help researchers understand and synthesize information from their uploaded documents.

IMPORTANT INSTRUCTIONS:
1. Answer questions using ONLY the information provided in the context below.
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      temperature: 0.3,
      max_tokens: 1000,
    });

    const aiResponse = response.choices[0].message.content || '';

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
