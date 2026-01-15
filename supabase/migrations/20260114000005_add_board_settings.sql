-- Add settings column to boards to store column colors and other preferences
ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Backfill existing rows with empty object where null
UPDATE public.boards SET settings = '{}'::jsonb WHERE settings IS NULL;
