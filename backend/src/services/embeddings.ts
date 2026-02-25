import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generate embeddings for an array of text chunks
 * Supports both OpenAI and Google Gemini API keys
 */

export async function generateEmbeddings(
  chunks: string[],
  apiKey?: string
): Promise<number[][]> {
  if (!apiKey) {
    // Return empty embeddings if no API key
    return chunks.map(() => []);
  }

  const isOpenAI = apiKey.startsWith('sk-');

  try {
    const embeddings: number[][] = [];

    if (isOpenAI) {
      const openai = new OpenAI({ apiKey });
      // Process chunks one at a time to minimize memory usage
      for (let i = 0; i < chunks.length; i++) {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: [chunks[i]],
          encoding_format: 'float',
        });
        embeddings.push(response.data[0].embedding);
      }
    } else {
      // Use Google Gemini API
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

      for (let i = 0; i < chunks.length; i++) {
        const result = await model.embedContent(chunks[i]);
        embeddings.push(result.embedding.values);
      }
    }

    return embeddings;
  } catch (error: any) {
    if (error.response) {
      console.error('API Error response data:', error.response.data);
      console.error('API Error response status:', error.response.status);
    } else {
      console.error('Error generating embeddings:', error.message || error);
    }
    throw new Error(`Failed to generate embeddings: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Generate a single embedding for a query text
 */
export async function generateQueryEmbedding(
  query: string,
  apiKey: string
): Promise<number[]> {
  const isOpenAI = apiKey.startsWith('sk-');

  try {
    if (isOpenAI) {
      const openai = new OpenAI({ apiKey });
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      });
      return response.data[0].embedding;
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const result = await model.embedContent(query);
      return result.embedding.values;
    }
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw new Error('Failed to generate query embedding');
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
