import { supabase } from '@/api/supabase';
import { cacheService } from '@/lib/redis';

export const columnApi = {
  async createColumn(boardId: string, title: string, position: number) {
    const { data, error } = await supabase
      .from('columns')
      .insert([{ board_id: boardId, title, position }])
      .select()
      .single();
    if (error) throw error;
    await cacheService.invalidateBoardCache(boardId);
    return data;
  },

  async updateColumn(columnId: string, payload: Partial<{ title: string; position: number }>) {
    const { error } = await supabase
      .from('columns')
      .update(payload)
      .eq('id', columnId);
    if (error) throw error;
  },

  async reorderColumns(boardId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase
          .from('columns')
          .update({ position: idx })
          .eq('id', id)
      )
    );
    await cacheService.invalidateBoardCache(boardId);
  },

  async createDefaultColumns(boardId: string) {
    const defaults = [
      { title: 'To Do', position: 0 },
      { title: 'In Progress', position: 1 },
      { title: 'Done', position: 2 },
    ];
    const { error } = await supabase
      .from('columns')
      .insert(defaults.map((col) => ({ ...col, board_id: boardId })));
    if (error) throw error;
    await cacheService.invalidateBoardCache(boardId);
  },

  async deleteColumn(boardId: string, columnId: string) {
    // Remove cards first to satisfy FK constraints, then the column
    const { error: cardError } = await supabase
      .from('cards')
      .delete()
      .eq('column_id', columnId);
    if (cardError) throw cardError;

    const { error: columnError } = await supabase
      .from('columns')
      .delete()
      .eq('id', columnId)
      .eq('board_id', boardId);
    if (columnError) throw columnError;

    await cacheService.invalidateBoardCache(boardId);
  },
};
