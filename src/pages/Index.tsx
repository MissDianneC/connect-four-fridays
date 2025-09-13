import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LobbyScreen } from '@/components/Lobby/LobbyScreen';
import MultiplayerGameBoard from '@/components/ConnectFour/MultiplayerGameBoard';
import { supabase } from '@/integrations/supabase/client';
import { TournamentDashboard } from '@/components/Tournament/TournamentDashboard';


const Index = () => {
  const { user, signOut } = useAuth();
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [showGame, setShowGame] = useState(false);
  const [showTournaments, setShowTournaments] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      setIsAdmin(data.is_admin || false);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleStartGame = (gameId: string) => {
    setCurrentGameId(gameId);
    setShowGame(true);
    setShowTournaments(false);
  };

  const handleBackToLobby = () => {
    setShowGame(false);
    setCurrentGameId(null);
  };

  const handleShowTournaments = () => {
    setShowTournaments(true);
    setShowGame(false);
    setCurrentGameId(null);
  };

  const handleBackToMain = () => {
    setShowTournaments(false);
    setShowGame(false);
    setCurrentGameId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-2xl font-bold text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background py-8 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-between items-center mb-8">
            <div className="flex-1" />
            <div className="flex-1">
              <h1 className="text-5xl md:text-7xl font-black bg-gradient-primary bg-clip-text text-transparent mb-4">
                Connect Four Fridays 🎉
              </h1>
            </div>
            <div className="flex-1 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-2">
                  Welcome, {user?.email}!
                  {isAdmin && <span className="ml-2 px-2 py-1 bg-yellow-500 text-black text-xs rounded font-bold">ADMIN</span>}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium">
            {showGame 
              ? 'Drop discs and connect four in a row to win!' 
              : showTournaments 
                ? 'Manage tournaments for your live streams!'
                : 'Join the lobby to start playing with friends!'}
          </p>
        </div>

        {/* Navigation */}
        {!showGame && (
          <div className="flex justify-center gap-4 mb-8">
            <Button
              onClick={handleBackToMain}
              variant={!showTournaments ? "default" : "outline"}
              size="lg"
            >
              🎮 Casual Games
            </Button>
            {isAdmin && (
              <Button
                onClick={handleShowTournaments}
                variant={showTournaments ? "default" : "outline"}
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0"
              >
                🏆 Tournament Mode
              </Button>
            )}
          </div>
        )}

        {/* Main Content */}
        {showGame && currentGameId ? (
          <MultiplayerGameBoard 
            gameId={currentGameId} 
            onBackToLobby={handleBackToLobby}
          />
        ) : showTournaments ? (
          <div className="space-y-4">
            <div className="flex justify-start">
              <Button variant="outline" onClick={handleBackToMain}>
                ← Back to Main Menu
              </Button>
            </div>
            <TournamentDashboard />

          </div>
        ) : (
          <LobbyScreen onStartGame={handleStartGame} />
        )}

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            Built with ❤️ using React & TailwindCSS
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
