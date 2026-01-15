-- Allow owners and editors to manage board members
DROP POLICY IF EXISTS "Board owners can manage board members" ON public.board_members;

CREATE POLICY "Owners and editors can manage board members" ON public.board_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.boards b
    WHERE b.id = board_members.board_id
      AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.board_members bm
          WHERE bm.board_id = board_members.board_id
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'editor')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.boards b
    WHERE b.id = board_members.board_id
      AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.board_members bm
          WHERE bm.board_id = board_members.board_id
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'editor')
        )
      )
  )
);
