// Left rail nav shared by the /mock screen deck. Per stakeholder feedback (screenshot
// review, 2026-07-24): the active field expands into its own sub-pages in the rail
// (Overview / Chat / Season Plan / Finance) via SideNavItem's native collapsible+children
// support, instead of a flat field-only list — matching the "AgriSense > North Field >
// Fields/Overview/..." nested pattern shown in review. The read-only South Field stays a
// flat, disabled leaf (no sub-pages for a harvested, read-only cycle).
'use client';

import { usePathname } from 'next/navigation';
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Sprout, Home, MessageCircle, CalendarDays, Wallet, Receipt, Settings as SettingsIcon } from 'lucide-react';
import { useT } from '../../app/providers';
import { farm, fieldList } from '../../lib/mock-data';

export function MockRail() {
  const { t } = useT();
  const pathname = usePathname() ?? '';
  const isFieldRoute = pathname.startsWith('/mock/field/');

  const activeField = fieldList.find((f) => !f.isReadOnly);
  const readOnlyFields = fieldList.filter((f) => f.isReadOnly);

  return (
    <SideNav header={<SideNavHeading heading={farm.name} />} collapsible>
      <SideNavSection title={t('farm_fields_heading')}>
        {activeField ? (
          <SideNavItem
            label={activeField.name}
            icon={Sprout}
            isSelected={isFieldRoute}
            collapsible={{ defaultIsCollapsed: false }}
            endContent={<StatusDot variant="success" label={t('field_status_active')} />}
          >
            <SideNavItem label={t('tab_overview')} icon={Home} isSelected={pathname === '/mock/field/overview'} href="/mock/field/overview" />
            <SideNavItem label={t('field_chat_nav')} icon={MessageCircle} isSelected={pathname === '/mock/field/chat'} href="/mock/field/chat" />
            <SideNavItem label={t('field_season_plan_nav')} icon={CalendarDays} isSelected={pathname === '/mock/field/plan'} href="/mock/field/plan" />
            <SideNavItem label={t('field_finance_nav')} icon={Wallet} isSelected={pathname === '/mock/field/money'} href="/mock/field/money" />
          </SideNavItem>
        ) : null}
        {readOnlyFields.map((f) => (
          <SideNavItem key={f.id} label={f.name} icon={Sprout} isDisabled endContent={<StatusDot variant="neutral" label={t('field_status_harvested')} />} />
        ))}
      </SideNavSection>
      <SideNavSection title="" isHeaderHidden>
        <SideNavItem label={t('purchases_title')} icon={Receipt} isSelected={pathname === '/mock/purchases'} href="/mock/purchases" />
        <SideNavItem label={t('settings_title')} icon={SettingsIcon} isSelected={pathname === '/mock/settings'} href="/mock/settings" />
      </SideNavSection>
    </SideNav>
  );
}
