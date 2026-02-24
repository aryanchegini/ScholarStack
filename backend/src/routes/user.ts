import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Store or update user's API key
router.post('/api-key', async (req, res, next) => {
  try {
    const { email, apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // For MVP, use the provided email or default
    const userEmail = email || 'demo@scholarstack.local';

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (user) {
      // Update existing user's API key
      user = await prisma.user.update({
        where: { email: userEmail },
        data: { apiKey }
      });
    } else {
      // Create new user with API key
      user = await prisma.user.create({
        data: {
          email: userEmail,
          apiKey
        }
      });
    }

    // Return user without API key for security
    res.json({
      id: user.id,
      email: user.email,
      hasApiKey: !!user.apiKey
    });
  } catch (error) {
    next(error);
  }
});

// Check if user has API key (without revealing it)
router.get('/api-key/status', async (req, res, next) => {
  try {
    const { email } = req.query;
    const userEmail = email || 'demo@scholarstack.local';

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    res.json({
      hasApiKey: !!user?.apiKey,
      email: userEmail
    });
  } catch (error) {
    next(error);
  }
});

// Delete API key
router.delete('/api-key', async (req, res, next) => {
  try {
    const { email } = req.body;
    const userEmail = email || 'demo@scholarstack.local';

    const user = await prisma.user.update({
      where: { email: userEmail },
      data: { apiKey: null }
    });

    res.json({
      id: user.id,
      email: user.email,
      hasApiKey: false
    });
  } catch (error) {
    next(error);
  }
});

export default router;
