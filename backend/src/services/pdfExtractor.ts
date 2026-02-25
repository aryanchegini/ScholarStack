import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';

export interface ExtractedPDF {
  text: string;
  pageCount: number;
}

export default async function extractPDF(filePath: string): Promise<ExtractedPDF> {
  try {
    const dataBuffer = await readFile(filePath);
    const data = await pdfParse(dataBuffer);

    return {
      text: data.text,
      pageCount: data.numpages,
    };
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
