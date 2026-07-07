import type { Color } from '../types/game';

export const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];

export const ACTION_LABELS: Record<string, string> = {
  skip: 'SKIP',
  reverse: 'REV',
  draw2: '+2',
  wild: 'W',
  wild4: '+4',
};

