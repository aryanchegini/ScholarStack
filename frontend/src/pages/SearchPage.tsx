import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, ExternalLink, Calendar, Users, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { searchApi, projectsApi, documentsApi } from '@/lib/api';
import { format } from 'date-fns';


export default function SearchPage() {
    const [searchInput, setSearchInput] = useState('');
    const [queryToRun, setQueryToRun] = useState('');

    const { data: results, isLoading, isError, error } = useQuery({
        queryKey: ['search', queryToRun],
        queryFn: () => searchApi.searchPapers(queryToRun),
        enabled: !!queryToRun,
    });

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: projectsApi.list,
    });

    const { toast } = useToast();

    // Make the addExternal request
    const handleAddToProject = async (projectId: string, paper: any) => {
        try {
            if (!paper.pdfUrl) {
                toast({
                    title: 'No PDF available',
                    description: 'This paper does not have a direct PDF link.',
                    variant: 'destructive',
                });
                return;
            }

            await documentsApi.addExternal(projectId, paper.pdfUrl, `${paper.title}.pdf`);

            toast({
                title: 'Added to Project',
                description: `Successfully added "${paper.title}" to project.`,
            });
        } catch (err: any) {
            toast({
                title: 'Failed to add',
                description: err.message || 'An error occurred',
                variant: 'destructive',
            });
        }
    };

    const handleSearch = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        if (searchInput.trim()) {
            setQueryToRun(searchInput.trim());
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="border-b border-border bg-card px-8 py-6">
                <h1 className="text-2xl font-bold mb-2">Search Academic Papers</h1>
                <p className="text-sm text-muted-foreground mb-6">
                    Find papers across arXiv to add to your projects.
                </p>

                <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
                    <Input
                        placeholder="Search by title, author, or keyword (e.g., 'machine learning')..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4 mr-2" />
                        )}
                        Search
                    </Button>
                </form>
            </div>

            <div className="flex-1 overflow-auto p-8">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mb-4" />
                        <p>Searching arXiv...</p>
                    </div>
                )}

                {isError && (
                    <div className="text-center py-12">
                        <p className="text-destructive mb-2">Failed to fetch search results.</p>
                        <p className="text-sm text-muted-foreground">
                            {error instanceof Error ? error.message : 'Unknown error occurred'}
                        </p>
                    </div>
                )}

                {!isLoading && !isError && queryToRun && (!results || results.length === 0) && (
                    <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No results found</h3>
                        <p className="text-muted-foreground">
                            We couldn't find any papers matching "{queryToRun}".
                        </p>
                    </div>
                )}

                {!queryToRun && !isLoading && (
                    <div className="text-center py-12 max-w-md mx-auto">
                        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                        <h3 className="text-lg font-semibold mb-2">Start your research</h3>
                        <p className="text-sm text-muted-foreground">
                            Enter a topic above to search millions of open-access papers on arXiv.
                        </p>
                    </div>
                )}

                {results && results.length > 0 && (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        <div className="text-sm text-muted-foreground pb-2 border-b">
                            Found {results.length} top results for "{queryToRun}"
                        </div>

                        {results.map((paper) => (
                            <Card key={paper.id} className="overflow-hidden">
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-4">
                                        <CardTitle className="text-lg leading-tight">
                                            <a
                                                href={paper.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-primary transition-colors hover:underline"
                                            >
                                                {paper.title}
                                            </a>
                                        </CardTitle>
                                        <span className="text-xs font-semibold bg-accent px-2 py-1 rounded text-accent-foreground shrink-0 uppercase tracking-wider">
                                            {paper.source}
                                        </span>
                                    </div>
                                    <CardDescription className="flex flex-col gap-2 mt-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Users className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate" title={paper.authors.join(', ')}>
                                                {paper.authors.join(', ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                                            <span>{format(new Date(paper.publishedDate), 'MMMM d, yyyy')}</span>
                                        </div>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                        {paper.summary}
                                    </p>
                                </CardContent>
                                <CardFooter className="bg-muted/30 border-t flex justify-end gap-2 pt-4">
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={paper.url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            arXiv Page
                                        </a>
                                    </Button>

                                    {projects && projects.length > 0 && paper.pdfUrl && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="sm" variant="secondary">
                                                    <PlusCircle className="h-4 w-4 mr-2" />
                                                    Add to Project
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Select Project</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {projects.map((project) => (
                                                    <DropdownMenuItem
                                                        key={project.id}
                                                        onClick={() => handleAddToProject(project.id, paper)}
                                                    >
                                                        {project.name}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}

                                    {paper.pdfUrl && (
                                        <Button size="sm" asChild>
                                            <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                <FileText className="h-4 w-4 mr-2" />
                                                Download PDF
                                            </a>
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
