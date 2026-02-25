# ScholarStack MVP

ScholarStack is a unified research environment featuring a split-pane PDF reader and interactive notebook.

This repository contains two main applications:
1. `frontend`: A React application built with Vite and Tailwind CSS.
2. `backend`: A Node.js API built with Express, using Prisma and SQLite for the database, and local file storage for PDFs.

## Prerequisites

- **Node.js**: Ensure you have Node.js installed on your system (v18+ recommended). You can check by running `node -v` in your terminal.

## How to Run the Application Locally

You will need to run the **backend** and the **frontend** simultaneously in two separate terminal windows.

### 1. Start the Backend Server

The backend manages the SQLite database and handles PDF uploads.

1. Open a new terminal window.
2. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
3. Install the dependencies (if you haven't already):
   ```bash
   npm install
   ```
4. Initialize the Prisma SQLite database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
The backend server will start running on `http://localhost:3001`. You should see a message saying "Backend server running...". Keep this terminal window open.

### 2. Start the Frontend Application

The frontend is the React user interface.

1. Open a **second, separate terminal window** (leave the backend running).
2. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
3. Install the dependencies (if you haven't already):
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Once the server starts, open your web browser and navigate to the URL provided in the terminal (usually `http://localhost:5173`).

---

### Project Structure Overview

- `backend/app_data/`: Contains the local SQLite database (`dev.db`) and the `uploads/` folder where PDFs are stored.
- `backend/prisma/schema.prisma`: Defines the database schema (Projects, Documents, Notes).
- `backend/src/index.ts`: The main Express server entry point.
- `frontend/src/App.tsx`: The primary React component containing the split-pane layout.
- `frontend/src/index.css`: The Tailwind CSS styling configuration.
