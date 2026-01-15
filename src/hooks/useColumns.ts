import { useCallback, useState } from 'react';
import { columnApi } from '@/api/columns';
import { boardApi, BoardSettings } from '@/api/boards';

interface UseColumnsParams {
  boardId: string;
  boardSettings?: BoardSettings;
  setColumnColors: (colors: Record<string, string>) => void;
  refetch: () => Promise<void>;
}

export function useColumns({ boardId, boardSettings, setColumnColors, refetch }: UseColumnsParams) {
  const [savingColumn, setSavingColumn] = useState(false);

  const saveColumn = useCallback(
    async (payload: { id: string | null; title: string; color: string; position?: number }) => {
      if (!boardId) return;
      setSavingColumn(true);
      try {
        const currentSettings = boardSettings || {};
        const existingColors = currentSettings.column_colors || {};
        const updatedColors = { ...existingColors };

        if (payload.id) {
          await columnApi.updateColumn(payload.id, { title: payload.title });
          updatedColors[payload.id] = payload.color;
        } else {
          const position = typeof payload.position === 'number' ? payload.position : 0;
          const newCol = await columnApi.createColumn(boardId, payload.title || 'New column', position);
          updatedColors[newCol.id] = payload.color;
        }

        const merged = await boardApi.mergeColumnColors(boardId, currentSettings, updatedColors);
        setColumnColors(merged.column_colors || {});
        await refetch();
      } finally {
        setSavingColumn(false);
      }
    },
    [boardId, boardSettings, setColumnColors, refetch]
  );

  const reorderColumns = useCallback(
    async (orderedIds: string[]) => {
      if (!boardId) return;
      await columnApi.reorderColumns(boardId, orderedIds);
      await refetch();
    },
    [boardId, refetch]
  );

  const createDefaultColumns = useCallback(async () => {
    if (!boardId) return;
    await columnApi.createDefaultColumns(boardId);
    await refetch();
  }, [boardId, refetch]);

  const deleteColumn = useCallback(
    async (columnId: string) => {
      if (!boardId) return;
      setSavingColumn(true);
      try {
        await columnApi.deleteColumn(boardId, columnId);
        const nextSettings = boardSettings || {};
        const updatedColors = { ...(nextSettings.column_colors || {}) };
        delete updatedColors[columnId];
        await boardApi.updateSettings(boardId, {
          ...nextSettings,
          column_colors: updatedColors,
        });
        setColumnColors(updatedColors);
        await refetch();
      } finally {
        setSavingColumn(false);
      }
    },
    [boardId, boardSettings, setColumnColors, refetch]
  );

  return {
    saveColumn,
    reorderColumns,
    createDefaultColumns,
    deleteColumn,
    savingColumn,
  };
}
