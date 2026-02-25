import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, Clock, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { chatApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import type { ChatMessage, ChatResponse, Citation, ChatSession } from '@/lib/api';

interface AIChatProps {
  projectId: string;
}

export default function AIChat({ projectId }: AIChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch chat sessions
  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['chatSessions', projectId],
    queryFn: () => chatApi.getSessions(projectId),
  });

  // Fetch messages for active session
  const { data: sessionMessages } = useQuery({
    queryKey: ['chatMessages', activeSessionId],
    queryFn: () => activeSessionId ? chatApi.getSessionMessages(activeSessionId) : null,
    enabled: !!activeSessionId,
  });

  // Sync session messages to local state
  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages);
      // Reset citations since they are currently only shown for the active query
      setCitations([]);
    } else if (!activeSessionId) {
      setMessages([]);
      setCitations([]);
    }
  }, [sessionMessages, activeSessionId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, citations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setCitations([]);

    try {
      const response = await chatApi.send(projectId, input, messages, activeSessionId || undefined);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
      };
      setMessages([...newMessages, assistantMessage]);
      setCitations(response.citations);

      // If this was a new session, update the active session ID and refetch the session list
      if (!activeSessionId && (response as any).sessionId) {
        setActiveSessionId((response as any).sessionId);
        refetchSessions();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to get response from AI',
        variant: 'destructive',
      });
      // Remove the user message if the request failed
      setMessages(messages);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const suggestedQuestions = [
    'What are the main findings?',
    'Summarize the methodology',
    'What are the limitations?',
  ];

  if (showHistory) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Chat History
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
            Close
          </Button>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start mb-4"
              onClick={() => {
                setActiveSessionId(null);
                setShowHistory(false);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>

            {sessions?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No previous chats found.</p>
            ) : (
              sessions?.map((session) => (
                <Button
                  key={session.id}
                  variant={activeSessionId === session.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left font-normal"
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setShowHistory(false);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                  <div className="truncate flex-1">
                    {session.title}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Header Controls */}
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur shadow-sm h-8"
          onClick={() => setShowHistory(true)}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          History
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 pt-12">
        <div ref={scrollRef} className="space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Ask your documents</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Get insights from your uploaded PDFs using AI
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedQuestions.map((question) => (
                  <Button
                    key={question}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                    }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}

          {/* Citations */}
          {citations.length > 0 && !isLoading && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Sources:</p>
              <div className="space-y-2">
                {citations.map((citation, index) => (
                  <div
                    key={index}
                    className="bg-muted/50 rounded-md p-3 text-xs"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <FileText className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{citation.documentName}</span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{citation.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          AI responses are based only on your uploaded documents.
        </p>
      </div>
    </div>
  );
}
