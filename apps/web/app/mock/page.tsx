// /mock screen index — links to all 14 screens rebuilt from agrisense-v2.html, replacing
// the standalone mock's dev "metanav" pill bar with real navigation for reviewers.
'use client';

import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { List, ListItem } from '@astryxdesign/core/List';
import { useT } from '../providers';
import { ModeLangToggle } from '../../components/ModeLangToggle';

const SCREENS = [
  { href: '/mock/login', labelKey: 'login_title' },
  { href: '/mock/farm', labelKey: 'farm_fields_heading' },
  { href: '/mock/onboarding', labelKey: 'onboarding_title' },
  { href: '/mock/planning', labelKey: 'crop_selection_title' },
  { href: '/mock/field/overview', labelKey: 'tab_overview' },
  { href: '/mock/field/plan', labelKey: 'tab_plan' },
  { href: '/mock/field/money', labelKey: 'tab_money' },
  { href: '/mock/field/trace', labelKey: 'trace_title' },
  { href: '/mock/field/replan', labelKey: 'replan_title' },
  { href: '/mock/checkout', labelKey: 'checkout_title' },
  { href: '/mock/scenario', labelKey: 'scenario_heading' },
  { href: '/mock/purchases', labelKey: 'purchases_title' },
  { href: '/mock/settings', labelKey: 'settings_title' },
  { href: '/mock/tokens', labelKey: 'tokens_title' },
] as const;

export default function MockIndexPage() {
  const { t } = useT();

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4}>
        <VStack gap={0}>
          <Text type="display-3">{t('mock_index_title')}</Text>
          <Text type="supporting" color="secondary">
            {t('mock_index_desc')}
          </Text>
        </VStack>
        <List hasDividers>
          {SCREENS.map((s, i) => (
            <ListItem key={s.href} label={`${String(i + 1).padStart(2, '0')} · ${t(s.labelKey)}`} href={s.href} />
          ))}
        </List>
      </VStack>
    </AppShell>
  );
}
