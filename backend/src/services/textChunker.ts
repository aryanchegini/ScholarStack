/**
 * Chunk text into segments of approximately 500 tokens
 * Tries to break at sentence boundaries for better context
 */

export function chunkText(
  text: string,
  maxChunkSize: number = 1000,
  overlap: number = 100
): string[] {
  // Clean up the text
  const cleanedText = text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/\n+/g, '\n') // Normalize newlines
    .trim();

  if (cleanedText.length <= maxChunkSize) {
    return [cleanedText];
  }

  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < cleanedText.length) {
    // Calculate the end of this chunk
    let endIndex = Math.min(currentIndex + maxChunkSize, cleanedText.length);

    // If we're not at the end, try to find a good breaking point
    if (endIndex < cleanedText.length) {
      // Look for sentence endings (., !, ?) followed by space
      const sentenceEnd = cleanedText.lastIndexOf('.', endIndex);
      const questionEnd = cleanedText.lastIndexOf('?', endIndex);
      const exclamationEnd = cleanedText.lastIndexOf('!', endIndex);

      const bestBreak = Math.max(sentenceEnd, questionEnd, exclamationEnd);

      if (bestBreak > currentIndex + maxChunkSize / 2) {
        // Found a good break point that's not too far back
        endIndex = bestBreak + 1;
      } else {
        // Try paragraph breaks
        const paragraphBreak = cleanedText.lastIndexOf('\n', endIndex);
        if (paragraphBreak > currentIndex + maxChunkSize / 2) {
          endIndex = paragraphBreak + 1;
        }
      }
    }

    const chunk = cleanedText.substring(currentIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move to next chunk with overlap
    currentIndex = endIndex - overlap;
  }

  return chunks;
}
