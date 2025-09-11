import { Board, Player } from './GameBoard';

export const getNextEmptyRow = (board: Board, col: number): number => {
  for (let row = board.length - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      return row;
    }
  }
  return -1;
};

export const checkWinner = (
  board: Board, 
  row: number, 
  col: number, 
  player: Player
): { winner: Player; cells: [number, number][] } | null => {
  if (!player) return null;

  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal /
    [1, -1],  // diagonal \
  ];

  for (const [deltaRow, deltaCol] of directions) {
    const cells: [number, number][] = [[row, col]];
    
    // Check in positive direction
    let r = row + deltaRow;
    let c = col + deltaCol;
    while (
      r >= 0 && r < board.length && 
      c >= 0 && c < board[0].length && 
      board[r][c] === player
    ) {
      cells.push([r, c]);
      r += deltaRow;
      c += deltaCol;
    }

    // Check in negative direction
    r = row - deltaRow;
    c = col - deltaCol;
    while (
      r >= 0 && r < board.length && 
      c >= 0 && c < board[0].length && 
      board[r][c] === player
    ) {
      cells.push([r, c]);
      r -= deltaRow;
      c -= deltaCol;
    }

    if (cells.length >= 4) {
      return { winner: player, cells };
    }
  }

  return null;
};