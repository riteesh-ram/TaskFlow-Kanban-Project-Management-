-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create boards table
CREATE TABLE public.boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- Create columns table
CREATE TABLE public.columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on columns
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;

-- Create cards table
CREATE TABLE public.cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  labels TEXT[],
  due_date TIMESTAMP WITH TIME ZONE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Create audit_logs table for tracking changes
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create board_members table for access control
CREATE TABLE public.board_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- Enable RLS on board_members
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for boards
CREATE POLICY "Users can view boards they are members of" ON public.boards FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.board_members WHERE board_id = boards.id AND user_id = auth.uid())
);

CREATE POLICY "Users can create boards" ON public.boards FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Board owners can update their boards" ON public.boards FOR UPDATE 
USING (
  owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.board_members WHERE board_id = boards.id AND user_id = auth.uid() AND role IN ('owner', 'editor'))
);

CREATE POLICY "Board owners can delete their boards" ON public.boards FOR DELETE 
USING (owner_id = auth.uid());

-- RLS Policies for columns
CREATE POLICY "Users can view columns of boards they access" ON public.columns FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND 
    (boards.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid())))
);

CREATE POLICY "Users can manage columns of boards they edit" ON public.columns FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND 
    (boards.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid() AND board_members.role IN ('owner', 'editor'))))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND 
    (boards.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid() AND board_members.role IN ('owner', 'editor'))))
);

-- RLS Policies for cards
CREATE POLICY "Users can view cards of boards they access" ON public.cards FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.boards WHERE boards.id = cards.board_id AND 
    (boards.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid())))
);

CREATE POLICY "Users can manage cards of boards they edit" ON public.cards FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.boards WHERE boards.id = cards.board_id AND 
    (boards.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid() AND board_members.role IN ('owner', 'editor'))))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.boards WHERE boards.id = cards.board_id AND 
    (boards.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid() AND board_members.role IN ('owner', 'editor'))))
);

-- RLS Policies for board_members
CREATE POLICY "Users can view board members of boards they access" ON public.board_members FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.boards WHERE boards.id = board_members.board_id AND 
    (boards.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.board_members bm WHERE bm.board_id = boards.id AND bm.user_id = auth.uid())))
);

CREATE POLICY "Board owners can manage board members" ON public.board_members FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.boards WHERE boards.id = board_members.board_id AND boards.owner_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.boards WHERE boards.id = board_members.board_id AND boards.owner_id = auth.uid())
);

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs of boards they access" ON public.audit_logs FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.boards WHERE boards.id = audit_logs.board_id AND 
    (boards.owner_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid())))
);

CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Function to automatically create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON public.columns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.boards REPLICA IDENTITY FULL;
ALTER TABLE public.columns REPLICA IDENTITY FULL;
ALTER TABLE public.cards REPLICA IDENTITY FULL;
ALTER TABLE public.board_members REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.columns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;