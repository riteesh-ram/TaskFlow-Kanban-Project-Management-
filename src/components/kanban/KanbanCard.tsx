import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Lock, Trash2, UserPlus2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/contexts/AuthContext';

interface KanbanCardProps {
  card: {
    id: string;
    title: string;
    description?: string;
    assignee_id?: string;
    due_date?: string;
    labels?: string[];
    metadata?: any;
  };
  isLocked?: boolean;
  onDelete?: (id: string) => void;
  onClick?: (cardId: string) => void;
  members?: Array<{ user_id: string; email: string; full_name: string | null; role: string }>;
  onAssign?: (cardId: string, assigneeId: string) => void;
  boardSettings?: any;
}

const LABEL_COLORS: Record<string, string> = {
  bug: 'bg-red-500',
  feature: 'bg-blue-500',
  enhancement: 'bg-green-500',
  urgent: 'bg-orange-500',
  documentation: 'bg-purple-500',
  testing: 'bg-cyan-500',
};

const KanbanCard: React.FC<KanbanCardProps> = ({ 
  card, 
  isLocked = false, 
  onDelete, 
  onClick,
  members, 
  onAssign,
  boardSettings 
}) => {
  const { user } = useAuth();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging
      ? 'transform 140ms cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 140ms ease'
      : 'transform 220ms ease, box-shadow 220ms ease',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
      onClick={() => onClick && onClick(card.id)}
    >
      <Card className={`cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ease-out border-muted ${
        isLocked ? 'opacity-60 border-orange-300' : ''
      } ${isDragging ? 'opacity-50 rotate-3 shadow-2xl scale-105 z-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 flex items-center gap-2">
              {card.metadata?.card_type && (
                <span className="text-xs px-2 py-0.5 rounded bg-muted">
                  {card.metadata.card_type}
                </span>
              )}
              <CardTitle className="text-sm font-medium text-card-foreground flex-1">{card.title}</CardTitle>
              {boardSettings?.show_story_points && card.metadata?.story_points && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {card.metadata.story_points}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLocked && (
                <Lock className="w-3 h-3 text-orange-600" />
              )}
              {onAssign && members && members.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Assign card"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <UserPlus2 className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[200px]">
                    {members.map((m) => {
                      const isAssigned = m.user_id === card.assignee_id;
                      const isMe = m.user_id === user?.id;
                      const displayName = isMe 
                        ? `Me (${m.full_name || m.email})`
                        : (m.full_name || m.email);
                      
                      return (
                        <DropdownMenuItem
                          key={m.user_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssign(card.id, m.user_id);
                          }}
                          className={`text-xs ${isMe ? 'font-semibold bg-primary/10' : ''}`}
                        >
                          {displayName}{isAssigned ? ' ✓' : ''}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                  aria-label="Delete card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        {(card.description || card.due_date || card.labels?.length) && (
          <CardContent className="pt-0">
            {card.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {card.description}
              </p>
            )}
            
            {card.labels && card.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {card.labels.map((label, index) => {
                  const bgColor = LABEL_COLORS[label] || 'bg-gray-500';
                  return (
                    <Badge 
                      key={index} 
                      className={`text-xs text-white ${bgColor} border-0 capitalize`}
                    >
                      {label}
                    </Badge>
                  );
                })}
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {card.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(card.due_date).toLocaleDateString()}
                </div>
              )}
              {card.assignee_id && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {(() => {
                    const assignee = members?.find(m => m.user_id === card.assignee_id);
                    return assignee ? (assignee.full_name || assignee.email) : 'Assigned';
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export { KanbanCard };