interface ActionButtonsProps {
  canPass: boolean;
  unoDisabled: boolean;
  unoPulse: boolean;
  onPass: () => void;
  onUno: () => void;
  onNewGame: () => void;
}

/** Bottom action bar for pass, UNO, and new game controls. */
export function ActionButtons({
  canPass,
  unoDisabled,
  unoPulse,
  onPass,
  onUno,
  onNewGame,
}: ActionButtonsProps) {
  return (
    <div className="actions">
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
