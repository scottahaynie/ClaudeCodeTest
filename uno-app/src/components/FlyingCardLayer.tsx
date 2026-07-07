import { useLayoutEffect, useState, type CSSProperties } from 'react';
import { CARD_MOTION_EASING, CARD_MOTION_MS } from '../constants/timing';
import type { CardMotion, DomRect } from '../types/animation';
import { getMotionRects } from '../utils/domRects';
import { Card } from './Card';

interface FlyingCardLayerProps {
  motion: CardMotion | null;
  onComplete: () => void;
}

/**
 * Resolves motion rectangles, preferring pre-captured values from the motion.
 */
function resolveRects(motion: CardMotion): { from: DomRect; to: DomRect } | null {
  return getMotionRects(motion);
}

/**
 * Renders a card animating between two screen positions.
 */
export function FlyingCardLayer({ motion, onComplete }: FlyingCardLayerProps) {
  const rects = motion ? resolveRects(motion) : null;
  const [animating, setAnimating] = useState(false);

  useLayoutEffect(() => {
    if (!motion) {
      setAnimating(false);
      return;
    }

    const resolved = resolveRects(motion);
    if (!resolved) {
      onComplete();
      return;
    }

    setAnimating(false);
    const startFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimating(true));
    });
    const timer = setTimeout(onComplete, CARD_MOTION_MS);

    return () => {
      cancelAnimationFrame(startFrame);
      clearTimeout(timer);
    };
  }, [motion, onComplete]);

  if (!motion || !rects) return null;

  const dx = rects.to.left - rects.from.left;
  const dy = rects.to.top - rects.from.top;

  return (
    <div className="flying-card-layer" aria-hidden>
      <div
        className={'flying-card' + (animating ? ' flying-card--active' : '')}
        style={{
          left: rects.from.left,
          top: rects.from.top,
          width: rects.from.width,
          height: rects.from.height,
          transition: `transform ${CARD_MOTION_MS}ms ${CARD_MOTION_EASING}`,
          '--fly-dx': `${dx}px`,
          '--fly-dy': `${dy}px`,
        } as CSSProperties}
      >
        {motion.faceDown ? <Card back /> : <Card card={motion.card} />}
      </div>
    </div>
  );
}
