import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  username: string | null;
  is_online: boolean;
  last_seen: string;
}

interface UsersListProps {
  onInviteUser: (userId: string, username: string) => void;
}

export const UsersList = ({ onInviteUser }: UsersListProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_online', true)
        .order('username');

      if (data && !error) {
        setProfiles(data);
      }
      setLoading(false);
    };

    fetchOnlineUsers();

    // Subscribe to real-time updates for profiles
    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        fetchOnlineUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onlineUsers = profiles.filter(profile => 
    profile.is_online && profile.id !== user?.id
  );

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Loading online users...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
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
                  Invite to Game
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};