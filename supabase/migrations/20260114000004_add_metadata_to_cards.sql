-- Add metadata column to cards to match API payload
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Optional: default empty object for new rows
ALTER TABLE public.cards
ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
