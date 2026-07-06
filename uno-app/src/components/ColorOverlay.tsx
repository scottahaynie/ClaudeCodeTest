import { COLORS } from '../game/constants';
import type { Color } from '../types/game';

interface ColorOverlayProps {
  visible: boolean;
  onPick: (color: Color) => void;
}

export function ColorOverlay({ visible, onPick }: ColorOverlayProps) {
  if (!visible) return null;

  return (
    <div className="overlay">
      <div className="overlay-panel">
        <h2>PICK COLOR</h2>
        <div className="color-picker">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`color-btn ${c}`}
              title={c}
              aria-label={c}
              onClick={() => onPick(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
