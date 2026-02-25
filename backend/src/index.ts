import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Setup Multer for PDF uploads to local app_data/uploads directory
const uploadDir = path.join(__dirname, '../app_data/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });


// --- API ROUTES ---

// 1. Projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            include: { documents: true }
        });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const { name } = req.body;
        const project = await prisma.project.create({
            data: { name: name || 'Untitled Project' }
        });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// 2. Document Uploads
app.post('/api/projects/:projectId/upload', upload.single('pdf'), async (req, res) => {
    try {
        const { projectId } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Verify project exists
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            // clean up uploaded file if project is invalid
            fs.unlinkSync(file.path);
            return res.status(404).json({ error: 'Project not found' });
        }

        const document = await prisma.document.create({
            data: {
                title: file.originalname,
                filename: file.filename,
                path: file.path,
                projectId
            }
        });

        res.json(document);
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload document' });
    }
});


app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
