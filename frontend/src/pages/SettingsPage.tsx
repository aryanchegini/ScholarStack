import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Key, Eye, EyeOff, Save, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const { data: keyStatus, isLoading } = useQuery({
    queryKey: ['apiKeyStatus'],
    queryFn: () => userApi.getApiKeyStatus(),
  });

  const setKeyMutation = useMutation({
    mutationFn: (key: string) => userApi.setApiKey('demo@scholarstack.local', key),
    onSuccess: () => {
      setApiKey('');
      toast({
        title: 'API Key Saved',
        description: 'Your API key has been saved securely.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Saving API Key',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: () => userApi.deleteApiKey('demo@scholarstack.local'),
    onSuccess: () => {
      toast({
        title: 'API Key Removed',
        description: 'Your API key has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Removing API Key',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your API key.',
        variant: 'destructive',
      });
      return;
    }
    setKeyMutation.mutate(apiKey);
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Settings Content */}
      <div className="p-8 max-w-3xl">
        {/* API Key Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              AI API Key
            </CardTitle>
            <CardDescription>
              Add your OpenAI or Anthropic API key to enable AI-powered features.
              Your key is stored locally and only used for your requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Checking API key status...</p>
            ) : keyStatus?.hasApiKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
                  <div>
                    <p className="font-medium text-sm text-green-800 dark:text-green-300">
                      API Key Configured
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Your AI features are ready to use.
                    </p>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  onClick={() => deleteKeyMutation.mutate()}
                  disabled={deleteKeyMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove API Key
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                  <div>
                    <p className="font-medium text-sm text-yellow-800 dark:text-yellow-300">
                      No API Key Found
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      Add your API key to enable AI chat and RAG features.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="apiKey"
                        type={showKey ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      onClick={handleSaveKey}
                      disabled={setKeyMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Supported providers:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>OpenAI (GPT-4, GPT-3.5, Embeddings)</li>
                    <li>Anthropic (Claude 3.5 Sonnet, Haiku)</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* About Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>About ScholarStack</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>ScholarStack</strong> is a research workflow tool designed for academics.
              It unifies PDF reading, note-taking, and AI-powered citation assistance in one
              seamless interface.
            </p>
            <p>Version 1.0.0</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
