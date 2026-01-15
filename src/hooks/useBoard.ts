import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeBoard } from './useRealtimeBoard';
import { boardApi, BoardSettings } from '@/api/boards';
import { columnApi } from '@/api/columns';

export function useBoard(boardId: string) {
  const { user } = useAuth();
  const realtime = useRealtimeBoard(boardId);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<Array<{ user_id: string; email: string; full_name: string | null; role: string }>>([]);

  useEffect(() => {
    if (!realtime.boardData) return;
    setColumnOrder(realtime.boardData.columns.map((col) => col.id));
    const incomingColors = (realtime.boardData.settings as BoardSettings | undefined)?.column_colors || {};
    setColumnColors(incomingColors);
  }, [realtime.boardData]);

  const refreshMembers = useCallback(async () => {
    if (!boardId) return;
    const fetched = await boardApi.fetchMembers(boardId, user?.id);
    setMembers(fetched);
  }, [boardId, user?.id]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  const mergeColumnColor = useCallback(
    async (columnId: string, color: string, currentSettings?: BoardSettings) => {
      if (!boardId) return;
      const nextColors = { [columnId]: color };
      const merged = await boardApi.mergeColumnColors(boardId, currentSettings || realtime.boardData?.settings || {}, nextColors);
      setColumnColors(merged.column_colors || {});
      await realtime.refetch();
    },
    [boardId, realtime]
  );

  const createDefaultColumns = useCallback(async () => {
    if (!boardId) return;
    await columnApi.createDefaultColumns(boardId);
    await realtime.refetch();
  }, [boardId, realtime]);

  const inviteMember = useCallback(
    async (email: string) => {
      if (!boardId) return;
      await boardApi.inviteMemberByEmail(boardId, email);
      await refreshMembers();
    },
    [boardId, refreshMembers]
  );

  const removeBoard = useCallback(async () => {
    if (!boardId) return;
    await boardApi.deleteBoard(boardId);
  }, [boardId]);

  return {
    ...realtime,
    columnOrder,
    setColumnOrder,
    columnColors,
    setColumnColors,
    mergeColumnColor,
    members,
    refreshMembers,
    inviteMember,
    createDefaultColumns,
    removeBoard,
  };
}
