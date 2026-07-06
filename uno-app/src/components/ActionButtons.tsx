interface ActionButtonsProps {
  drawDisabled: boolean;
  canPass: boolean;
  unoDisabled: boolean;
  unoPulse: boolean;
  onDraw: () => void;
  onPass: () => void;
  onUno: () => void;
  onNewGame: () => void;
}

export function ActionButtons({
  drawDisabled,
  canPass,
  unoDisabled,
  unoPulse,
  onDraw,
  onPass,
  onUno,
  onNewGame,
}: ActionButtonsProps) {
  return (
    <div className="actions">
      <button className="btn primary" disabled={drawDisabled} onClick={onDraw}>
        DRAW
      </button>
      {canPass && (
        <button className="btn" onClick={onPass}>
          PASS
        </button>
      )}
      <button
        className={'btn uno' + (unoPulse ? ' pulse' : '')}
        disabled={unoDisabled}
        onClick={onUno}
      >
        UNO!
      </button>
      <button className="btn" onClick={onNewGame}>
        NEW GAME
      </button>
    </div>
  );
}
