import { Player } from './GameBoard';

interface GameCellProps {
  player: Player;
  onClick: () => void;
  isWinning: boolean;
  disabled: boolean;
}

const GameCell = ({ player, onClick, isWinning, disabled }: GameCellProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-cell-empty
        transition-all duration-300 transform hover:scale-105
        ${disabled ? 'cursor-default' : 'cursor-pointer hover:shadow-lg'}
        ${isWinning ? 'animate-pulse shadow-glow-primary' : ''}
        ${!player ? 'bg-cell-empty hover:bg-accent/20' : ''}
        ${player === 1 ? 'bg-player-1 shadow-lg' : ''}
        ${player === 2 ? 'bg-player-2 shadow-lg' : ''}
      `}
      aria-label={
        player 
          ? `Cell occupied by ${player === 1 ? 'red' : 'yellow'} disc`
          : 'Empty cell - click to drop disc'
      }
    >
      {player && (
        <div className={`
          w-full h-full rounded-full
          ${player === 1 ? 'bg-player-1' : 'bg-player-2'}
          ${isWinning ? 'animate-bounce' : ''}
          transition-all duration-300
        `} />
      )}
    </button>
  );
};

export default GameCell;