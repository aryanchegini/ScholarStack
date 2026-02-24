const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Helper function for API calls
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  // For 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Projects API
export const projectsApi = {
  list: () => fetchApi<Project[]>('/projects'),
  get: (id: string) => fetchApi<Project>(`/projects/${id}`),
  create: (data: { name: string }) =>
    fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name: string }) =>
    fetchApi<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/projects/${id}`, { method: 'DELETE' }),
};

// Documents API
export const documentsApi = {
  upload: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('projectId', projectId);

    return fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Upload failed');
      }
      return res.json();
    });
  },
  get: (id: string) => fetchApi<Document>(`/documents/${id}`),
  listByProject: (projectId: string) =>
    fetchApi<Document[]>(`/documents/project/${projectId}`),
  delete: (id: string) =>
    fetchApi<void>(`/documents/${id}`, { method: 'DELETE' }),
};

// Notes API
export const notesApi = {
  save: (projectId: string, content: string) =>
    fetchApi<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({ projectId, content }),
    }),
  getByProject: (projectId: string) =>
    fetchApi<Note[]>(`/notes/project/${projectId}`),
  get: (id: string) => fetchApi<Note>(`/notes/${id}`),
  delete: (id: string) => fetchApi<void>(`/notes/${id}`, { method: 'DELETE' }),
};

// Chat API
export const chatApi = {
  send: (projectId: string, query: string, conversationHistory: ChatMessage[] = []) =>
    fetchApi<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ projectId, query, conversationHistory }),
    }),
};

// User API
export const userApi = {
  setApiKey: (email: string, apiKey: string) =>
    fetchApi<{ id: string; email: string; hasApiKey: boolean }>('/user/api-key', {
      method: 'POST',
      body: JSON.stringify({ email, apiKey }),
    }),
  getApiKeyStatus: (email?: string) =>
    fetchApi<{ hasApiKey: boolean; email: string }>(
      `/user/api-key/status?email=${email || 'demo@scholarstack.local'}`
    ),
  deleteApiKey: (email: string) =>
    fetchApi<{ id: string; email: string; hasApiKey: boolean }>('/user/api-key', {
      method: 'DELETE',
      body: JSON.stringify({ email }),
    }),
};

// Types
export interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
  notes?: Note[];
  highlights?: Highlight[];
  _count?: {
    notes: number;
    highlights: number;
  };
}

export interface Document {
  id: string;
  projectId: string;
  filename: string;
  filePath: string;
  pageCount?: number;
  uploadedAt: string;
  chunks?: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
}

export interface Note {
  id: string;
  projectId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Highlight {
  id: string;
  projectId: string;
  documentId: string;
  pageNumber: number;
  text: string;
  color: string;
  coordinates: string;
  noteId?: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  citations: Citation[];
  sources: Source[];
}

export interface Citation {
  chunkId: string;
  documentId: string;
  documentName: string;
  text: string;
}

export interface Source {
  chunkId: string;
  documentId: string;
  content: string;
}
