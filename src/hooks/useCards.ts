import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseCardsParams {
  moveCard: (cardId: string, newColumnId: string, newPosition: number) => Promise<any>;
  createCard: (columnId: string, title: string, description?: string) => Promise<any>;
  deleteCard: (cardId: string) => Promise<any>;
  assignCard: (cardId: string, assigneeId: string) => Promise<any>;
}

export function useCards({ moveCard, createCard, deleteCard, assignCard }: UseCardsParams) {
  const { toast } = useToast();

  const safeCreateCard = useCallback(
    async (columnId: string, title: string, description?: string) => {
      await createCard(columnId, title, description);
      toast({ title: 'Success', description: 'Card created successfully!' });
    },
    [createCard, toast]
  );

  const safeDeleteCard = useCallback(
    async (cardId: string) => {
      await deleteCard(cardId);
      toast({ title: 'Card deleted' });
    },
    [deleteCard, toast]
  );

  const safeAssignCard = useCallback(
    async (cardId: string, assigneeId: string) => {
      await assignCard(cardId, assigneeId);
      toast({ title: 'Assignee updated' });
    },
    [assignCard, toast]
  );

  const safeMoveCard = useCallback(
    async (cardId: string, columnId: string, position: number) => {
      await moveCard(cardId, columnId, position);
      toast({ title: 'Success', description: 'Card moved successfully!' });
    },
    [moveCard, toast]
  );

  return {
    createCard: safeCreateCard,
    deleteCard: safeDeleteCard,
    assignCard: safeAssignCard,
    moveCard: safeMoveCard,
  };
}
