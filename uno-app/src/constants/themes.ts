import type { ThemeId } from '../context/ThemeProvider';

/** CPU opponent label shown in the UI for each visual theme. */
export const CPU_DISPLAY_NAMES: Record<ThemeId, string> = {
  retro: 'CPU',
  modern: 'CPU',
  'john-pork': 'John Pork',
};

/** Returns the themed display name for the CPU opponent. */
export function getCpuDisplayName(theme: ThemeId): string {
  return CPU_DISPLAY_NAMES[theme];
}

/** Swaps the generic CPU label in game messages for the themed opponent name. */
export function localizeCpuMessage(message: string, cpuName: string): string {
  if (cpuName === 'CPU') return message;
  return message.replace(/\bCPU\b/g, cpuName);
}
