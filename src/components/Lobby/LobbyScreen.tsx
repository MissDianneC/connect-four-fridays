import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UsersList } from './UsersList';
import { GameInvites } from './GameInvites';

interface LobbyScreenProps {
  onStartGame: (gameId: string) => void;
}

export const LobbyScreen = ({ onStartGame }: LobbyScreenProps) => {
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const createNewGame = async () => {
    if (!user) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('games')
      .insert({
        player1_id: user.id,
        current_turn: user.id, // Player 1 starts as red
        status: 'waiting'
      })
      .select()
      .single();

    setCreating(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create game. Please try again.",
        variant: "destructive",
      });
    } else if (data) {
      onStartGame(data.id);
      toast({
        title: "Game created!",
        description: "Waiting for another player to join...",
      });
    }
  };

  const handleInviteUser = async (userId: string, username: string) => {
    if (!user) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('games')
      .insert({
        player1_id: user.id,
        current_turn: user.id,
        status: 'waiting'
      })
      .select()
      .single();

    setCreating(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create game invitation. Please try again.",
        variant: "destructive",
      });
    } else if (data) {
      onStartGame(data.id);
      toast({
        title: "Game created!",
        description: `Game invitation sent to ${username}. Waiting for them to join...`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Game Lobby</h2>
        <p className="text-muted-foreground mb-4">
          Create a new game, join an existing one, or invite friends to play!
        </p>
        <Button 
          onClick={createNewGame}
          disabled={creating}
          size="lg"
          className="bg-gradient-primary hover:shadow-primary"
        >
          {creating ? 'Creating...' : '🎮 Create New Game'}
        </Button>
      </Card>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsersList onInviteUser={handleInviteUser} />
        <GameInvites onJoinGame={onStartGame} />
      </div>
    </div>
  );
};