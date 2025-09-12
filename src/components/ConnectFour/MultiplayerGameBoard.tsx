import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import GameCell from './GameCell';
import { checkWinner, getNextEmptyRow } from './gameLogic';

export type Player = 1 | 2 | null;
export type Board = Player[][];

interface Game {
  id: string;
  player1_id: string;
  player2_id: string | null;
  board_state: Board;
  current_turn: string | null;
  winner: string | null;
  winning_cells: [number, number][] | null;
  status: 'waiting' | 'playing' | 'finished';
}

interface MultiplayerGameBoardProps {
  gameId: string;
  onBackToLobby: () => void;
}

const MultiplayerGameBoard = ({ gameId, onBackToLobby }: MultiplayerGameBoardProps) => {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const isMyTurn = game && user && game.current_turn === user.id;
  const myPlayerNumber = game && user ? (game.player1_id === user.id ? 1 : 2) : null;

  useEffect(() => {
    const fetchGame = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (data && !error) {
        setGame({
          ...data,
          board_state: data.board_state as Board,
          winning_cells: data.winning_cells as [number, number][] | null,
          status: data.status as 'waiting' | 'playing' | 'finished'
        });
      } else if (error) {
        toast({
          title: "Error",
          description: "Failed to load game. Please try again.",
          variant: "destructive",
        });
        onBackToLobby();
      }
      setLoading(false);
    };

    fetchGame();

    // Subscribe to real-time game updates
    const channel = supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        const newGame = payload.new as any;
        setGame({
          ...newGame,
          board_state: newGame.board_state as Board,
          winning_cells: newGame.winning_cells as [number, number][] | null,
          status: newGame.status as 'waiting' | 'playing' | 'finished'
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, onBackToLobby, toast]);

  const dropDisc = useCallback(async (col: number) => {
    if (!game || !user || !isMyTurn || game.winner || game.status !== 'playing') return;

    const board = game.board_state;
    const row = getNextEmptyRow(board, col);
    
    if (row === -1) return;

    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = myPlayerNumber;

    const winResult = checkWinner(newBoard, row, col, myPlayerNumber);
    const nextTurn = game.player1_id === user.id ? game.player2_id : game.player1_id;

    const updateData: any = {
      board_state: newBoard,
      current_turn: winResult ? null : nextTurn,
    };

    if (winResult) {
      updateData.winner = user.id;
      updateData.winning_cells = winResult.cells;
      updateData.status = 'finished';
    }

    const { error } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to make move. Please try again.",
        variant: "destructive",
      });
    }
  }, [game, user, isMyTurn, myPlayerNumber, gameId, toast]);

  const resetGame = async () => {
    if (!game || !user) return;

    const emptyBoard = Array(6).fill(null).map(() => Array(7).fill(null));
    
    const { error } = await supabase
      .from('games')
      .update({
        board_state: emptyBoard,
        current_turn: game.player1_id,
        winner: null,
        winning_cells: null,
        status: 'playing'
      })
      .eq('id', gameId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reset game. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getPlayerName = (playerId: string) => {
    if (!game) return '';
    if (playerId === game.player1_id) return 'Player 1 (Red)';
    if (playerId === game.player2_id) return 'Player 2 (Yellow)';
    return '';
  };

  const isWinningCell = (rowIndex: number, colIndex: number) => {
    return game?.winning_cells?.some(([r, c]) => r === rowIndex && c === colIndex) || false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-2xl font-bold text-foreground">Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center">
        <p className="text-xl mb-4">Game not found</p>
        <Button onClick={onBackToLobby}>Back to Lobby</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
      {/* Back to Lobby Button */}
      <div className="self-start">
        <Button variant="outline" onClick={onBackToLobby}>
          ← Back to Lobby
        </Button>
      </div>

      {/* Game Status */}
      <Card className="p-6 w-full text-center bg-card shadow-card border-0">
        {game.status === 'waiting' ? (
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Waiting for Player 2...
            </h2>
            <p className="text-muted-foreground">
              Share this game with a friend or wait for someone to join!
            </p>
          </div>
        ) : game.winner ? (
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              🎉 {getPlayerName(game.winner)} Wins! 🎉
            </h2>
            <p className="text-muted-foreground">
              Congratulations on your victory!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {game.current_turn ? getPlayerName(game.current_turn) : 'Game in progress'}
            </h2>
            {isMyTurn && (
              <p className="text-green-600 font-semibold">It's your turn!</p>
            )}
            {!isMyTurn && game.current_turn && (
              <p className="text-muted-foreground">Waiting for opponent...</p>
            )}
          </div>
        )}
      </Card>

      {/* Game Board */}
      {game.status !== 'waiting' && (
        <Card className="p-8 bg-gradient-board shadow-card border-0">
          <div className="grid grid-cols-7 gap-3 p-4 rounded-2xl">
            {game.board_state.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <GameCell
                  key={`${rowIndex}-${colIndex}`}
                  player={cell}
                  onClick={() => dropDisc(colIndex)}
                  isWinning={isWinningCell(rowIndex, colIndex)}
                  disabled={!isMyTurn || !!game.winner}
                />
              ))
            )}
          </div>
        </Card>
      )}

      {/* Reset Button */}
      {game.winner && (game.player1_id === user?.id || game.player2_id === user?.id) && (
        <Button
          onClick={resetGame}
          className="px-8 py-4 text-lg font-bold bg-gradient-secondary hover:shadow-secondary transition-all duration-300 transform hover:scale-105 border-0"
          size="lg"
        >
          🔄 Play Again
        </Button>
      )}
    </div>
  );
};

export default MultiplayerGameBoard;