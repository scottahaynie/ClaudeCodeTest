/** Duration of card fly animations (draw pile ↔ hand, hand → discard). */
export const CARD_MOTION_MS = 1000;

/** Easing curve for card fly animations. */
export const CARD_MOTION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Delay before the CPU plays after its turn begins. */
export const CPU_TURN_DELAY_MS = 3000;

/** Window for the human player to call UNO before penalty. */
export const UNO_GRACE_MS = 5000;

/** Whole seconds in the UNO grace window (derived from {@link UNO_GRACE_MS}). */
export const UNO_GRACE_SECONDS = UNO_GRACE_MS / 1000;

/**
 * Status line shown while the human player may call UNO before a penalty.
 */
export function unoGraceStatusMessage(secondsRemaining: number): string {
  const seconds = Math.max(0, Math.ceil(secondsRemaining));
  return `Call UNO! You have ${seconds} second${seconds === 1 ? '' : 's'}.`;
}
