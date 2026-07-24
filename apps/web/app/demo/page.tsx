// Forced 3-column projector route. Raw Astryx components only, no wrapper components —
// colors + mock data pass over the neutral scaffold. Distinct structure from the field
// workspace: fixed three regions, not the same pattern stretched wide. Content follows
// Docs/AgriSense_Wireframe.html's /demo split view (phone product + trace, extended with
// an evidence column per the original inventory doc's "chat · trace · evidence" concept).
//
// Same lib/mock-data.ts as the field workspace — the trace column is literally the traces
// from initialFeed, so nothing here can drift from what the workspace itself shows.
'use client';

import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Layout, LayoutPanel, LayoutContent } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { useT } from '../providers';
import { ModeLangToggle } from '../../components/ModeLangToggle';
import { bdt, percent } from '../../lib/format';
import { fieldState, cropCycle, financials, initialFeed, farm } from '../../lib/mock-data';

const traceRows = initialFeed.filter((item) => item.type === 'tool_trace').flatMap((item) => item.traces);

export default function DemoPage() {
  const { identity } = fieldState;
  const { t, tf } = useT();

  return (
    <AppShell height="fill" contentPadding={0} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <Layout
        start={
          <LayoutPanel width={280}>
            <VStack gap={2} padding={3}>
              <Text type="label" weight="semibold">
                {identity.name}
              </Text>
              <MetadataList>
                <MetadataListItem label={t('nav_field')}>
                  {farm.district} · AEZ {farm.aez}
                </MetadataListItem>
                <MetadataListItem label={t('identity_area')}>
                  {identity.areaHa} {t('unit_hectare')}
                </MetadataListItem>
                <MetadataListItem label={t('identity_crop')}>
                  {cropCycle.crop} · {cropCycle.stage ? t(`stage_${cropCycle.stage}`) : ''}
                  {cropCycle.dayIndex != null ? `, ${tf('day_progress', { n: cropCycle.dayIndex })}` : ''}
                </MetadataListItem>
              </MetadataList>
            </VStack>
          </LayoutPanel>
        }
        content={
          <LayoutContent>
            <VStack gap={3} padding={3}>
              <Text type="label" weight="semibold">
                {t('money_net_profit')}
              </Text>
              <Card variant="green">
                <VStack gap={1}>
                  <Text type="label" color="secondary">
                    {t('money_net_profit')}
                  </Text>
                  <Text type="display-2" weight="semibold">
                    {bdt(financials.netProfit)}
                  </Text>
                  <HStack gap={2} wrap="wrap">
                    <MetadataList orientation="horizontal" columns="multi">
                      <MetadataListItem label={t('money_roi')}>{percent(financials.roi)}</MetadataListItem>
                      <MetadataListItem label={t('money_bcr')}>{financials.bcr.toFixed(2)}</MetadataListItem>
                    </MetadataList>
                  </HStack>
                </VStack>
              </Card>
            </VStack>
          </LayoutContent>
        }
        end={
          <LayoutPanel width={280}>
            <VStack gap={2} padding={3}>
              <Text type="label" weight="semibold">
                {t('why_label')} — trace
              </Text>
              <List hasDividers>
                {traceRows.map((row) => (
                  <ListItem
                    key={row.id}
                    label={row.tool}
                    description={row.source ?? undefined}
                    endContent={<Text type="supporting">{row.durationMs != null ? `${row.durationMs}ms` : ''}</Text>}
                  />
                ))}
              </List>
            </VStack>
          </LayoutPanel>
        }
      />
    </AppShell>
  );
}
