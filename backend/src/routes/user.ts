import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Store or update user's API key
router.post('/api-key', async (req, res, next) => {
  try {
    const { email, apiKey, aiModel } = req.body;

    if (!apiKey && aiModel === undefined) {
      return res.status(400).json({ error: 'API key or AI Model preference is required' });
    }

    // For MVP, use the provided email or default
    const userEmail = email || 'demo@scholarstack.local';

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (user) {
      // Update existing user's API key and/or model preference
      const dataToUpdate: any = {};
      if (apiKey) dataToUpdate.apiKey = apiKey;
      if (aiModel !== undefined) dataToUpdate.aiModel = aiModel || null;

      user = await prisma.user.update({
        where: { email: userEmail },
        data: dataToUpdate
      });
    } else {
      // Create new user with API key and model preference
      user = await prisma.user.create({
        data: {
          email: userEmail,
          apiKey,
          aiModel: aiModel || null
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
    const userEmail = (email as string) || 'demo@scholarstack.local';

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    res.json({
      hasApiKey: !!user?.apiKey,
      aiModel: user?.aiModel,
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
