// Overview/Plan/Money/Trace pill row shared across the five /mock/field/* screens.
// Each screen is a real route (not tab state on one page, see the plan's route-tree
// rationale), so Tab's native href mode makes this real navigation for free.
'use client';

import { TabList, Tab } from '@astryxdesign/core/TabList';
import { useT } from '../../app/providers';

export type FieldTabKey = 'overview' | 'plan' | 'money' | 'trace';

export function FieldTabsNav({ active }: { active: FieldTabKey }) {
  const { t } = useT();

  return (
    <TabList value={active} onChange={() => {}} hasDivider>
      <Tab value="overview" label={t('tab_overview')} href="/mock/field/overview" />
      <Tab value="plan" label={t('tab_plan')} href="/mock/field/plan" />
      <Tab value="money" label={t('tab_money')} href="/mock/field/money" />
      <Tab value="trace" label={t('tab_trace')} href="/mock/field/trace" />
    </TabList>
  );
}
