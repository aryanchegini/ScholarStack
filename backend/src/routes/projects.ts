import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Create a new project
router.post('/', async (req, res, next) => {
  try {
    const { name, userId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // For MVP, create or get a default user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo@scholarstack.local',
        }
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        userId: user.id,
      },
      include: {
        documents: true,
        notes: true,
      }
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

// Get all projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        documents: {
          select: {
            id: true,
            filename: true,
            uploadedAt: true,
          }
        },
        _count: {
          select: {
            notes: true,
            highlights: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json(projects);
  } catch (error) {
    next(error);
  }
});

// Get a single project
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        documents: true,
        notes: {
          orderBy: { updatedAt: 'desc' }
        },
        highlights: true,
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
});

// Update a project
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const project = await prisma.project.update({
      where: { id },
      data: { name },
    });

    res.json(project);
  } catch (error) {
    next(error);
  }
});

// Delete a project
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
