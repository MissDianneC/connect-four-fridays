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
  player2_id: string;
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
          player2_id,
          status,
          profiles:player1_id (username)
        `)
        .eq('status', 'waiting')
        .eq('player2_id', user.id);

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

  const handleAcceptInvite = async (gameId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('games')
      .update({
        status: 'playing'
      })
      .eq('id', gameId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to accept invite. Please try again.",
        variant: "destructive",
      });
    } else {
      onJoinGame(gameId);
      toast({
        title: "Game started!",
        description: "Let the game begin!",
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
          <h3 className="text-lg font-semibold">Game Invites</h3>
          <Badge variant="secondary">{invites.length} pending</Badge>
        </div>
        
        {invites.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No pending invites. Wait for friends to invite you to games!
          </p>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                <div className="space-y-1">
                  <p className="font-medium">
                    {invite.player1_profile?.username || 'Anonymous'} invited you!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Waiting for your response
                  </p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => handleAcceptInvite(invite.id)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Accept Invite
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};