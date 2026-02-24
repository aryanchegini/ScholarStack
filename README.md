# ScholarStack

A research workflow tool designed for academics. ScholarStack unifies PDF reading, note-taking, and AI-powered citation assistance in one seamless interface.

## Features

- **Project Management**: Create and manage research projects
- **PDF Reader**: Built-in PDF viewer with zoom, page navigation, and text selection
- **Smart Notebook**: Rich text editor with semantic tagging (#evidence, #critique, #question)
- **Highlight-to-Notebook**: Select text in PDF and instantly add it to your notebook with tags
- **AI Chat (RAG)**: Ask questions about your documents and get answers with citations
- **Bring Your Own Key**: Use your own OpenAI or Anthropic API key for AI features

## Tech Stack

### Frontend
- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- react-pdf for PDF rendering
- TipTap for rich text editing
- TanStack Query for data fetching

### Backend
- Node.js + Express + TypeScript
- Prisma ORM with SQLite
- OpenAI API for embeddings and chat

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd ScholarStack
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Set up the database
```bash
npx prisma generate
npx prisma db push
```

4. Start the backend server
```bash
npm run dev
```
Backend will run on http://localhost:3001

5. In a new terminal, install and start the frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on http://localhost:5173

### Configuration

Before using AI features, you'll need to add your API key:

1. Go to Settings in the app
2. Enter your OpenAI API key (sk-...)
3. Your key is stored locally and only used for your requests

## Development

### Backend Development
```bash
cd backend
npm run dev     # Start development server with hot reload
npm run build   # Build for production
```

### Frontend Development
```bash
cd frontend
npm run dev     # Start Vite dev server
npm run build   # Build for production
```

### Project Structure
```
ScholarStack/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Express server entry point
│   │   ├── routes/            # API route handlers
│   │   ├── services/          # Business logic (RAG, embeddings)
│   │   └── prisma/            # Database client
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   └── app_data/
│       ├── uploads/           # PDF storage
│       └── scholarstack.db    # SQLite database
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # Layout components
│   │   │   ├── PDFViewer/     # PDF viewing with highlights
│   │   │   ├── Notebook/      # TipTap rich text editor
│   │   │   ├── AIChat/        # RAG-powered chat
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities and API client
│   │   └── pages/             # Page components
```

## Core Workflow

1. **Create a Project** - Organize your research into projects
2. **Upload PDFs** - Add research papers to your project
3. **Read & Highlight** - Select text in PDF and add to notebook with tags
4. **Take Notes** - Use the rich text editor to synthesize your findings
5. **Ask AI** - Chat with your documents using RAG to get cited answers

## License

MIT
