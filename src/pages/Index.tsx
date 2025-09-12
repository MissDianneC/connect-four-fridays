import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LobbyScreen } from '@/components/Lobby/LobbyScreen';
import MultiplayerGameBoard from '@/components/ConnectFour/MultiplayerGameBoard';

const Index = () => {
  const { user, signOut } = useAuth();
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [showGame, setShowGame] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleStartGame = (gameId: string) => {
    setCurrentGameId(gameId);
    setShowGame(true);
  };

  const handleBackToLobby = () => {
    setShowGame(false);
    setCurrentGameId(null);
  };

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
            {showGame ? 'Drop discs and connect four in a row to win!' : 'Join the lobby to start playing with friends!'}
          </p>
        </div>

        {/* Main Content */}
        {showGame && currentGameId ? (
          <MultiplayerGameBoard 
            gameId={currentGameId} 
            onBackToLobby={handleBackToLobby}
          />
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
