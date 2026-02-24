import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { chatApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import type { ChatMessage, ChatResponse, Citation } from '@/lib/api';

interface AIChatProps {
  projectId: string;
}

export default function AIChat({ projectId }: AIChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const response = await chatApi.send(projectId, input, messages);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
      };
      setMessages([...newMessages, assistantMessage]);
      setCitations(response.citations);
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

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
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
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
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
