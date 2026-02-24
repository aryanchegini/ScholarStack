import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Create or update a note
router.post('/', async (req, res, next) => {
  try {
    const { projectId, content } = req.body;

    console.log('POST /api/notes - Request:', {
      projectId,
      contentType: typeof content,
      hasContent: content !== undefined && content !== null,
    });

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Process content - handle various formats
    let contentString: string;

    if (content === null || content === undefined) {
      // Empty note
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

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      console.error('Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if a note already exists for this project
    const existingNote = await prisma.note.findFirst({
      where: { projectId }
    });

    let note;
    if (existingNote) {
      // Update existing note
      console.log('Updating existing note:', existingNote.id);
      note = await prisma.note.update({
        where: { id: existingNote.id },
        data: { content: contentString }
      });
    } else {
      // Create new note
      console.log('Creating new note for project:', projectId);
      note = await prisma.note.create({
        data: {
          projectId,
          content: contentString,
        }
      });
    }

    console.log('Note saved successfully:', note.id);
    res.json(note);
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save note',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// Get notes for a project
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const notes = await prisma.note.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(notes);
  } catch (error) {
    console.error('Error getting notes:', error);
    next(error);
  }
});

// Get a single note
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await prisma.note.findUnique({
      where: { id }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Error getting note:', error);
    next(error);
  }
});

// Delete a note
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.note.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    next(error);
  }
});

export default router;
