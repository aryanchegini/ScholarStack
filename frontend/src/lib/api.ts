const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';



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

// Notebook API
export const notebookApi = {
  saveProjectNotebook: (projectId: string, content: string) =>
    fetchApi<Notebook>('/notes', {
      method: 'POST',
      body: JSON.stringify({ projectId, content }),
    }),
  saveDocumentNotebook: (documentId: string, content: string) =>
    fetchApi<Notebook>('/notes', {
      method: 'POST',
      body: JSON.stringify({ documentId, content }),
    }),
  getByProject: (projectId: string) =>
    fetchApi<Notebook>(`/notes/project/${projectId}`),
  getByDocument: (documentId: string) =>
    fetchApi<Notebook>(`/notes/document/${documentId}`),
  get: (id: string) => fetchApi<Notebook>(`/notes/${id}`),
  delete: (id: string) => fetchApi<void>(`/notes/${id}`, { method: 'DELETE' }),
};

// Notebook Pages API
export const notebookPageApi = {
  listByProject: (projectId: string) =>
    fetchApi<NotebookPage[]>(`/notes/project/${projectId}/pages`),
  create: (projectId: string, title?: string) =>
    fetchApi<NotebookPage>(`/notes/project/${projectId}/pages`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  getPage: (pageId: string) =>
    fetchApi<NotebookPage>(`/notes/pages/${pageId}`),
  update: (pageId: string, data: { title?: string; content?: string }) =>
    fetchApi<NotebookPage>(`/notes/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (pageId: string) =>
    fetchApi<void>(`/notes/pages/${pageId}`, { method: 'DELETE' }),
};

// Chat API
export const chatApi = {
  send: (projectId: string, query: string, conversationHistory: ChatMessage[] = []) =>
    fetchApi<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ projectId, query, conversationHistory }),
    }),
};

// Highlights API
export const highlightsApi = {
  listByDocument: (documentId: string) =>
    fetchApi<Highlight[]>(`/highlights/document/${documentId}`),
  create: (data: {
    projectId: string;
    documentId: string;
    pageNumber: number;
    text: string;
    color: string;
    coordinates: string;
  }) =>
    fetchApi<Highlight>('/highlights', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { color?: string; text?: string; annotation?: string }) =>
    fetchApi<Highlight>(`/highlights/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/highlights/${id}`, { method: 'DELETE' }),
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
  notebook?: Notebook;
  highlights?: Highlight[];
  _count?: {
    highlights: number;
  };
}

export interface Document {
  id: string;
  projectId: string;
  filename: string;
  filePath: string;
  fileUrl?: string;
  pageCount?: number;
  uploadedAt: string;
  chunks?: DocumentChunk[];
  notebook?: Notebook;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
}

export interface Notebook {
  id: string;
  projectId?: string;
  documentId?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookPage {
  id: string;
  projectId: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Highlight {
  id: string;
  projectId: string;
  documentId: string;
  pageNumber: number;
  text: string;
  annotation: string;
  color: string;
  coordinates: string;
  notebookId?: string;
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
