import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  username: string | null;
  is_online: boolean;
  last_seen: string;
}

interface PublicGame {
  id: string;
  player1_id: string;
  created_at: string;
  profiles: {
    username: string | null;
  };
}

interface UsersListProps {
  onInviteUser: (userId: string, username: string) => void;
  onJoinGame: (gameId: string) => void;
}

export const UsersList = ({ onInviteUser, onJoinGame }: UsersListProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [publicGames, setPublicGames] = useState<PublicGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningGame, setJoiningGame] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch online users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_online', true)
        .order('username');

      if (profilesData && !profilesError) {
        setProfiles(profilesData);
      }

      // Fetch public games waiting for players
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          id,
          player1_id,
          created_at,
          profiles:player1_id (username)
        `)
        .eq('status', 'waiting')
        .is('player2_id', null)
        .neq('player1_id', user?.id || '')
        .order('created_at', { ascending: false });

      if (gamesData && !gamesError) {
        setPublicGames(gamesData.map(game => ({
          ...game,
          profiles: game.profiles as any
        })));
      }

      setLoading(false);
    };

    fetchData();

    // Subscribe to real-time updates
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, fetchData)
      .subscribe();

    const gamesChannel = supabase
      .channel('public-games-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games'
      }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(gamesChannel);
    };
  }, [user?.id]);

  const handleJoinPublicGame = async (gameId: string) => {
    if (!user) return;

    setJoiningGame(gameId);

    const { error } = await supabase
      .from('games')
      .update({
        player2_id: user.id,
        status: 'playing'
      })
      .eq('id', gameId)
      .eq('status', 'waiting')
      .is('player2_id', null);

    setJoiningGame(null);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to join game. It may have been taken by another player.",
        variant: "destructive",
      });
    } else {
      onJoinGame(gameId);
      toast({
        title: "Game joined!",
        description: "Let the game begin!",
      });
    }
  };

  const onlineUsers = profiles.filter(profile => 
    profile.is_online && profile.id !== user?.id
  );

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Loading players and games...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Tabs defaultValue="public-games" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="public-games">
            Public Games ({publicGames.length})
          </TabsTrigger>
          <TabsTrigger value="online-players">
            Online Players ({onlineUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="public-games" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Available Games</h3>
            <Badge variant="secondary">{publicGames.length} waiting</Badge>
          </div>
          
          {publicGames.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No public games available. Create one or check back later!
            </p>
          ) : (
            <div className="space-y-3">
              {publicGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {game.profiles?.username || 'Anonymous'}'s Game
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(game.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleJoinPublicGame(game.id)}
                    disabled={joiningGame === game.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {joiningGame === game.id ? 'Joining...' : 'Join Game'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="online-players" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Online Players</h3>
            <Badge variant="secondary">{onlineUsers.length} online</Badge>
          </div>
          
          {onlineUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No other players online. Invite some friends to play!
            </p>
          ) : (
            <div className="space-y-3">
              {onlineUsers.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{profile.username || 'Anonymous'}</span>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => onInviteUser(profile.id, profile.username || 'Anonymous')}
                  >
                    Send Invite
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
