import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import extractPDF from '../services/pdfExtractor.js';
import { chunkText } from '../services/textChunker.js';
import { generateEmbeddings } from '../services/embeddings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// Ensure upload directory exists
const uploadDir = join(__dirname, '../../app_data/uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Upload a document
router.post('/upload', upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    console.log('PDF Upload Request:', {
      projectId,
      filename: req.file.originalname,
      size: req.file.size
    });

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      console.error('Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('Extracting text from PDF...');
    // Extract text from PDF
    const { text, pageCount } = await extractPDF(req.file.path);
    console.log('Text extracted:', { textLength: text.length, pageCount });

    // Create document record
    console.log('Creating document record...');
    const document = await prisma.document.create({
      data: {
        projectId,
        filename: req.file.originalname,
        filePath: req.file.path,
        pageCount,
      }
    });
    console.log('Document created:', document.id);

    // Chunk the text and generate embeddings
    console.log('Chunking text...');
    const chunks = chunkText(text, 1500, 150); // Larger chunks, less overlap to reduce memory
    console.log('Text chunked into', chunks.length, 'chunks');

    // Get user's API key for embeddings
    const user = await prisma.user.findUnique({
      where: { id: project.userId }
    });
    const apiKey = user?.apiKey;
    console.log('User API key available:', !!apiKey);

    // Save chunks in batches to avoid memory issues
    console.log('Saving chunks to database in batches...');
    const BATCH_SIZE = 10; // Smaller batch size to reduce memory spikes

    if (apiKey) {
      // Process with embeddings in batches
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));
        const batchStartIndex = i;

        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}...`);

        // Generate embeddings for this batch
        const batchEmbeddings = await generateEmbeddings(batchChunks, apiKey);

        // Save this batch
        await prisma.documentChunk.createMany({
          data: batchChunks.map((chunk, index) => ({
            documentId: document.id,
            chunkIndex: batchStartIndex + index,
            content: chunk,
            embedding: batchEmbeddings[index]?.length ? JSON.stringify(batchEmbeddings[index]) : null,
          }))
        });

        // Clear references to help GC
        batchChunks.length = 0;
        batchEmbeddings.length = 0;
      }
    } else {
      // Save without embeddings in batches
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));
        const batchStartIndex = i;

        await prisma.documentChunk.createMany({
          data: batchChunks.map((chunk, index) => ({
            documentId: document.id,
            chunkIndex: batchStartIndex + index,
            content: chunk,
            embedding: null,
          }))
        });
      }
    }

    console.log('All chunks saved successfully');

    res.status(201).json({
      document,
      chunksProcessed: chunks.length,
    });
  } catch (error) {
    console.error('Error processing PDF upload:', error);
    next(error);
  }
});

// Get a document
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
});

// Get documents for a project
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const documents = await prisma.document.findMany({
      where: { projectId },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json(documents);
  } catch (error) {
    next(error);
  }
});

// Delete a document
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.document.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
