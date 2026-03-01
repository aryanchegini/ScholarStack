import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Create or update a notebook
router.post('/', async (req, res, next) => {
  try {
    const { projectId, documentId, content } = req.body;

    console.log('POST /api/notes - Request:', {
      projectId,
      documentId,
      contentType: typeof content,
      hasContent: content !== undefined && content !== null,
    });

    if (!projectId && !documentId) {
      return res.status(400).json({ error: 'Either projectId or documentId is required' });
    }

    // Process content - handle various formats
    let contentString: string;

    if (content === null || content === undefined) {
      // Empty notebook
      contentString = JSON.stringify({ type: 'doc', content: [] });
    } else if (typeof content === 'string') {
      // Check if it's already stringified JSON (has { at start)
      const trimmed = content.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          // Try to parse it to validate it's JSON
          const parsed = JSON.parse(trimmed);
          // Stringify it back to ensure consistent format
          contentString = JSON.stringify(parsed);
        } catch {
          // Not valid JSON, store as-is
          contentString = trimmed;
        }
      } else {
        // Plain text content
        contentString = JSON.stringify({
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: trimmed }]
          }]
        });
      }
    } else {
      // It's an object (TipTap JSON), stringify it
      contentString = JSON.stringify(content);
    }

    console.log('Processed content length:', contentString.length);

    let notebook;

    if (projectId) {
      // Check if project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      if (!project) return res.status(404).json({ error: 'Project not found' });

      notebook = await prisma.notebook.findUnique({ where: { projectId } });

      if (notebook) {
        notebook = await prisma.notebook.update({
          where: { id: notebook.id },
          data: { content: contentString }
        });
      } else {
        notebook = await prisma.notebook.create({
          data: { projectId, content: contentString }
        });
      }
    } else if (documentId) {
      // Check if document exists
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });
      if (!document) return res.status(404).json({ error: 'Document not found' });

      notebook = await prisma.notebook.findUnique({ where: { documentId } });

      if (notebook) {
        notebook = await prisma.notebook.update({
          where: { id: notebook.id },
          data: { content: contentString }
        });
      } else {
        notebook = await prisma.notebook.create({
          data: { documentId, content: contentString }
        });
      }
    }

    console.log('Notebook saved successfully');
    res.json(notebook);
  } catch (error) {
    console.error('Error saving notebook:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save notebook',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// Get notebook for a project
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    let notebook = await prisma.notebook.findUnique({
      where: { projectId }
    });

    if (!notebook) {
      notebook = await prisma.notebook.create({
        data: {
          projectId,
          content: JSON.stringify({ type: 'doc', content: [] })
        }
      });
    }

    // Optional: Return an array to be compatible with frontend logic if it expects findMany,
    // but the frontend should be updated to expect a single object. We will send the object directly.
    res.json(notebook);
  } catch (error) {
    console.error('Error getting project notebook:', error);
    next(error);
  }
});

// Get notebook for a document
router.get('/document/:documentId', async (req, res, next) => {
  try {
    const { documentId } = req.params;

    let notebook = await prisma.notebook.findUnique({
      where: { documentId }
    });

    if (!notebook) {
      notebook = await prisma.notebook.create({
        data: {
          documentId,
          content: JSON.stringify({ type: 'doc', content: [] })
        }
      });
    }

    res.json(notebook);
  } catch (error) {
    console.error('Error getting document notebook:', error);
    next(error);
  }
});

// Get a single notebook
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const notebook = await prisma.notebook.findUnique({
      where: { id }
    });

    if (!notebook) {
      return res.status(404).json({ error: 'Notebook not found' });
    }

    res.json(notebook);
  } catch (error) {
    console.error('Error getting notebook:', error);
    next(error);
  }
});

// Delete a notebook
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.notebook.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting notebook:', error);
    next(error);
  }
});

// ─── Notebook Pages (Project-wide multi-page notebook) ───────────────────────

// List all pages for a project (creates a default one if none exist)
router.get('/project/:projectId/pages', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    let pages = await prisma.notebookPage.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    if (pages.length === 0) {
      // Auto-create the first page
      const first = await prisma.notebookPage.create({
        data: {
          projectId,
          title: 'Page 1',
          content: JSON.stringify({ type: 'doc', content: [] }),
          order: 0,
        },
      });
      pages = [first];
    }

    res.json(pages);
  } catch (error) {
    next(error);
  }
});

// Create a new page
router.post('/project/:projectId/pages', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title } = req.body;

    const existing = await prisma.notebookPage.findMany({
      where: { projectId },
      select: { order: true },
    });

    const nextOrder = existing.length > 0
      ? Math.max(...existing.map(p => p.order)) + 1
      : 0;

    const page = await prisma.notebookPage.create({
      data: {
        projectId,
        title: title || `Page ${nextOrder + 1}`,
        content: JSON.stringify({ type: 'doc', content: [] }),
        order: nextOrder,
      },
    });

    res.json(page);
  } catch (error) {
    next(error);
  }
});

// Get a single page
router.get('/pages/:pageId', async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const page = await prisma.notebookPage.findUnique({ where: { id: pageId } });
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json(page);
  } catch (error) {
    next(error);
  }
});

// Update a page (title and/or content)
router.patch('/pages/:pageId', async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const { title, content } = req.body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) {
      if (typeof content === 'string') {
        data.content = content;
      } else {
        data.content = JSON.stringify(content);
      }
    }

    const page = await prisma.notebookPage.update({
      where: { id: pageId },
      data,
    });

    res.json(page);
  } catch (error) {
    next(error);
  }
});

// Delete a page
router.delete('/pages/:pageId', async (req, res, next) => {
  try {
    const { pageId } = req.params;
    await prisma.notebookPage.delete({ where: { id: pageId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
