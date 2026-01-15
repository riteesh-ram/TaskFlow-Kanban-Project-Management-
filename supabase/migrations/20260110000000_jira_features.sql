-- Add metadata column to cards table for Jira-like features
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create card_comments table for comments functionality
CREATE TABLE IF NOT EXISTS public.card_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on card_comments
ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for card_comments
CREATE POLICY "Users can view comments on cards they can access" ON public.card_comments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_comments.card_id 
    AND (
      EXISTS (
        SELECT 1 FROM public.boards 
        WHERE boards.id = cards.board_id 
        AND (
          boards.owner_id = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM public.board_members 
            WHERE board_members.board_id = boards.id 
            AND board_members.user_id = auth.uid()
          )
        )
      )
    )
  )
);

CREATE POLICY "Users can add comments to cards they can access" ON public.card_comments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_comments.card_id 
    AND (
      EXISTS (
        SELECT 1 FROM public.boards 
        WHERE boards.id = cards.board_id 
        AND (
          boards.owner_id = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM public.board_members 
            WHERE board_members.board_id = boards.id 
            AND board_members.user_id = auth.uid()
          )
        )
      )
    )
  )
  AND auth.uid() = user_id
);

CREATE POLICY "Users can update their own comments" ON public.card_comments FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.card_comments FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_card_comments_updated_at 
  BEFORE UPDATE ON public.card_comments 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for card_comments
ALTER TABLE public.card_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_comments;

-- Create card_watchers table for watching cards
CREATE TABLE IF NOT EXISTS public.card_watchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);

-- Enable RLS on card_watchers
ALTER TABLE public.card_watchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for card_watchers
CREATE POLICY "Users can view watchers on cards they can access" ON public.card_watchers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_watchers.card_id 
    AND (
      EXISTS (
        SELECT 1 FROM public.boards 
        WHERE boards.id = cards.board_id 
        AND (
          boards.owner_id = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM public.board_members 
            WHERE board_members.board_id = boards.id 
            AND board_members.user_id = auth.uid()
          )
        )
      )
    )
  )
);

CREATE POLICY "Users can watch/unwatch cards" ON public.card_watchers FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for card_watchers
ALTER TABLE public.card_watchers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_watchers;

-- Create sprints table
CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sprints
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sprints
CREATE POLICY "Users can view sprints of boards they access" ON public.sprints FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.boards 
    WHERE boards.id = sprints.board_id 
    AND (
      boards.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.board_members 
        WHERE board_members.board_id = boards.id 
        AND board_members.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Board editors can manage sprints" ON public.sprints FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.boards 
    WHERE boards.id = sprints.board_id 
    AND (
      boards.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.board_members 
        WHERE board_members.board_id = boards.id 
        AND board_members.user_id = auth.uid() 
        AND board_members.role IN ('owner', 'editor')
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.boards 
    WHERE boards.id = sprints.board_id 
    AND (
      boards.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.board_members 
        WHERE board_members.board_id = boards.id 
        AND board_members.user_id = auth.uid() 
        AND board_members.role IN ('owner', 'editor')
      )
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_sprints_updated_at 
  BEFORE UPDATE ON public.sprints 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for sprints
ALTER TABLE public.sprints REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprints;

-- Add sprint_id to cards table
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cards_sprint_id ON public.cards(sprint_id);
CREATE INDEX IF NOT EXISTS idx_cards_metadata ON public.cards USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_card_comments_card_id ON public.card_comments(card_id);
CREATE INDEX IF NOT EXISTS idx_card_watchers_card_id ON public.card_watchers(card_id);

ALTER TABLE public.boards 
ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;