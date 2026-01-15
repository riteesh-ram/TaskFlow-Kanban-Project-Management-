import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Lock, UserPlus, Trash2, Palette } from 'lucide-react';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { CreateCardDialog } from '@/components/kanban/CreateCardDialog';
import { CardDetailsModal } from '@/components/kanban/CardDetailsModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import UserPresence from '@/components/presence/UserPresence';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates';
import { useBoard } from '@/hooks/useBoard';
import { useColumns } from '@/hooks/useColumns';
import { useCards } from '@/hooks/useCards';
import { useFilter } from '@/hooks/useFilter';
import { useModal } from '@/hooks/useModal';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { SearchBar } from '@/components/molecules/SearchBar';
import { FilterChips } from '@/components/molecules/FilterChips';
import { ResponsiveDialog } from '@/components/ux/ResponsiveDialog';
import { AsyncBoundary } from '@/components/ux/AsyncBoundary';
import { SkeletonGrid } from '@/components/ux/SkeletonGrid';

const Board = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    boardData,
    loading,
    error,
    moveCard,
    createCard,
    deleteCard,
    assignCard,
    refetch,
    columnOrder,
    setColumnOrder,
    columnColors,
    setColumnColors,
    members,
    inviteMember,
    removeBoard,
  } = useBoard(boardId || '');
  const cardActions = useCards({ moveCard, createCard, deleteCard, assignCard });
  const columnActions = useColumns({
    boardId: boardId || '',
    boardSettings: boardData?.settings,
    setColumnColors,
    refetch,
  });
  const { saveColumn, reorderColumns, createDefaultColumns: createDefaultColumnsAction, deleteColumn, savingColumn } = columnActions;
  const { searchQuery, setSearchQuery, activeFilters, toggleFilter, filterItems } = useFilter();
  const {
    createDialogOpen,
    setCreateDialogOpen,
    selectedColumnId,
    setSelectedColumnId,
    cardDetailsOpen,
    setCardDetailsOpen,
    selectedCardId,
    setSelectedCardId,
    inviteOpen,
    setInviteOpen,
    columnDialogOpen,
    setColumnDialogOpen,
    openCreateForColumn,
    openCardDetails,
  } = useModal();
  const { pendingUpdates, isResourceLocked } = useOptimisticUpdates();
  const [lockedResources, setLockedResources] = useState<Set<string>>(new Set());
  const [inviteEmail, setInviteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<{ id: string; title: string } | null>(null);
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);
  const [columnForm, setColumnForm] = useState<{ id: string | null; title: string; color: string }>({
    id: null,
    title: '',
    color: '#4f46e5',
  });
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  useEffect(() => {
    if (!boardData || !user) return;

    const checkLocks = async () => {
      const newLockedResources = new Set<string>();
      for (const column of boardData.columns) {
        for (const card of column.cards) {
          const locked = await isResourceLocked('card', card.id);
          if (locked) {
            newLockedResources.add(card.id);
          }
        }
      }
      setLockedResources(newLockedResources);
    };

    checkLocks();
    const interval = setInterval(checkLocks, 2000);
    return () => clearInterval(interval);
  }, [boardData, user, isResourceLocked]);

  useEffect(() => {
    if (!boardId || !user) {
      navigate('/');
      return;
    }
  }, [boardId, user, navigate]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Members handled via useBoard hook

  const handleCreateDefaultColumns = async () => {
    if (!boardId || !user) return;
    try {
      await createDefaultColumnsAction();
      toast({ title: 'Columns created', description: 'Default lanes added.' });
    } catch (err) {
      console.error('Error creating default columns:', err);
      toast({ title: 'Error', description: 'Could not create columns.', variant: 'destructive' });
    }
  };

  const handleInviteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId || !user || !inviteEmail) return;
    try {
      await inviteMember(inviteEmail);
      toast({ title: 'Invite sent', description: 'User added as editor.' });
      setInviteEmail('');
      setInviteOpen(false);
    } catch (err) {
      console.error('Invite error:', err);
      const description = err && typeof err === 'object' && 'message' in (err as any)
        ? (err as any).message
        : 'Could not add member.';
      toast({ title: 'Error', description, variant: 'destructive' });
    }
  };

  const openNewColumnDialog = () => {
    setColumnForm({ id: null, title: '', color: '#4f46e5' });
    setColumnDialogOpen(true);
  };

  const openEditColumnDialog = (columnId: string, title: string, color?: string) => {
    setColumnForm({ id: columnId, title, color: color || '#4f46e5' });
    setColumnDialogOpen(true);
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId || !user || !boardData) return;

    try {
      const position = columnForm.id ? undefined : boardData.columns.length;
      await saveColumn({
        id: columnForm.id,
        title: columnForm.title,
        color: columnForm.color,
        position,
      });

      toast({ title: columnForm.id ? 'Column updated' : 'Column created', description: 'Lane saved successfully.' });
      setColumnDialogOpen(false);
      setColumnForm({ id: null, title: '', color: '#4f46e5' });
    } catch (err) {
      console.error('Column save error', err);
      toast({ title: 'Error', description: 'Could not save column.', variant: 'destructive' });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !boardData) return;
    if (active.id === over.id) return;

    // Column drag
    if (boardData.columns.some(col => col.id === active.id) && boardData.columns.some(col => col.id === over.id)) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      setColumnOrder(newOrder);
      await reorderColumns(newOrder);
      toast({ title: 'Columns reordered' });
      return;
    }

    // Card drag (existing logic)
    const activeCard = boardData.columns
      .flatMap(col => col.cards)
      .find(card => card.id === active.id);
    if (!activeCard) return;

    const overColumn = boardData.columns.find(col => col.id === over.id) ||
      boardData.columns.find(col => col.cards.some(c => c.id === over.id));
    const overCard = boardData.columns
      .flatMap(col => col.cards)
      .find(card => card.id === over.id);

    let targetColumnId = overColumn?.id || activeCard.column_id;
    let newPosition = activeCard.position;

    if (lockedResources.has(activeCard.id)) {
      toast({
        title: 'Card Locked',
        description: 'This card is being edited by another user',
        variant: 'destructive',
      });
      return;
    }

    if (targetColumnId === activeCard.column_id) {
      // Reordering within the same column
      const originColumn = boardData.columns.find(col => col.id === activeCard.column_id);
      if (originColumn) {
        const ids = originColumn.cards.map(c => c.id);
        const activeIndex = ids.indexOf(activeCard.id);
        const overIndex = ids.indexOf(over.id as string);
        if (overIndex >= 0) {
          const newOrder = arrayMove(ids, activeIndex, overIndex);
          newPosition = newOrder.indexOf(activeCard.id);
        } else {
          newPosition = ids.length - 1;
        }
      }
    } else {
      // Moving to a different column
      if (overCard) {
        const targetColumn = boardData.columns.find(col => col.id === targetColumnId);
        const ids = targetColumn ? targetColumn.cards.map(c => c.id) : [];
        const overIndex = ids.indexOf(overCard.id);
        newPosition = overIndex >= 0 ? overIndex : ids.length;
      } else if (overColumn) {
        newPosition = overColumn.cards.length;
      }
    }

    try {
      await cardActions.moveCard(activeCard.id, targetColumnId, newPosition);
    } catch (error) {
      console.error('Error moving card:', error);
      toast({
        title: 'Error',
        description: 'Failed to move card. Another user might be editing it.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDeleteColumn = async () => {
    if (!deleteColumnTarget) return;
    try {
      setDeletingColumnId(deleteColumnTarget.id);
      await deleteColumn(deleteColumnTarget.id);
      toast({ title: 'Column deleted', description: `${deleteColumnTarget.title} and its cards were removed.` });
    } catch (err) {
      console.error('Delete column error:', err);
      toast({ title: 'Error', description: 'Failed to delete column.', variant: 'destructive' });
    } finally {
      setDeletingColumnId(null);
      setDeleteColumnTarget(null);
    }
  };

  return (
    <DashboardLayout>
      <AsyncBoundary
        loading={loading}
        error={error}
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-4xl p-6">
              <SkeletonGrid rows={2} cols={3} />
            </div>
          </div>
        }
        errorFallback={(message) => (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold">Unable to load board</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}
      >
        {!boardData ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Board not found</h2>
              <Button onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card">
              <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">{boardData.title}</h1>
                    <p className="text-muted-foreground">{boardData.description || 'No description'}</p>
                  </div>
                  {pendingUpdates.length > 0 && (
                    <Badge variant="outline" className="text-orange-600">
                      <Lock className="w-3 h-3 mr-1" />
                      {pendingUpdates.length} pending
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <UserPresence boardId={boardId!} />
                  <Button variant="outline" size="sm" onClick={openNewColumnDialog}>
                    <Palette className="w-4 h-4 mr-2" />
                    Add column
                  </Button>
                  {user?.id === boardData.owner_id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Board
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this board?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the board, its columns, and cards. Members will lose access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              if (!boardId || !user) return;
                              try {
                                setDeleting(true);
                                await removeBoard();
                                toast({ title: 'Board deleted' });
                                navigate('/dashboard');
                              } catch (err) {
                                console.error('Delete board error:', err);
                                toast({ title: 'Error', description: 'Failed to delete board.', variant: 'destructive' });
                              } finally {
                                setDeleting(false);
                              }
                            }}
                          >
                            {deleting ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button variant="outline" onClick={() => setInviteOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" /> Invite
                  </Button>
                  <ResponsiveDialog
                    open={inviteOpen}
                    onOpenChange={setInviteOpen}
                    title="Invite to board"
                    description="Add a collaborator by email"
                  >
                    <form onSubmit={handleInviteByEmail} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="inviteEmail">Email</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          placeholder="name@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add as editor</Button>
                      </div>
                    </form>
                  </ResponsiveDialog>
                  <NotificationBell />
                </div>
              </div>
            </header>

            <div className="border-b border-border bg-card/50">
              <div className="container mx-auto px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-md">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search cards..." />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Quick Filters:</span>
                    <FilterChips options={['bug', 'feature', 'urgent']} active={activeFilters} onToggle={toggleFilter} />
                  </div>
                </div>
              </div>
            </div>

            <main className="container mx-auto px-4 py-6">
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                {boardData.columns.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <p className="text-muted-foreground">No columns yet</p>
                    <Button onClick={handleCreateDefaultColumns}>
                      <Plus className="w-4 h-4 mr-2" /> Add default columns
                    </Button>
                  </div>
                ) : (
                  <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                    <div className="flex gap-6 overflow-x-auto pb-6">
                      {columnOrder.map((colId) => {
                        const column = boardData.columns.find(c => c.id === colId);
                        if (!column) return null;
                        const filteredCards = filterItems(column.cards);
                        return (
                          <KanbanColumn
                            key={column.id}
                            column={column}
                            cards={filteredCards}
                            columnColor={columnColors[column.id]}
                            lockedCards={lockedResources}
                            onCreateCard={(columnId) => openCreateForColumn(columnId)}
                            onEditColumn={() => openEditColumnDialog(column.id, column.title, columnColors[column.id])}
                            onDeleteColumn={() => setDeleteColumnTarget({ id: column.id, title: column.title })}
                            onDeleteCard={async (cardId) => {
                              try {
                                await cardActions.deleteCard(cardId);
                              } catch (err) {
                                console.error('Delete error:', err);
                                toast({ title: 'Error', description: 'Failed to delete card.', variant: 'destructive' });
                              }
                            }}
                            members={members}
                            onAssignCard={async (cardId, assigneeId) => {
                              try {
                                await cardActions.assignCard(cardId, assigneeId);
                              } catch (err) {
                                console.error('Assign error:', err);
                                toast({ title: 'Error', description: 'Failed to assign card.', variant: 'destructive' });
                              }
                            }}
                            boardSettings={boardData.settings}
                            sortableId={column.id}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                )}
              </DndContext>

              <CreateCardDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                columnId={selectedColumnId}
                boardId={boardId!}
                onSuccess={() => {
                  setCreateDialogOpen(false);
                  refetch();
                }}
              />

              {selectedCardId && (
                <></>
              )}

              <ResponsiveDialog
                open={columnDialogOpen}
                onOpenChange={setColumnDialogOpen}
                title={columnForm.id ? 'Edit column' : 'Add column'}
                description="Set a title and color for this lane."
              >
                <form onSubmit={handleSaveColumn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="column-title">Column title</Label>
                    <Input
                      id="column-title"
                      value={columnForm.title}
                      onChange={(e) => setColumnForm({ ...columnForm, title: e.target.value })}
                      placeholder="e.g. Backlog"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="column-color">Accent color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="column-color"
                        type="color"
                        className="h-10 w-16 rounded border"
                        value={columnForm.color}
                        onChange={(e) => setColumnForm({ ...columnForm, color: e.target.value })}
                      />
                      <Input
                        value={columnForm.color}
                        onChange={(e) => setColumnForm({ ...columnForm, color: e.target.value })}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setColumnDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingColumn}>
                      {savingColumn ? 'Saving...' : columnForm.id ? 'Save changes' : 'Create column'}
                    </Button>
                  </div>
                </form>
              </ResponsiveDialog>

              <AlertDialog open={!!deleteColumnTarget} onOpenChange={(open) => !open && setDeleteColumnTarget(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete column {deleteColumnTarget ? `"${deleteColumnTarget.title}"` : ''}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the column and all cards inside it. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteColumnTarget(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDeleteColumn} disabled={!!deletingColumnId}>
                      {deletingColumnId ? 'Deleting...' : 'Delete column'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </main>
          </div>
        )}
      </AsyncBoundary>
    </DashboardLayout>
  );
};

export default Board;