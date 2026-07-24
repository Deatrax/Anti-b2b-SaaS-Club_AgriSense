// All chats — every field's conversation (Tier 0: one conversation per field, §3.4),
// paginated. Reachable from FieldRail's "All chats" link under Recent chats.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { List, ListItem } from '@astryxdesign/core/List';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Banner } from '@astryxdesign/core/Banner';
import { useT, useSession } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { FieldRail } from '../../../components/FieldRail';
import { listFields, listRecentChats, type ApiField, type ApiRecentChat } from '../../../lib/api';

const PAGE_SIZE = 10;

export default function AllChatsPage() {
  const router = useRouter();
  const { t } = useT();
  const { session, isHydrated } = useSession();

  const [fields, setFields] = useState<ApiField[]>([]);
  const [chats, setChats] = useState<ApiRecentChat[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!session) {
      router.push('/');
      return;
    }
    if (!session.farmId) {
      router.push('/farm');
      return;
    }
    listFields(session.farmId)
      .then((res) => setFields(res.fields))
      .catch(() => {});
    listRecentChats(session.farmId, PAGE_SIZE, (page - 1) * PAGE_SIZE)
      .then((res) => {
        setChats(res.chats);
        setTotal(res.total);
      })
      .catch((err) => setError(String(err)));
  }, [isHydrated, session, router, page]);

  if (!isHydrated || !session) return null;

  return (
    <AppShell
      height="fill"
      contentPadding={4}
      sideNav={<FieldRail farmName={session.farmName ?? ''} farmDistrict={session.farmDistrict} farmAez={session.farmAez} fields={fields} recentChats={chats ?? undefined} />}
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      <VStack gap={4} width={640}>
        <Text type="display-3">{t('all_chats')}</Text>

        {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}

        <Card padding={0}>
          {!chats ? (
            <VStack gap={0}>
              <Skeleton height={60} />
              <Skeleton height={60} />
              <Skeleton height={60} />
            </VStack>
          ) : chats.length === 0 ? (
            <VStack gap={2} padding={3}>
              <Text type="supporting" color="secondary">
                {t('log_none_yet')}
              </Text>
            </VStack>
          ) : (
            <List hasDividers>
              {chats.map((c) => (
                <ListItem
                  key={c.conversationId}
                  label={c.fieldName ?? t('field_unnamed')}
                  description={c.lastMessage.content}
                  href={`/field/${c.fieldId}/chat`}
                  endContent={<Timestamp value={c.lastMessage.createdAt} format="relative" />}
                />
              ))}
            </List>
          )}
        </Card>

        {total > PAGE_SIZE ? <Pagination page={page} onChange={setPage} totalItems={total} pageSize={PAGE_SIZE} variant="compact" /> : null}
      </VStack>
    </AppShell>
  );
}
