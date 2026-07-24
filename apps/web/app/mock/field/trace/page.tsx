// Screen 08/14 of the /mock deck rebuild — full agent trace audit. ChatToolCalls already
// is the "collapsible trace-step card" pattern the mock needs (each row expands its own
// resultDetail independently) — no new component required. isExpanded keeps every row
// visible up front, matching the mock's flat, always-open trace list.
'use client';

import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/Stack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Banner } from '@astryxdesign/core/Banner';
import { List, ListItem } from '@astryxdesign/core/List';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import type { ToolClass } from '@agrisense/shared';
import { useT } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { MockRail } from '../../../../components/mock/MockRail';
import { SeasonStageStrip } from '../../../../components/mock/SeasonStageStrip';
import { FieldTabsNav } from '../../../../components/mock/FieldTabsNav';
import { FeedTrace } from '../../../../components/mock/FeedChat';
import { fieldState, initialFeed, approveChargeFeedItems, type FeedItem } from '../../../../lib/mock-data';

const TRACE_CLASSES: ToolClass[] = ['field', 'external', 'retrieval', 'deterministic', 'gated'];

const TCLASS_STATUS_VARIANT: Record<ToolClass, 'success' | 'accent' | 'neutral' | 'warning'> = {
  field: 'success',
  external: 'accent',
  retrieval: 'neutral',
  deterministic: 'accent',
  gated: 'warning',
};

export default function MockFieldTracePage() {
  const { t } = useT();
  const { identity } = fieldState;

  const traceItems = [...initialFeed, ...approveChargeFeedItems('trace-demo')].filter(
    (item): item is Extract<FeedItem, { type: 'tool_trace' }> => item.type === 'tool_trace',
  );
  const allTraces = traceItems.flatMap((item) => item.traces);
  const classCounts = allTraces.reduce<Record<string, number>>((acc, tr) => {
    acc[tr.toolClass] = (acc[tr.toolClass] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppShell height="fill" contentPadding={4} sideNav={<MockRail />} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={3}>
        <Text type="display-3">{identity.name}</Text>
        <SeasonStageStrip compact />
        <FieldTabsNav active="trace" />

        <VStack gap={0}>
          <Text type="display-3">{t('trace_title')}</Text>
          <Text type="supporting" color="secondary">
            {t('trace_desc')}
          </Text>
        </VStack>

        <Card padding={3}>
          <FeedTrace traces={allTraces} isExpanded />
        </Card>

        <Grid columns={{ minWidth: 240 }} gap={3}>
          <Card padding={3}>
            <VStack gap={2}>
              <Text type="label" weight="semibold">
                {t('trace_rows_heading')}
              </Text>
              <MetadataList orientation="horizontal" columns="multi">
                <MetadataListItem label={t('trace_total_calls')}>{allTraces.length}</MetadataListItem>
                {TRACE_CLASSES.map((cls) => (
                  <MetadataListItem key={cls} label={t(`trace_class_${cls}`)}>
                    {classCounts[cls] ?? 0}
                  </MetadataListItem>
                ))}
              </MetadataList>
              <Banner status="success" title={t('trace_zero_headline')} description={t('trace_zero_desc')} />
            </VStack>
          </Card>
          <Card padding={3}>
            <VStack gap={2}>
              <Text type="label" weight="semibold">
                {t('trace_legend_heading')}
              </Text>
              <List hasDividers>
                {TRACE_CLASSES.map((cls) => (
                  <ListItem key={cls} label={t(`trace_class_${cls}`)} startContent={<StatusDot variant={TCLASS_STATUS_VARIANT[cls]} label={cls} />} />
                ))}
              </List>
            </VStack>
          </Card>
        </Grid>
      </VStack>
    </AppShell>
  );
}
