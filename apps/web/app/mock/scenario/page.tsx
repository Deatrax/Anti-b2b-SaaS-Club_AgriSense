// Screen 11/14 of the /mock deck rebuild — what-if simulation with a before/after diff.
// scenarioFinancials() in lib/mock-data.ts already IS this screen's data (a pure re-run of
// the financial engine under a cash-budget cut, diffed against the live plan) — this route
// lifts the diff-Table composition already built inline in app/field/[id]/page.tsx's money
// tab into its own full screen with chat framing.
'use client';

import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Table } from '@astryxdesign/core/Table';
import { ChatMessage, ChatMessageBubble, ChatToolCalls } from '@astryxdesign/core/Chat';
import { useT } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { bdt } from '../../../lib/format';
import { financials, scenarioFinancials } from '../../../lib/mock-data';

export default function MockScenarioPage() {
  const { t } = useT();
  const [scenarioRun, setScenarioRun] = useState(false);
  const scenario = scenarioFinancials();

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4}>
        <VStack gap={0}>
          <Text type="display-3">{t('scenario_heading')}</Text>
        </VStack>

        <Card padding={3}>
          <VStack gap={3}>
            <ChatMessage sender="user">
              <ChatMessageBubble variant="filled">{t('scenario_question')}</ChatMessageBubble>
            </ChatMessage>

            {!scenarioRun ? (
              <Button label={t('scenario_run')} variant="primary" onClick={() => setScenarioRun(true)} />
            ) : (
              <VStack gap={3}>
                <ChatToolCalls
                  calls={[
                    { key: 'recompute', name: 'recompute_financial_engine', node: 'deterministic', status: 'complete', duration: '42ms' },
                    { key: 'price', name: 'lookup_dam_price_snapshot', node: 'retrieval', status: 'complete', duration: '88ms' },
                    { key: 'diff', name: 'diff_against_live_plan', node: 'deterministic', status: 'complete', duration: '12ms' },
                  ]}
                  isExpanded
                />
                <Table
                  data={scenario.lineItems
                    .filter((l) => l.kind === 'cost')
                    .map((l) => {
                      const was = financials.lineItems.find((b) => b.id === l.id)?.total ?? l.total;
                      return { id: l.id, item: l.item, was: bdt(was), now: bdt(l.total) };
                    })
                    .concat([
                      { id: 'total', item: t('money_total_cost'), was: bdt(financials.totalCost), now: bdt(scenario.totalCost) },
                      { id: 'net', item: t('money_net_profit'), was: bdt(financials.netProfit), now: bdt(scenario.netProfit) },
                    ])}
                  idKey="id"
                  columns={[
                    { key: 'item', header: t('scenario_line') },
                    { key: 'was', header: t('scenario_was') },
                    { key: 'now', header: t('scenario_now') },
                  ]}
                />
                <Text type="supporting" color="secondary">
                  {t('scenario_note')}
                </Text>
                <Button label={t('scenario_reset')} variant="ghost" onClick={() => setScenarioRun(false)} />
              </VStack>
            )}
          </VStack>
        </Card>
      </VStack>
    </AppShell>
  );
}
