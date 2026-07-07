import { useTheme, type ThemeId } from '../context/ThemeProvider';

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'retro', label: 'Retro' },
  { id: 'modern', label: 'Modern' },
  { id: 'john-pork', label: 'John Pork' },
];

/** Segmented control for switching between visual themes. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Visual theme">
      {THEMES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className="theme-toggle-btn"
          aria-pressed={theme === id}
          aria-label={`${label} theme`}
          onClick={() => setTheme(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
