import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface OpenGame {
  id: string;
  player1_id: string;
  status: string;
  created_at: string;
  player1_profile?: {
    username: string | null;
  };
}

interface OpenGamesProps {
  onJoinGame: (gameId: string) => void;
}

export const OpenGames = ({ onJoinGame }: OpenGamesProps) => {
  const [openGames, setOpenGames] = useState<OpenGame[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Early exit if no user
    if (!user) {
      setLoading(false);
      setOpenGames([]);
      return;
    }

    const fetchOpenGames = async () => {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id,
          player1_id,
          status,
          created_at,
          profiles:player1_id (username)
        `)
        .eq('status', 'waiting')
        .is('player2_id', null)        // No player 2 yet (public game)
        .neq('player1_id', user.id)    // Not my own game
        .order('created_at', { ascending: false });

      if (data && !error) {
        setOpenGames(data.map(game => ({
          ...game,
          player1_profile: game.profiles as any
        })));
      }
      setLoading(false);
    };

    fetchOpenGames();

    // Subscribe to new open games
    const channel = supabase
      .channel('open-games-list')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'games',
        filter: `status=eq.waiting`
      }, () => {
        fetchOpenGames();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games'
      }, () => {
        fetchOpenGames();
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
        title: "Joined game!",
        description: "Let the game begin!",
      });
    }
  };

  // Show loading state while user is being loaded
  if (!user) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Loading...</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Loading open games...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Open Games</h3>
          <Badge variant="secondary">{openGames.length} available</Badge>
        </div>
        
        {openGames.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No open games. Create one or wait for others to start games!
          </p>
        ) : (
          <div className="space-y-3">
            {openGames.map((game) => (
              <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                <div className="space-y-1">
                  <p className="font-medium">
                    {game.player1_profile?.username || 'Anonymous'}'s Game
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Waiting for Player 2
                  </p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => handleJoinGame(game.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
