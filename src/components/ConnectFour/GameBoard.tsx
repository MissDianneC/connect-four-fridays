import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import GameCell from './GameCell';
import { checkWinner, getNextEmptyRow } from './gameLogic';

export type Player = 1 | 2 | null;
export type Board = Player[][];

const GameBoard = () => {
  const ROWS = 6;
  const COLS = 7;

  const [board, setBoard] = useState<Board>(() => 
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<Player>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);

  const resetGame = useCallback(() => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setCurrentPlayer(1);
    setWinner(null);
    setWinningCells([]);
  }, []);

  const dropDisc = useCallback((col: number) => {
    if (winner || board[0][col] !== null) return;

    const row = getNextEmptyRow(board, col);
    if (row === -1) return;

    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    const winResult = checkWinner(newBoard, row, col, currentPlayer);
    if (winResult) {
      setWinner(currentPlayer);
      setWinningCells(winResult.cells);
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  }, [board, currentPlayer, winner]);

  const getPlayerName = (player: 1 | 2) => player === 1 ? 'Player 1' : 'Player 2';
  const getPlayerColor = (player: 1 | 2) => player === 1 ? 'Red' : 'Yellow';

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
      {/* Game Status */}
      <Card className="p-6 w-full text-center bg-card shadow-card border-0">
        {winner ? (
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              🎉 {getPlayerName(winner)} ({getPlayerColor(winner)}) Wins! 🎉
            </h2>
            <p className="text-muted-foreground">
              Congratulations on your victory!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Current Turn: {getPlayerName(currentPlayer)}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-6 h-6 rounded-full ${
                currentPlayer === 1 ? 'bg-player-1' : 'bg-player-2'
              }`} />
              <span className="text-muted-foreground">
                {getPlayerColor(currentPlayer)} disc
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Game Board */}
      <Card className="p-8 bg-gradient-board shadow-card border-0">
        <div className="grid grid-cols-7 gap-3 p-4 rounded-2xl">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <GameCell
                key={`${rowIndex}-${colIndex}`}
                player={cell}
                onClick={() => dropDisc(colIndex)}
                isWinning={winningCells.some(([r, c]) => r === rowIndex && c === colIndex)}
                disabled={!!winner}
              />
            ))
          )}
        </div>
      </Card>

      {/* Reset Button */}
      <Button
        onClick={resetGame}
        className="px-8 py-4 text-lg font-bold bg-gradient-secondary hover:shadow-secondary transition-all duration-300 transform hover:scale-105 border-0"
        size="lg"
      >
        🔄 Reset Game
      </Button>
    </div>
  );
};

export default GameBoard;