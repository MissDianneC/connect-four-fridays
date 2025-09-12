import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface GameInvite {
  id: string;
  player1_id: string;
  status: string;
  player1_profile?: {
    username: string | null;
  };
}

interface GameInvitesProps {
  onJoinGame: (gameId: string) => void;
}

export const GameInvites = ({ onJoinGame }: GameInvitesProps) => {
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchGameInvites = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('games')
        .select(`
          id,
          player1_id,
          status,
          profiles:player1_id (username)
        `)
        .eq('status', 'waiting')
        .neq('player1_id', user.id);

      if (data && !error) {
        setInvites(data.map(game => ({
          ...game,
          player1_profile: game.profiles as any
        })));
      }
      setLoading(false);
    };

    fetchGameInvites();

    // Subscribe to real-time updates for games
    const channel = supabase
      .channel('games-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games'
      }, () => {
        fetchGameInvites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleJoinGame = async (gameId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('games')
      .update({
        player2_id: user.id,
        current_turn: user.id, // Player 2 starts as yellow (second player)
        status: 'playing'
      })
      .eq('id', gameId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to join game. Please try again.",
        variant: "destructive",
      });
    } else {
      onJoinGame(gameId);
      toast({
        title: "Game joined!",
        description: "You've joined the game as Player 2 (Yellow).",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Loading game invites...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Open Games</h3>
          <Badge variant="secondary">{invites.length} available</Badge>
        </div>
        
        {invites.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No open games available. Create one or wait for invitations!
          </p>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">
                    Game by {invite.player1_profile?.username || 'Anonymous'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Waiting for Player 2
                  </p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => handleJoinGame(invite.id)}
                >
                  Join Game
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};