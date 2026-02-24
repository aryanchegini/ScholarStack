import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import projectsRouter from '../src/routes/projects';
import documentsRouter from '../src/routes/documents';
import notesRouter from '../src/routes/notes';
import chatRouter from '../src/routes/chat';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/projects', projectsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/chat', chatRouter);

// Add health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

describe('ScholarStack API Tests', () => {
  let testProjectId: string;
  let testDocumentId: string;
  let testNoteId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.highlight.deleteMany({});
    await prisma.documentChunk.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.highlight.deleteMany({});
    await prisma.documentChunk.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.project.deleteMany({});

    // Create a test user for each test
    const user = await prisma.user.create({
      data: { email: `test-${Date.now()}@example.com` }
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Projects API', () => {
    it('should create a new project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Test Project');
      expect(response.body).toHaveProperty('createdAt');
      testProjectId = response.body.id;
    });

    it('should get all projects', async () => {
      // Create a project first
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'List Test Project' });
      expect(createResponse.status).toBe(201);

      const response = await request(app).get('/api/projects');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should get a specific project', async () => {
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Specific Project' });
      const projectId = createResponse.body.id;

      const response = await request(app).get(`/api/projects/${projectId}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', projectId);
      expect(response.body).toHaveProperty('name', 'Specific Project');
    });

    it('should delete a project', async () => {
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Delete Me Project' });
      const projectId = createResponse.body.id;

      const deleteResponse = await request(app).delete(`/api/projects/${projectId}`);
      expect(deleteResponse.status).toBe(204);

      // Verify it's deleted
      const getResponse = await request(app).get(`/api/projects/${projectId}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Notes API', () => {
    beforeEach(async () => {
      // Create a test project for notes
      const project = await prisma.project.create({
        data: {
          name: 'Notes Test Project',
          userId: testUserId
        }
      });
      testProjectId = project.id;
    });

    it('should create a new note with TipTap JSON content', async () => {
      const tipTapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is a test note' }
            ]
          }
        ]
      };

      const response = await request(app)
        .post('/api/notes')
        .send({
          projectId: testProjectId,
          content: tipTapContent
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('projectId', testProjectId);
      expect(response.body).toHaveProperty('content');
      expect(typeof response.body.content).toBe('string');

      // Verify content is valid JSON string
      const parsedContent = JSON.parse(response.body.content);
      expect(parsedContent).toEqual(tipTapContent);
      testNoteId = response.body.id;
    });

    it('should handle string content (plain text)', async () => {
      const response = await request(app)
        .post('/api/notes')
        .send({
          projectId: testProjectId,
          content: 'Plain text note content'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('content');
    });

    it('should update an existing note', async () => {
      // Create a note first
      const createResponse = await request(app)
        .post('/api/notes')
        .send({
          projectId: testProjectId,
          content: 'Initial content'
        });

      const noteId = createResponse.body.id;

      // Update the note
      const updatedContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Updated content' }
            ]
          }
        ]
      };

      const updateResponse = await request(app)
        .post('/api/notes')
        .send({
          projectId: testProjectId,
          content: updatedContent
        });

      expect(updateResponse.status).toBe(200);
    });

    it('should get notes by project', async () => {
      // Create a note
      await request(app)
        .post('/api/notes')
        .send({
          projectId: testProjectId,
          content: { type: 'doc', content: [] }
        });

      const response = await request(app)
        .get(`/api/notes/project/${testProjectId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get a single note', async () => {
      const createResponse = await request(app)
        .post('/api/notes')
        .send({
          projectId: testProjectId,
          content: 'Single note test'
        });

      const noteId = createResponse.body.id;

      const response = await request(app).get(`/api/notes/${noteId}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', noteId);
    });

    it('should delete a note', async () => {
      const createResponse = await request(app)
        .post('/api/notes')
        .send({
          projectId: testProjectId,
          content: 'Note to delete'
        });

      const noteId = createResponse.body.id;

      const deleteResponse = await request(app).delete(`/api/notes/${noteId}`);
      expect(deleteResponse.status).toBe(204);

      const getResponse = await request(app).get(`/api/notes/${noteId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 400 when projectId is missing', async () => {
      const response = await request(app)
        .post('/api/notes')
        .send({
          content: 'Note without project'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Documents API - Basic Operations', () => {
    beforeEach(async () => {
      // Create a test project for documents
      const project = await prisma.project.create({
        data: {
          name: 'Documents Test Project',
          userId: testUserId
        }
      });
      testProjectId = project.id;
    });

    it('should get documents by project', async () => {
      const response = await request(app)
        .get(`/api/documents/project/${testProjectId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get a specific document', async () => {
      // Create a document entry directly
      const document = await prisma.document.create({
        data: {
          projectId: testProjectId,
          filename: 'test.pdf',
          filePath: '/fake/path/test.pdf',
          pageCount: 10
        }
      });

      const response = await request(app).get(`/api/documents/${document.id}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', document.id);
      expect(response.body).toHaveProperty('filename', 'test.pdf');
    });

    it('should delete a document', async () => {
      const document = await prisma.document.create({
        data: {
          projectId: testProjectId,
          filename: 'delete-test.pdf',
          filePath: '/fake/path/delete-test.pdf',
          pageCount: 5
        }
      });

      const deleteResponse = await request(app).delete(`/api/documents/${document.id}`);
      expect(deleteResponse.status).toBe(204);

      const getResponse = await request(app).get(`/api/documents/${document.id}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('PDF Upload Integration Test', () => {
    beforeEach(async () => {
      // Create a test project
      const project = await prisma.project.create({
        data: {
          name: 'PDF Upload Test Project',
          userId: testUserId
        }
      });
      testProjectId = project.id;
    });

    it('should verify uploads directory exists', () => {
      // The uploads directory is in the backend folder
      const uploadsDir = path.join(__dirname, '..', 'app_data', 'uploads');
      expect(fs.existsSync(uploadsDir)).toBe(true);
    });

    it('should list existing PDF files in uploads directory', () => {
      // The uploads directory is in the backend folder
      const uploadsDir = path.join(__dirname, '..', 'app_data', 'uploads');
      const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));
      expect(Array.isArray(files)).toBe(true);
      console.log(`Found ${files.length} PDF files in uploads:`, files);
    });
  });

  describe('Database Schema Verification', () => {
    it('should have project with documents relation', async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Relation Test Project',
          userId: testUserId,
          documents: {
            create: {
              filename: 'relation-test.pdf',
              filePath: '/fake/path.pdf',
              pageCount: 1
            }
          }
        },
        include: { documents: true }
      });

      expect(project.documents).toHaveLength(1);
      expect(project.documents[0]).toHaveProperty('filename', 'relation-test.pdf');
    });

    it('should have project with notes relation', async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Notes Relation Project',
          userId: testUserId,
          notes: {
            create: {
              content: JSON.stringify({ type: 'doc', content: [] })
            }
          }
        },
        include: { notes: true }
      });

      expect(project.notes).toHaveLength(1);
      expect(project.notes[0]).toHaveProperty('content');
    });

    it('should have document with chunks relation', async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Chunks Test Project',
          userId: testUserId
        }
      });

      const document = await prisma.document.create({
        data: {
          projectId: project.id,
          filename: 'chunks-test.pdf',
          filePath: '/fake/path.pdf',
          pageCount: 1,
          chunks: {
            create: {
              chunkIndex: 0,
              content: 'Test chunk content',
              embedding: null
            }
          }
        },
        include: { chunks: true }
      });

      expect(document.chunks).toHaveLength(1);
      expect(document.chunks[0]).toHaveProperty('content', 'Test chunk content');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent project', async () => {
      const fakeId = 'non-existent-id-12345';
      const response = await request(app).get(`/api/projects/${fakeId}`);
      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent note', async () => {
      const fakeId = 'non-existent-note-12345';
      const response = await request(app).get(`/api/notes/${fakeId}`);
      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = 'non-existent-doc-12345';
      const response = await request(app).get(`/api/documents/${fakeId}`);
      expect(response.status).toBe(404);
    });
  });
});
