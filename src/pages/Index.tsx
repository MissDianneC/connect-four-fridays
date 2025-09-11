import GameBoard from '@/components/ConnectFour/GameBoard';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-background py-8 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black bg-gradient-primary bg-clip-text text-transparent mb-4">
            Connect Four Fridays 🎉
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium">
            Drop discs and connect four in a row to win!
          </p>
        </div>

        {/* Game Board */}
        <GameBoard />

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
