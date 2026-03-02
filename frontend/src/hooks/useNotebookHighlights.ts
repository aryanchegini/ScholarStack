import { useState, useCallback } from 'react';

interface PendingHighlight {
  text: string;
  tag: string;
  timestamp: number;
}

let globalPendingHighlights: PendingHighlight[] = [];
let listeners: Set<(highlights: PendingHighlight[]) => void> = new Set();

export function useNotebookHighlights() {
  const [highlights, setHighlights] = useState<PendingHighlight[]>([]);

  const subscribe = useCallback(() => {
    const listener = (newHighlights: PendingHighlight[]) => {
      setHighlights([...newHighlights]);
    };

    listeners.add(listener);

    // Initialize with current global state
    setHighlights([...globalPendingHighlights]);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addHighlight = useCallback((text: string, tag: string) => {
    const highlight: PendingHighlight = {
      text,
      tag,
      timestamp: Date.now(),
    };

    globalPendingHighlights.push(highlight);

    // Notify all listeners
    listeners.forEach(listener => listener([...globalPendingHighlights]));
  }, []);

  const consumeHighlights = useCallback(() => {
    const consumed = [...globalPendingHighlights];
    globalPendingHighlights = [];
    listeners.forEach(listener => listener([]));
    return consumed;
  }, []);

  return {
    highlights,
    addHighlight,
    consumeHighlights,
    subscribe,
  };
}

// Singleton hook for the notebook to consume highlights
export function useNotebookConsumer() {
  const [highlights, setHighlights] = useState<PendingHighlight[]>([]);

  const subscribe = useCallback(() => {
    const listener = (newHighlights: PendingHighlight[]) => {
      setHighlights([...newHighlights]);
    };

    listeners.add(listener);
    setHighlights([...globalPendingHighlights]);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const consume = useCallback(() => {
    const consumed = [...globalPendingHighlights];
    globalPendingHighlights = [];
    listeners.forEach(listener => listener([]));
    return consumed;
  }, []);

  return {
    highlights,
    consume,
    subscribe,
  };
}
