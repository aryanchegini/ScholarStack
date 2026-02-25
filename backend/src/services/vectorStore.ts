import { PrismaClient } from '@prisma/client';
import { generateQueryEmbedding, cosineSimilarity } from './embeddings.js';

const prisma = new PrismaClient();

export interface ChunkWithScore {
  id: string;
  documentId: string;
  content: string;
  score: number;
}

/**
 * Find the most relevant chunks for a query using vector similarity search
 */
export async function findRelevantChunks(
  projectId: string,
  query: string,
  topK: number = 5,
  apiKey?: string
): Promise<ChunkWithScore[]> {
  // Get all documents for the project
  const documents = await prisma.document.findMany({
    where: { projectId },
    include: {
      chunks: true,
    },
  });

  if (documents.length === 0) {
    return [];
  }

  // Collect all chunks
  const allChunks = documents.flatMap(doc =>
    doc.chunks.map(chunk => ({
      ...chunk,
      documentName: doc.filename,
    }))
  );

  // Filter out chunks without embeddings
  const chunksWithEmbeddings = allChunks.filter(chunk => {
    try {
      const embedding = JSON.parse(chunk.embedding || '[]');
      return embedding.length > 0;
    } catch {
      return false;
    }
  });

  // If no API key provided, return chunks by keyword matching
  if (!apiKey) {
    return keywordSearch(allChunks, query, topK);
  }

  // If no chunks have embeddings yet, fall back to keyword search
  if (chunksWithEmbeddings.length === 0) {
    console.warn('No chunks with embeddings found, falling back to keyword search');
    return keywordSearch(allChunks, query, topK);
  }

  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(query, apiKey);

  // Calculate similarity scores
  const scores = chunksWithEmbeddings.map(chunk => {
    try {
      const embedding = JSON.parse(chunk.embedding || '[]');
      return {
        id: chunk.id,
        documentId: chunk.documentId,
        content: chunk.content,
        score: cosineSimilarity(queryEmbedding, embedding),
      };
    } catch {
      return {
        id: chunk.id,
        documentId: chunk.documentId,
        content: chunk.content,
        score: 0,
      };
    }
  });

  // Sort by score and return top K
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Simple keyword-based search fallback
 */
function keywordSearch(
  chunks: any[],
  query: string,
  topK: number
): ChunkWithScore[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const scores = chunks.map(chunk => {
    const contentLower = chunk.content.toLowerCase();
    let matchCount = 0;

    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        matchCount++;
      }
    }

    return {
      id: chunk.id,
      documentId: chunk.documentId,
      content: chunk.content,
      score: matchCount,
    };
  });

  return scores
    .sort((a, b) => b.score - a.score)
    .filter(s => s.score > 0)
    .slice(0, topK);
}
