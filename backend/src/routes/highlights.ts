import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// List highlights for a document
router.get('/document/:documentId', async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const highlights = await prisma.highlight.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(highlights);
  } catch (error) {
    next(error);
  }
});

// Create a highlight
router.post('/', async (req, res, next) => {
  try {
    const { projectId, documentId, pageNumber, text, color, coordinates } = req.body;

    if (!projectId || !documentId || !pageNumber || !coordinates) {
      return res.status(400).json({ error: 'projectId, documentId, pageNumber and coordinates are required' });
    }

    const highlight = await prisma.highlight.create({
      data: {
        projectId,
        documentId,
        pageNumber: Number(pageNumber),
        text: text || '',
        color: color || '#fef08a',
        coordinates,
      },
    });

    res.status(201).json(highlight);
  } catch (error) {
    next(error);
  }
});

// Update a highlight (colour or annotation)
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { color, text, annotation } = req.body;

    const data: Record<string, unknown> = {};
    if (color !== undefined) data.color = color;
    if (text !== undefined) data.text = text;
    if (annotation !== undefined) data.annotation = annotation;

    const highlight = await prisma.highlight.update({
      where: { id },
      data,
    });

    res.json(highlight);
  } catch (error) {
    next(error);
  }
});

// Delete a highlight
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.highlight.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
