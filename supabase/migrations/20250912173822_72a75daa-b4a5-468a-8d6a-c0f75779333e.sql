-- Create games table for multiplayer Connect Four
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  board_state JSONB NOT NULL DEFAULT '[[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null]]',
  current_turn UUID DEFAULT NULL,
  winner UUID DEFAULT NULL,
  winning_cells JSONB DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Create policies for games access
CREATE POLICY "Players can view their games" 
ON public.games 
FOR SELECT 
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Players can create games"
ON public.games 
FOR INSERT 
WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update their games"
ON public.games 
FOR UPDATE 
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Enable realtime for games table
ALTER TABLE public.games REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;