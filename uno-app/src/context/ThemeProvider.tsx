import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setSoundTheme } from '../audio/sounds';
import { getCpuDisplayName } from '../constants/themes';

const STORAGE_KEY = 'uno-theme';

/** Available visual themes for the UNO app. */
export type ThemeId = 'retro' | 'modern' | 'john-pork';

const VALID_THEMES: ThemeId[] = ['retro', 'modern', 'john-pork'];

interface ThemeContextValue {
  theme: ThemeId;
  cpuDisplayName: string;
  setTheme: (theme: ThemeId) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Reads a persisted theme id from localStorage, falling back to retro. */
function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_THEMES.includes(stored as ThemeId)) {
      return stored as ThemeId;
    }
  } catch {
    /* localStorage unavailable */
  }
  return 'retro';
}

/** Applies the theme id to the document root element. */
function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
}

interface ThemeProviderProps {
  children: ReactNode;
}

/** Provides theme state and syncs it to the document root and localStorage. */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const initial = readStoredTheme();
    applyTheme(initial);
    setSoundTheme(initial);
    return initial;
  });

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const index = VALID_THEMES.indexOf(current);
      return VALID_THEMES[(index + 1) % VALID_THEMES.length];
    });
  }, []);

  useEffect(() => {
    applyTheme(theme);
    setSoundTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage unavailable */
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      cpuDisplayName: getCpuDisplayName(theme),
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Returns the current theme context; throws if used outside ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
