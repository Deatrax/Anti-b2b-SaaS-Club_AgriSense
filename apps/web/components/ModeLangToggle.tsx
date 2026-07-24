// Language (bn/en) + theme (light/dark) toggle. Dropped into every AppShell's
// topNav endContent slot (see app/*/page.tsx) so it's available everywhere without
// duplicating state — both live in app/providers.tsx.
'use client';

import { useRouter } from 'next/navigation';
import { Sun, Moon, LogOut } from 'lucide-react';
import { HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { useLang, useThemeMode, useSession, useT } from '../app/providers';

export function ModeLangToggle() {
  const router = useRouter();
  const { t } = useT();
  const { lang, toggleLang } = useLang();
  const { mode, toggleMode } = useThemeMode();
  const { session, setSession } = useSession();

  function handleLogout() {
    setSession(null);
    router.push('/');
  }

  return (
    <HStack gap={1.5} vAlign="center">
      <Button
        label={lang === 'bn' ? 'EN' : 'বাং'}
        variant="ghost"
        size="sm"
        onClick={toggleLang}
        tooltip={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
      />
      <IconButton
        icon={<Icon icon={mode === 'light' ? Moon : Sun} size="sm" />}
        label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        tooltip={mode === 'light' ? 'Dark mode' : 'Light mode'}
        variant="ghost"
        size="sm"
        onClick={toggleMode}
      />
      {session ? (
        <IconButton
          icon={<Icon icon={LogOut} size="sm" />}
          label={t('logout_action')}
          tooltip={t('logout_action')}
          variant="ghost"
          size="sm"
          onClick={handleLogout}
        />
      ) : null}
    </HStack>
  );
}
