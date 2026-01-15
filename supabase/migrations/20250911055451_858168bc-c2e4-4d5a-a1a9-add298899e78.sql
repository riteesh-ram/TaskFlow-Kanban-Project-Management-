-- Fix infinite recursion in board_members policies
DROP POLICY IF EXISTS "Users can view board members of boards they access" ON board_members;
DROP POLICY IF EXISTS "Users can view board members of boards they have access to" ON board_members;
DROP POLICY IF EXISTS "Board owners can manage board members" ON board_members;
DROP POLICY IF EXISTS "Board owners can manage members" ON board_members;

-- Create corrected policies for board_members
CREATE POLICY "Users can view board members of boards they have access to" 
ON board_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM boards 
    WHERE boards.id = board_members.board_id 
    AND boards.owner_id = auth.uid()
  ) 
  OR 
  user_id = auth.uid()
);

CREATE POLICY "Board owners can manage members" 
ON board_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM boards 
    WHERE boards.id = board_members.board_id 
    AND boards.owner_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM boards 
    WHERE boards.id = board_members.board_id 
    AND boards.owner_id = auth.uid()
  )
);

-- Also fix boards policy to avoid recursion
DROP POLICY IF EXISTS "Users can view boards they are members of" ON boards;
DROP POLICY IF EXISTS "Users can view their boards or boards they are members of" ON boards;
CREATE POLICY "Users can view their boards or boards they are members of" 
ON boards 
FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR 
  id IN (
    SELECT board_id FROM board_members 
    WHERE user_id = auth.uid()
  )
);

-- Fix boards update policy
DROP POLICY IF EXISTS "Board owners can update their boards" ON boards;
DROP POLICY IF EXISTS "Authorized users can update boards" ON boards;
CREATE POLICY "Authorized users can update boards" 
ON boards 
FOR UPDATE 
USING (
  owner_id = auth.uid() 
  OR 
  id IN (
    SELECT board_id FROM board_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'editor')
  )
);