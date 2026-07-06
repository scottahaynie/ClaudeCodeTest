interface GameOverOverlayProps {
  visible: boolean;
  title: string;
  message: string;
  onPlayAgain: () => void;
}

export function GameOverOverlay({ visible, title, message, onPlayAgain }: GameOverOverlayProps) {
  if (!visible) return null;

  return (
    <div className="overlay">
      <div className="overlay-panel">
        <h2>{title}</h2>
        <p>{message}</p>
        <button className="btn primary" onClick={onPlayAgain}>
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
