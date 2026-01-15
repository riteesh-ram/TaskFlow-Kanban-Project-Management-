import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cacheService } from '@/lib/redis';
import { boardApi } from '@/api/boards';
import { cardApi } from '@/api/cards';
import { useOptimisticUpdates } from './useOptimisticUpdates';

interface BoardData {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  columns: Column[];
  settings?: any;
}

interface Column {
  id: string;
  title: string;
  position: number;
  board_id: string;
  cards: Card[];
}

interface Card {
  id: string;
  title: string;
  description?: string;
  position: number;
  column_id: string;
  board_id: string;
  assignee_id?: string;
  due_date?: string;
  labels?: string[];
}

export function useRealtimeBoard(boardId: string) {
  const { user } = useAuth();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { performOptimisticUpdate } = useOptimisticUpdates<any>();

  // Fetch board data with caching
  const fetchBoardData = useCallback(async () => {
    if (!boardId || !user) return;

    try {
      const cachedData = await cacheService.getCachedBoardData(boardId);
      if (cachedData) {
        setBoardData(cachedData);
        setLoading(false);
      }

      const freshData = await boardApi.fetchBoardWithRelations(boardId);

      setBoardData(freshData);
      
      await cacheService.cacheBoardData(boardId, freshData, 300);
      
    } catch (err) {
      console.error('Error fetching board data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [boardId, user]);

  // Optimistic card move
  const moveCard = useCallback(async (
    cardId: string,
    newColumnId: string,
    newPosition: number
  ) => {
    if (!boardData || !user) return;

    const previous = boardData;
    const card = previous.columns.flatMap(col => col.cards).find(c => c.id === cardId);
    if (!card) return;

    const applyLocalMove = (state: typeof previous) => {
      const columns = state.columns.map(col => {
        if (!col.cards.some(c => c.id === cardId) && col.id !== newColumnId) return col;

        if (col.id === card.column_id) {
          const remaining = col.cards.filter(c => c.id !== cardId);
          return { ...col, cards: remaining.map((c, idx) => ({ ...c, position: idx })) };
        }

        if (col.id === newColumnId) {
          const without = col.cards.filter(c => c.id !== cardId);
          const clamped = Math.max(0, Math.min(newPosition, without.length));
          const inserted = [
            ...without.slice(0, clamped),
            { ...card, column_id: newColumnId },
            ...without.slice(clamped),
          ].map((c, idx) => ({ ...c, position: idx }));
          return { ...col, cards: inserted };
        }

        return col;
      });
      return { ...state, columns };
    };

    setBoardData(prev => (prev ? applyLocalMove(prev) : prev));

    try {
      await performOptimisticUpdate(
        async () => {
          await cardApi.moveCard({
            cardId,
            boardId,
            newColumnId,
            newPosition,
            userId: user.id,
            oldValues: { column_id: card.column_id, position: card.position },
          });
          return { ...card, column_id: newColumnId, position: newPosition };
        },
        'card',
        cardId,
        { ...card, column_id: newColumnId, position: newPosition },
        'update'
      );
    } catch (err) {
      setBoardData(previous);
      throw err;
    }
  }, [boardData, user, performOptimisticUpdate, boardId]);

  // Optimistic card creation
  const createCard = useCallback(async (
    columnId: string,
    title: string,
    description?: string
  ) => {
    if (!user) return;

    const tempId = `temp-${Date.now()}`;
    const previous = boardData;
    const position = previous?.columns.find(col => col.id === columnId)?.cards.length || 0;

    const optimisticCard = {
      id: tempId,
      title,
      description,
      position,
      column_id: columnId,
      board_id: boardId,
      assignee_id: null,
      due_date: null,
      labels: []
    };

    setBoardData(prev => {
      if (!prev) return prev;
      const columns = prev.columns.map(col => {
        if (col.id !== columnId) return col;
        const cards = [...col.cards, optimisticCard].map((c, idx) => ({ ...c, position: idx }));
        return { ...col, cards };
      });
      return { ...prev, columns };
    });

    try {
      await performOptimisticUpdate(
        async () => {
          const created = await cardApi.createCard({
            boardId,
            columnId,
            title,
            description,
            labels: [],
            userId: user.id,
          });
          return created;
        },
        'card',
        tempId,
        optimisticCard,
        'create'
      );
    } catch (err) {
      setBoardData(previous);
      throw err;
    }
  }, [user, boardData, boardId, performOptimisticUpdate]);

  // Optimistic card deletion
  const deleteCard = useCallback(async (cardId: string) => {
    if (!boardData || !user) return;

    const previous = boardData;
    const card = previous.columns.flatMap(col => col.cards).find(c => c.id === cardId);
    if (!card) return;

    setBoardData(prev => {
      if (!prev) return prev;
      const columns = prev.columns.map(col => {
        if (!col.cards.some(c => c.id === cardId)) return col;
        const remaining = col.cards.filter(c => c.id !== cardId).map((c, idx) => ({ ...c, position: idx }));
        return { ...col, cards: remaining };
      });
      return { ...prev, columns };
    });

    const optimisticData = { ...card };

    try {
      await performOptimisticUpdate(
        async () => {
          await cardApi.deleteCard({
            cardId,
            boardId,
            userId: user.id,
            oldValues: optimisticData,
          });

          return { id: cardId } as any;
        },
        'card',
        cardId,
        optimisticData as any,
        'delete'
      );
    } catch (err) {
      setBoardData(previous);
      throw err;
    }
  }, [boardData, user, performOptimisticUpdate, boardId]);

  // Assign card to a user
  const assignCard = useCallback(async (
    cardId: string,
    assigneeUserId: string
  ) => {
    if (!boardData || !user) return;

    const previous = boardData;
    const card = previous.columns.flatMap(col => col.cards).find(c => c.id === cardId);
    if (!card) return;

    setBoardData(prev => {
      if (!prev) return prev;
      const columns = prev.columns.map(col => {
        if (!col.cards.some(c => c.id === cardId)) return col;
        const cards = col.cards.map(c => c.id === cardId ? { ...c, assignee_id: assigneeUserId } : c);
        return { ...col, cards };
      });
      return { ...prev, columns };
    });

    const optimisticCard = { ...card, assignee_id: assigneeUserId } as any;

    try {
      await performOptimisticUpdate(
        async () => {
          await cardApi.assignCard({
            cardId,
            boardId,
            assigneeUserId,
            userId: user.id,
            cardTitle: card.title,
            previousAssignee: card.assignee_id ?? null,
          });

          return optimisticCard;
        },
        'card',
        cardId,
        optimisticCard as any,
        'update'
      );
    } catch (err) {
      setBoardData(previous);
      throw err;
    }
  }, [boardData, user, performOptimisticUpdate, boardId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!boardId || !user) return;

    const boardChannel = supabase
      .channel('board-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boards',
          filter: `id=eq.${boardId}`
        },
        (payload) => {
          console.log('Board changed:', payload);
          fetchBoardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'columns',
          filter: `board_id=eq.${boardId}`
        },
        (payload) => {
          console.log('Column changed:', payload);
          fetchBoardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `board_id=eq.${boardId}`
        },
        (payload) => {
          console.log('Card changed:', payload);
          fetchBoardData();
        }
      )
      .subscribe();

    // Initial data fetch
    fetchBoardData();

    return () => {
      supabase.removeChannel(boardChannel);
    };
  }, [boardId, user, fetchBoardData]);

  return {
    boardData,
    loading,
    error,
    refetch: fetchBoardData,
    moveCard,
    createCard,
    deleteCard,
    assignCard
  };
}