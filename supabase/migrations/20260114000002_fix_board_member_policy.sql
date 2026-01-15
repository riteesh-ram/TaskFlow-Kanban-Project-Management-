-- Fix infinite recursion in board_members policy by using a SECURITY DEFINER helper
DROP POLICY IF EXISTS "Owners and editors can manage board members" ON public.board_members;

CREATE OR REPLACE FUNCTION public.can_manage_board(target_board uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.boards b
    WHERE b.id = target_board
      AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.board_members bm
          WHERE bm.board_id = target_board
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'editor')
        )
      )
  );
$$;

CREATE POLICY "Owners and editors can manage board members" ON public.board_members FOR ALL
USING (public.can_manage_board(board_members.board_id))
WITH CHECK (public.can_manage_board(board_members.board_id));
