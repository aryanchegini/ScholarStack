import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';
import extractPDF from '../services/pdfExtractor.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFileUrl = (filePath: string) => {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  // Use basename() to correctly handle both Windows (\) and Unix (/) paths
  return `/uploads/${basename(filePath)}`;
};

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

// Proxy route for external PDFs to bypass CORS
router.get('/proxy', async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Proxying PDF request: ${url}`);

    // Validate it's an allowed URL pattern (e.g. arXiv)
    if (!url.startsWith('http://arxiv.org/') && !url.startsWith('https://arxiv.org/') && !url.startsWith('http://export.arxiv.org/')) {
      return res.status(403).json({ error: 'URL not allowed for proxying' });
    }

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    res.setHeader('Content-Type', 'application/pdf');
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying PDF:', error);
    res.status(500).json({ error: 'Failed to proxy PDF' });
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

    // Create document record - skip chunking for now to keep it simple
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

    // Return document with a URL that the frontend can use
    const documentWithUrl = {
      ...document,
      fileUrl: `/uploads/${req.file.filename}`,
    };

    res.status(201).json({
      document: documentWithUrl,
    });
  } catch (error) {
    console.error('Error processing PDF upload:', error);
    next(error);
  }
});

// Add an external document (e.g., from arXiv)
router.post('/external', async (req, res, next) => {
  try {
    const { projectId, url, filename } = req.body;

    if (!projectId || !url || !filename) {
      return res.status(400).json({ error: 'Project ID, URL, and filename are required' });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const document = await prisma.document.create({
      data: {
        projectId,
        filename,
        filePath: url, // Store the URL in filePath
      }
    });

    const documentWithUrl = {
      ...document,
      fileUrl: url,
    };

    res.status(201).json({ document: documentWithUrl });
  } catch (error) {
    console.error('Error adding external document:', error);
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

    // Add fileUrl for frontend
    const documentWithUrl = {
      ...document,
      fileUrl: getFileUrl(document.filePath),
    };

    res.json(documentWithUrl);
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

    // Add fileUrl for each document
    const documentsWithUrls = documents.map((doc: any) => {
      return {
        ...doc,
        fileUrl: getFileUrl(doc.filePath),
      };
    });

    res.json(documentsWithUrls);
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
