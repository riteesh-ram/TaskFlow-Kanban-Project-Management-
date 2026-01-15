import { supabase } from '@/api/supabase';
import { cacheService } from '@/lib/redis';

export interface BoardSettings {
  column_colors?: Record<string, string>;
  [key: string]: any;
}

export interface BoardWithRelations {
  id: string;
  title: string;
  description?: string;
  owner_id: string;
  settings?: BoardSettings;
  columns: Array<{
    id: string;
    title: string;
    position: number;
    board_id: string;
    cards: any[];
  }>;
}

export const boardApi = {
  async fetchBoardWithRelations(boardId: string): Promise<BoardWithRelations> {
    // 1. Fetch Board (Top Level)
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('*') 
      .eq('id', boardId)
      .single();

    if (boardError) throw boardError;

    // 2. Fetch Columns and Cards in Parallel
    const [columnsResult, cardsResult] = await Promise.all([
      supabase.from('columns').select('*').eq('board_id', boardId).order('position'),
      supabase.from('cards').select('*').eq('board_id', boardId).order('position')
    ]);

    if (columnsResult.error) throw columnsResult.error;
    if (cardsResult.error) throw cardsResult.error;

    // 3. Merge them manually
    const columnsWithCards = (columnsResult.data || []).map((column) => ({
      ...column,
      cards: (cardsResult.data || []).filter((card) => card.column_id === column.id),
    }));

    return {
      ...board,
      columns: columnsWithCards,
    } as BoardWithRelations;
  },

  // --- ADD THIS MISSING FUNCTION HERE ---
  async updateSettings(boardId: string, settings: BoardSettings) {
    const { error } = await supabase
      .from('boards')
      .update({ settings })
      .eq('id', boardId);

    if (error) throw error;
    
    // Invalidate cache so the new colors show up immediately
    await cacheService.invalidateBoardCache(boardId);
  },
  // -------------------------------------

  async mergeColumnColors(boardId: string, currentSettings: BoardSettings, nextColors: Record<string, string>) {
    const mergedSettings: BoardSettings = {
      ...currentSettings,
      column_colors: {
        ...(currentSettings?.column_colors || {}),
        ...nextColors,
      },
    };

    // Now this call will work because we defined it above
    await boardApi.updateSettings(boardId, mergedSettings);
    return mergedSettings;
  },

  async fetchMembers(boardId: string, ensureUserId?: string) {
    const { data: board } = await supabase
      .from('boards')
      .select('owner_id')
      .eq('id', boardId)
      .single();

    const { data: members, error: memberError } = await supabase
      .from('board_members')
      .select('user_id, role')
      .eq('board_id', boardId);

    if (memberError) throw memberError;

    const userIds = new Set<string>();
    if (board?.owner_id) userIds.add(board.owner_id);
    members?.forEach((m) => userIds.add(m.user_id));
    if (ensureUserId) userIds.add(ensureUserId);

    const ids = Array.from(userIds);
    if (ids.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, full_name')
      .in('user_id', ids);

    const profileById = new Map<string, { email: string; full_name: string | null }>();
    (profiles || []).forEach((p) => profileById.set(p.user_id, { email: p.email, full_name: p.full_name }));

    const roleMap = new Map<string, string>();
    if (board?.owner_id) roleMap.set(board.owner_id, 'owner');
    (members || []).forEach((m: any) => roleMap.set(m.user_id, m.role));
    if (ensureUserId && !roleMap.has(ensureUserId)) roleMap.set(ensureUserId, 'viewer');

    return ids.map((id) => ({
      user_id: id,
      role: roleMap.get(id) || 'viewer',
      email: profileById.get(id)?.email || 'unknown',
      full_name: profileById.get(id)?.full_name ?? null,
    }));
  },

  async inviteMemberByEmail(boardId: string, email: string) {
    const normalized = email.trim().toLowerCase();
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('email', normalized)
      .single();

    if (pErr || !profile) {
      throw new Error('User not found. They may need to sign up first.');
    }

    const { error: mErr } = await supabase
      .from('board_members')
      .insert([{ board_id: boardId, user_id: profile.user_id, role: 'editor' }]);

    if (mErr) throw mErr;
  },

  async deleteBoard(boardId: string) {
    const { error: cardError } = await supabase
      .from('cards')
      .delete()
      .eq('board_id', boardId);
    if (cardError) throw cardError;

    const { error: columnError } = await supabase
      .from('columns')
      .delete()
      .eq('board_id', boardId);
    if (columnError) throw columnError;

    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId);
    if (error) throw error;
    await cacheService.invalidateBoardCache(boardId);
  },
};