// Live left rail: farm name + each field expands into its own sub-pages (Overview/Chat/
// Plan/Money) — the nested "Farm > Field > Overview/Chat/..." pattern from stakeholder
// review (the /mock deck's MockRail was the reference for this exact structure; this is
// the real-data, real-route version).
'use client';

import { usePathname } from 'next/navigation';
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Sprout, Home, MessageCircle, CalendarDays, Wallet, Plus } from 'lucide-react';
import { useT } from '../app/providers';
import type { ApiField } from '../lib/api';

export function FieldRail({ farmName, fields, onAddField }: { farmName: string; fields: ApiField[]; onAddField?: () => void }) {
  const { t } = useT();
  const pathname = usePathname() ?? '';

  return (
    <SideNav header={<SideNavHeading heading={farmName} />} collapsible>
      <SideNavSection title={t('farm_fields_heading')}>
        {fields.map((f) => {
          const isActive = f.activeCycle != null;
          const isCurrent = pathname.startsWith(`/field/${f.id}/`);
          return (
            <SideNavItem
              key={f.id}
              label={f.name ?? t('field_unnamed')}
              icon={Sprout}
              isSelected={isCurrent}
              collapsible={{ defaultIsCollapsed: !isCurrent }}
              endContent={<StatusDot variant={isActive ? 'success' : 'neutral'} label={isActive ? t('field_status_active') : t('field_status_new')} />}
            >
              <SideNavItem label={t('tab_overview')} icon={Home} isSelected={pathname === `/field/${f.id}/overview`} href={`/field/${f.id}/overview`} />
              <SideNavItem label={t('field_chat_nav')} icon={MessageCircle} isSelected={pathname === `/field/${f.id}/chat`} href={`/field/${f.id}/chat`} />
              <SideNavItem label={t('field_season_plan_nav')} icon={CalendarDays} isSelected={pathname === `/field/${f.id}/plan`} href={`/field/${f.id}/plan`} />
              <SideNavItem label={t('field_finance_nav')} icon={Wallet} isSelected={pathname === `/field/${f.id}/money`} href={`/field/${f.id}/money`} />
            </SideNavItem>
          );
        })}
        {onAddField ? <SideNavItem label={t('add_field')} icon={Plus} onClick={onAddField} /> : null}
      </SideNavSection>
    </SideNav>
  );
}
