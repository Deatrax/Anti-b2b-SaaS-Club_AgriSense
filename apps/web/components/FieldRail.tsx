// Live left rail: farm identity header, recent chats (one per field's Tier-0 conversation,
// §3.4 — not separate threads), a field-picker dropdown driving the active field's 4
// sub-pages, and account/purchases links below a divider.
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Selector } from '@astryxdesign/core/Selector';
import { Divider } from '@astryxdesign/core/Divider';
import { Wheat, Home, MessageCircle, CalendarDays, Wallet, Plus, Settings, Building2, MessagesSquare, Receipt } from 'lucide-react';
import { useT, useSession } from '../app/providers';
import { createField, type ApiField, type ApiRecentChat } from '../lib/api';

const SUB_PAGES = ['overview', 'chat', 'plan', 'money'] as const;

export function FieldRail({
  farmName,
  farmDistrict,
  farmAez,
  fields,
  activeFieldId,
  recentChats,
  onAddField,
}: {
  farmName: string;
  farmDistrict?: string | null;
  farmAez?: number | null;
  fields: ApiField[];
  /** The field whose 4 sub-pages the dropdown should show. Defaults to the first field
   * when the current page isn't itself a field page (e.g. the farm list, settings). */
  activeFieldId?: string;
  /** One entry per field's single conversation, most-recently-active first (already sorted
   * and capped by the caller — this just renders up to 5). */
  recentChats?: ApiRecentChat[];
  onAddField?: () => void;
}) {
  const { t } = useT();
  const { session } = useSession();
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const subPageMatch = pathname.match(/^\/field\/[^/]+\/([a-z]+)/)?.[1];
  const subPage = (SUB_PAGES as readonly string[]).includes(subPageMatch ?? '') ? subPageMatch! : 'overview';

  const selectedField = fields.find((f) => f.id === activeFieldId) ?? fields[0];

  function handleFieldChange(fieldId: string) {
    router.push(`/field/${fieldId}/${subPage}`);
  }

  /** "New chat" = a fresh field, since Tier 0 is one conversation per field (§3.4) — there's
   * no separate "chat thread" concept to create. */
  function handleNewChat() {
    if (!session?.farmId) return;
    createField(session.farmId)
      .then(({ field }) => router.push(`/field/${field.id}/chat`))
      .catch(() => {});
  }

  const subheading = farmDistrict ? [farmDistrict, farmAez != null ? `AEZ ${farmAez}` : null].filter(Boolean).join(' · ') : undefined;

  return (
    <SideNav
      header={<SideNavHeading icon={<Wheat />} heading={farmName} subheading={subheading} />}
      footer={<SideNavItem label={t('settings_title')} icon={Settings} isSelected={pathname === '/settings'} href="/settings" />}
      collapsible
    >
      <SideNavSection title="" isHeaderHidden>
        <SideNavItem label={t('farm_profile_title')} icon={Building2} isSelected={pathname === '/farm/profile'} href="/farm/profile" />
      </SideNavSection>

      <SideNavSection title={t('recent_chats_heading')}>
        <SideNavItem label={t('new_chat')} icon={Plus} onClick={handleNewChat} />
        {(recentChats ?? []).slice(0, 5).map((c) => (
          <SideNavItem
            key={c.conversationId}
            label={c.fieldName ?? t('field_unnamed')}
            icon={MessageCircle}
            isSelected={pathname === `/field/${c.fieldId}/chat`}
            href={`/field/${c.fieldId}/chat`}
          />
        ))}
        {recentChats && recentChats.length > 0 ? (
          <SideNavItem label={t('all_chats')} icon={MessagesSquare} isSelected={pathname === '/farm/chats'} href="/farm/chats" />
        ) : null}
      </SideNavSection>

      <SideNavSection title={t('farm_fields_heading')}>
        {selectedField ? (
          <>
            <Selector
              label={t('farm_fields_heading')}
              isLabelHidden
              size="sm"
              width="100%"
              options={fields.map((f) => ({ value: f.id, label: f.name ?? t('field_unnamed') }))}
              value={selectedField.id}
              onChange={handleFieldChange}
            />
            <SideNavItem label={t('tab_overview')} icon={Home} isSelected={pathname === `/field/${selectedField.id}/overview`} href={`/field/${selectedField.id}/overview`} />
            <SideNavItem label={t('field_chat_nav')} icon={MessageCircle} isSelected={pathname === `/field/${selectedField.id}/chat`} href={`/field/${selectedField.id}/chat`} />
            <SideNavItem
              label={t('field_season_plan_nav')}
              icon={CalendarDays}
              isSelected={pathname === `/field/${selectedField.id}/plan`}
              href={`/field/${selectedField.id}/plan`}
            />
            <SideNavItem label={t('field_finance_nav')} icon={Wallet} isSelected={pathname === `/field/${selectedField.id}/money`} href={`/field/${selectedField.id}/money`} />
          </>
        ) : null}
        {onAddField ? <SideNavItem label={t('add_field')} icon={Plus} onClick={onAddField} /> : null}
      </SideNavSection>

      <Divider />

      <SideNavSection title="" isHeaderHidden>
        <SideNavItem label={t('purchases_title')} icon={Receipt} isSelected={pathname === '/purchases'} href="/purchases" />
      </SideNavSection>
    </SideNav>
  );
}
