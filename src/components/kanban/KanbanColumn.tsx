import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  sortableId?: string;
  column: {
    id: string;
    title: string;
    position: number;
  };
  cards: any[];
  columnColor?: string;
  lockedCards?: Set<string>;
  onCreateCard: (columnId: string) => void;
  onCardClick?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  members?: Array<{ user_id: string; email: string; full_name: string | null; role: string }>;
  onAssignCard?: (cardId: string, assigneeId: string) => void;
  boardSettings?: any;
  onEditColumn?: () => void;
  onDeleteColumn?: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  column, 
  cards, 
  columnColor,
  lockedCards, 
  onCreateCard, 
  onCardClick,
  onDeleteCard, 
  members, 
  onAssignCard,
  boardSettings,
  onEditColumn,
  onDeleteColumn,
  sortableId
}) => {
  const {
    setNodeRef: setSortableNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId || column.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const cardIds = cards.map(card => card.id);

  const getColumnClass = () => {
    // FIX: If a custom color is set, do NOT apply the default theme classes
      if (columnColor) return ''; 
    
    const title = column.title.toLowerCase();
    if (title.includes('todo') || title.includes('to do')) return 'kanban-column-todo';
    if (title.includes('progress') || title.includes('doing')) return 'kanban-column-progress';
    if (title.includes('done') || title.includes('complete')) return 'kanban-column-done';
    return '';
  };

  const getColumnHeaderClass = () => {
    // FIX: Don't return 'bg-card' (which is opaque). Return empty to let inline style work.
    if (columnColor) return 'transition-colors'; 
    
    const title = column.title.toLowerCase();
    if (title.includes('todo') || title.includes('to do')) return 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-l-4 border-blue-500';
    if (title.includes('progress') || title.includes('doing')) return 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-l-4 border-amber-500';
    if (title.includes('done') || title.includes('complete')) return 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-l-4 border-green-500';
    return 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-l-4 border-purple-500';
  };

  const headerStyle = columnColor
    ? {
        // Increased opacity slightly (22->33, 0f->1a) to make it more visible
        background: `linear-gradient(135deg, ${columnColor}33, ${columnColor}1a)`,
        borderLeft: `4px solid ${columnColor}`,
      }
    : undefined;

  const cardStyle = isOver && columnColor ? { boxShadow: `0 0 0 2px ${columnColor}` } : undefined;

  return (
    <div ref={setSortableNodeRef} style={style} {...attributes} {...listeners} className="h-full">
      <Card 
        className={`w-80 flex-shrink-0 ${getColumnClass()} ${isOver ? 'shadow-lg scale-[1.02]' : ''} transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden`} 
        style={cardStyle}
      >
        <CardHeader 
          className={`pb-3 ${getColumnHeaderClass()} transition-all duration-200`} 
          style={headerStyle}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              {column.title} ({cards.length})
            </CardTitle>
            <div className="flex items-center gap-1">
              {onEditColumn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEditColumn}
                  className="hover:bg-primary/10"
                  aria-label="Edit column"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDeleteColumn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDeleteColumn}
                  className="hover:bg-destructive/10 text-destructive"
                  aria-label="Delete column"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCreateCard(column.id)}
                className="hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent ref={setDroppableNodeRef} className="space-y-3 min-h-[200px] bg-secondary/40 rounded-b-[var(--radius)] pt-3">
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <KanbanCard 
                key={card.id} 
                card={card} 
                isLocked={lockedCards?.has(card.id) || false}
                onClick={onCardClick}
                onDelete={onDeleteCard}
                members={members}
                onAssign={onAssignCard}
                boardSettings={boardSettings}
              />
            ))}
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  );
};

export { KanbanColumn };