// Screen 12/14 of the /mock deck rebuild — transaction history. Same postedTransactions()
// source and Table composition as app/purchases/page.tsx (untouched); this route adds the
// rail nav the mock has and the existing page doesn't, plus a link into the Checkout demo.
'use client';

import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Table } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useT } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { MockRail } from '../../../components/mock/MockRail';
import { bdt, shortDate } from '../../../lib/format';
import { postedTransactions } from '../../../lib/mock-data';

export default function MockPurchasesPage() {
  const { t, lang } = useT();
  const transactions = postedTransactions();

  return (
    <AppShell height="fill" contentPadding={4} sideNav={<MockRail />} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4}>
        <HStack justify="between" vAlign="center">
          <VStack gap={0}>
            <Text type="display-3">{t('purchases_title')}</Text>
            <Text type="supporting" color="secondary">
              {t('purchases_desc')}
            </Text>
          </VStack>
          <Button label={t('checkout_title')} variant="secondary" href="/mock/checkout" />
        </HStack>

        {transactions.length === 0 ? (
          <EmptyState title={t('purchases_empty')} />
        ) : (
          <Table
            data={transactions.map((tx) => ({
              id: tx.id,
              date: tx.occurredOn ? shortDate(tx.occurredOn, lang) : t('not_set'),
              item: tx.item,
              mode: <Badge variant="neutral" label={t('mode_posted')} />,
              amount: bdt(tx.total),
            }))}
            idKey="id"
            columns={[
              { key: 'date', header: t('table_date') },
              { key: 'item', header: t('table_item') },
              { key: 'mode', header: t('table_mode') },
              { key: 'amount', header: t('table_amount') },
            ]}
          />
        )}
      </VStack>
    </AppShell>
  );
}
