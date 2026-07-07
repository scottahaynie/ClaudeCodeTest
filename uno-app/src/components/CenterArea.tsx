import { topDiscard } from '../game/deck';
import type { Color, GameState } from '../types/game';
import { Card } from './Card';

interface CenterAreaProps {
  state: GameState;
  drawDisabled: boolean;
  onDraw: () => void;
}

/** Renders the draw/discard piles, color indicator, and status message. */
export function CenterArea({ state, drawDisabled, onDraw }: CenterAreaProps) {
  const top = topDiscard(state.discard);

  return (
    <>
      <div className="center-area">
        <div className="pile-group">
          <div className="pile-label">DRAW</div>
          <div>
            {state.deck.length > 0 ? (
              <Card
                back
                pile="draw"
                playable={!drawDisabled}
                disabled={drawDisabled}
                ariaLabel="Draw a card"
                onClick={onDraw}
              />
            ) : (
              <div className="pile-label">EMPTY</div>
            )}
          </div>
        </div>
        <div className="pile-group">
          <div className="pile-label">COLOR</div>
          <div className={`color-indicator ${state.currentColor as Color}`} />
        </div>
        <div className="pile-group">
          <div className="pile-label">DISCARD</div>
          <div>{top ? <Card card={top} pile="discard" /> : null}</div>
        </div>
      </div>
      {state.unoGraceActive && <div className="status-bar">{state.statusMessage}</div>}
    </>
  );
}
