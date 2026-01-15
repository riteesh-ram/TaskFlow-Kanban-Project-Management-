import { supabase } from '@/api/supabase';
import { cacheService } from '@/lib/redis';

interface CreateCardPayload {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  labels?: string[];
  dueDate?: string;
  metadata?: any;
  userId?: string;
}

interface MoveCardPayload {
  cardId: string;
  boardId: string;
  newColumnId: string;
  newPosition: number;
  userId: string;
  oldValues?: { column_id?: string; position?: number };
}

interface DeleteCardPayload {
  cardId: string;
  boardId: string;
  userId: string;
  oldValues?: any;
}

interface AssignCardPayload {
  cardId: string;
  boardId: string;
  assigneeUserId: string;
  userId: string;
  cardTitle: string;
  previousAssignee?: string | null;
}

export const cardApi = {
  async getNextPosition(columnId: string) {
    const { data } = await supabase
      .from('cards')
      .select('position')
      .eq('column_id', columnId)
      .order('position', { ascending: false })
      .limit(1);
    return data && data.length > 0 ? data[0].position + 1 : 0;
  },

  async createCard(payload: CreateCardPayload) {
    const { boardId, columnId, title, description, labels, dueDate, metadata, userId } = payload;
    const position = await this.getNextPosition(columnId);

    const { data, error } = await supabase
      .from('cards')
      .insert([{ title, description, column_id: columnId, board_id: boardId, position, labels, due_date: dueDate || null, metadata }])
      .select()
      .single();

    if (error) throw error;

    await cacheService.invalidateBoardCache(boardId);

    await supabase.from('audit_logs').insert([
      {
        board_id: boardId,
        user_id: userId,
        action: 'CardCreated',
        resource_type: 'card',
        resource_id: data.id,
        new_values: data,
      },
    ]);

    return data;
  },

  async moveCard(payload: MoveCardPayload) {
    const { cardId, boardId, newColumnId, newPosition, userId, oldValues } = payload;

    const { error } = await supabase
      .from('cards')
      .update({ column_id: newColumnId, position: newPosition })
      .eq('id', cardId);

    if (error) throw error;

    await cacheService.invalidateBoardCache(boardId);

    await supabase.from('audit_logs').insert([
      {
        board_id: boardId,
        user_id: userId,
        action: 'CardMoved',
        resource_type: 'card',
        resource_id: cardId,
        old_values: oldValues,
        new_values: { column_id: newColumnId, position: newPosition },
      },
    ]);
  },

  async deleteCard(payload: DeleteCardPayload) {
    const { cardId, boardId, userId, oldValues } = payload;

    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId);

    if (error) throw error;

    await cacheService.invalidateBoardCache(boardId);

    await supabase.from('audit_logs').insert([
      {
        board_id: boardId,
        user_id: userId,
        action: 'CardDeleted',
        resource_type: 'card',
        resource_id: cardId,
        old_values: oldValues,
      },
    ]);
  },

  async assignCard(payload: AssignCardPayload) {
    const { cardId, boardId, assigneeUserId, userId, cardTitle, previousAssignee } = payload;

    const { error } = await supabase
      .from('cards')
      .update({ assignee_id: assigneeUserId })
      .eq('id', cardId);

    if (error) throw error;

    await cacheService.invalidateBoardCache(boardId);

    await supabase.from('audit_logs').insert([
      {
        board_id: boardId,
        user_id: userId,
        action: 'CardAssigned',
        resource_type: 'card',
        resource_id: cardId,
        old_values: { assignee_id: previousAssignee ?? null },
        new_values: { assignee_id: assigneeUserId },
      },
    ]);

    await supabase.from('notifications').insert([
      {
        user_id: assigneeUserId,
        board_id: boardId,
        title: 'Task assigned',
        message: `You have been assigned to "${cardTitle}"`,
        type: 'info',
      },
    ]);
  },
};
