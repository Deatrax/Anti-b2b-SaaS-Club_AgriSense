// app/providers.tsx — language + theme-mode state, global for every route.
//
// Both preferences persist to localStorage and default from a sensible baseline
// (lang: 'bn' per §B.5 Bengali-first; theme: OS `prefers-color-scheme`). Reading
// localStorage happens in an effect (post-mount), not during render, so the
// server-rendered and first client-rendered output always match — no hydration
// mismatch, just a one-time repaint once the stored preference is known.
'use client';

import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { farmesyTheme } from '../theme/farmesy';
import { t as tRaw, tf as tfRaw, type Lang } from '../lib/i18n';

type ThemeModePref = 'light' | 'dark';

const LANG_STORAGE_KEY = 'agrisense-lang';
const THEME_STORAGE_KEY = 'agrisense-theme-mode';
const SESSION_STORAGE_KEY = 'agrisense-session';

/** No cookie/token system on the backend (phone as plain identifier, no OTP — §A.3) —
 * the session is just "who is logged in" + "which farm is active," held client-side. */
export interface Session {
  userId: string;
  phone: string;
  name: string | null;
  farmId: string | null;
  farmName: string | null;
}

interface SessionContextValue {
  session: Session | null;
  setSession: (session: Session | null) => void;
  setFarmId: (farmId: string | null) => void;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  setSession: () => {},
  setFarmId: () => {},
});

export function useSession(): SessionContextValue {
  return use(SessionContext);
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

interface ThemeModeContextValue {
  mode: ThemeModePref;
  toggleMode: () => void;
}

const LangContext = createContext<LangContextValue>({
  lang: 'bn',
  setLang: () => {},
  toggleLang: () => {},
});

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  toggleMode: () => {},
});

export function useLang(): LangContextValue {
  return use(LangContext);
}

export function useThemeMode(): ThemeModeContextValue {
  return use(ThemeModeContext);
}

/** t()/tf() bound to the current language — use instead of importing t/tf directly. */
export function useT(): { lang: Lang; t: (key: string) => string; tf: (key: string, vars: Record<string, string | number>) => string } {
  const { lang } = useLang();
  return {
    lang,
    t: (key: string) => tRaw(key, lang),
    tf: (key: string, vars: Record<string, string | number>) => tfRaw(key, vars, lang),
  };
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('bn');
  const [mode, setMode] = useState<ThemeModePref>('light');
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => {
    const storedLang = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (storedLang === 'en' || storedLang === 'bn') setLangState(storedLang);

    const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedMode === 'light' || storedMode === 'dark') {
      setMode(storedMode);
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    }

    const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSession) {
      try {
        setSessionState(JSON.parse(storedSession) as Session);
      } catch {
        // ignore malformed stored session
      }
    }
  }, []);

  function setSession(next: Session | null) {
    setSessionState(next);
    if (next) window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  function setFarmId(farmId: string | null) {
    setSessionState((s) => {
      if (!s) return s;
      const next = { ...s, farmId };
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function setLang(next: Lang) {
    setLangState(next);
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  }

  function toggleLang() {
    setLang(lang === 'bn' ? 'en' : 'bn');
  }

  function toggleMode() {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <LangContext value={{ lang, setLang, toggleLang }}>
      <ThemeModeContext value={{ mode, toggleMode }}>
        <SessionContext value={{ session, setSession, setFarmId }}>
          <Theme theme={farmesyTheme} mode={mode}>
            <div className="app-canvas">{children}</div>
          </Theme>
        </SessionContext>
      </ThemeModeContext>
    </LangContext>
  );
}
