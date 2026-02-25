import OpenAI from 'openai';

/**
 * Generate embeddings for an array of text chunks
 * For MVP, uses OpenAI's embedding API
 */

export async function generateEmbeddings(
  chunks: string[],
  apiKey?: string
): Promise<number[][]> {
  if (!apiKey) {
    // Return empty embeddings if no API key
    return chunks.map(() => []);
  }

  try {
    const openai = new OpenAI({ apiKey });

    const embeddings: number[][] = [];

    // Process chunks one at a time to minimize memory usage
    for (let i = 0; i < chunks.length; i++) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: [chunks[i]],
        encoding_format: 'float',
      });

      embeddings.push(response.data[0].embedding);
    }

    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Generate a single embedding for a query text
 */
export async function generateQueryEmbedding(
  query: string,
  apiKey: string
): Promise<number[]> {
  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
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
