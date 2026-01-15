-- Simplify RLS to avoid recursion by reusing can_manage_board helper
-- Assumes function public.can_manage_board(target_board uuid) already exists

-- Columns
DROP POLICY IF EXISTS "Users can view columns of boards they access" ON public.columns;
DROP POLICY IF EXISTS "Users can manage columns of boards they edit" ON public.columns;

CREATE POLICY "Users can view columns" ON public.columns FOR SELECT
USING (public.can_manage_board(columns.board_id));

CREATE POLICY "Users can manage columns" ON public.columns FOR ALL
USING (public.can_manage_board(columns.board_id))
WITH CHECK (public.can_manage_board(columns.board_id));

-- Cards
DROP POLICY IF EXISTS "Users can view cards of boards they access" ON public.cards;
DROP POLICY IF EXISTS "Users can manage cards of boards they edit" ON public.cards;

CREATE POLICY "Users can view cards" ON public.cards FOR SELECT
USING (public.can_manage_board(cards.board_id));

CREATE POLICY "Users can manage cards" ON public.cards FOR ALL
USING (public.can_manage_board(cards.board_id))
WITH CHECK (public.can_manage_board(cards.board_id));
