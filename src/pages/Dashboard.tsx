import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/api/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Users, Calendar, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ResponsiveDialog } from '@/components/ux/ResponsiveDialog';
import { AsyncBoundary } from '@/components/ux/AsyncBoundary';
import { SkeletonGrid } from '@/components/ux/SkeletonGrid';
import { useTheme } from 'next-themes';

interface Board {
  id: string;
  title: string;
  description: string;
  created_at: string;
  owner_id: string;
}

const Dashboard = () => {
  const { theme, setTheme } = useTheme();
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBoard, setNewBoard] = useState({ title: '', description: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBoards();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Safety timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn('Dashboard: forcing loading=false after timeout');
        return false;
      });
    }, 4000);
    return () => clearTimeout(timeoutId);
  }, []);

  const fetchBoards = async () => {
    try {
      setErrorMessage(null);
      if (!user) return;

      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBoards(data || []);
    } catch (error) {
      console.error('Error fetching boards:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch boards',
        variant: 'destructive',
      });
      setErrorMessage('Failed to load boards. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newBoardId = crypto.randomUUID();
      const { error } = await supabase
        .from('boards')
        .insert([{
          id: newBoardId,
          title: newBoard.title,
          description: newBoard.description,
          owner_id: user?.id,
        }]);

      if (error) throw error;

      await supabase.from('columns').insert([
        { board_id: newBoardId, title: 'To Do', position: 0 },
        { board_id: newBoardId, title: 'In Progress', position: 1 },
        { board_id: newBoardId, title: 'Done', position: 2 },
      ]);

      toast({
        title: 'Success',
        description: 'Board created successfully!',
      });

      setNewBoard({ title: '', description: '' });
      setCreateDialogOpen(false);
      fetchBoards();
    } catch (error) {
      console.error('Error creating board:', error);
      toast({
        title: 'Error',
        description: 'Failed to create board',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <AsyncBoundary
        loading={loading}
        error={errorMessage}
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-5xl p-6">
              <SkeletonGrid rows={2} cols={3} />
            </div>
          </div>
        }
        errorFallback={(message) => (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold">Unable to load dashboard</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button onClick={fetchBoards}>Retry</Button>
            </div>
          </div>
        )}
      >
        <div className="min-h-screen bg-background">
          <header className="border-b border-border bg-gradient-to-r from-accent to-secondary/70">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Kanban Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {userProfile?.full_name || user?.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>

                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Board
                </Button>

                <ResponsiveDialog
                  open={createDialogOpen}
                  onOpenChange={setCreateDialogOpen}
                  title="Create New Board"
                  description="Create a new Kanban board for your project"
                >
                  <form onSubmit={handleCreateBoard} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Board Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter board title"
                        value={newBoard.title}
                        onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="Enter board description"
                        value={newBoard.description}
                        onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create Board</Button>
                    </div>
                  </form>
                </ResponsiveDialog>

                <Button variant="outline" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            {boards.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-4">No boards yet</h2>
                <p className="text-muted-foreground mb-6">Create your first Kanban board to get started</p>
                <Button size="lg" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Board
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boards.map((board) => (
                  <Card
                    key={board.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/board/${board.id}`)}
                  >
                    <CardHeader>
                      <CardTitle>{board.title}</CardTitle>
                      <CardDescription>{board.description || 'No description'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(board.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          1 member
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </AsyncBoundary>
    </DashboardLayout>
  );
};

export default Dashboard;