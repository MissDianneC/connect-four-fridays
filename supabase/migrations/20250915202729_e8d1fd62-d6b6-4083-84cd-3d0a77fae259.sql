-- Add policy to allow viewing open public games
CREATE POLICY "Anyone can view open public games" 
ON public.games 
FOR SELECT 
USING (status = 'waiting' AND player2_id IS NULL);