// Forced 3-column projector route. Raw Astryx components only, no wrapper components —
// colors + mockup data pass over the neutral scaffold. Distinct structure from the field
// workspace: fixed three regions, not the same pattern stretched wide. Content follows
// Docs/AgriSense_Wireframe.html's /demo split view (phone product + trace, extended with
// an evidence column per the original inventory doc's "chat · trace · evidence" concept).
import { AppShell } from '@astryxdesign/core/AppShell';
import { Layout, LayoutPanel, LayoutContent } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';

const TRACE_ROWS = [
  { tool: 'get_farm_profile', duration: '12ms' },
  { tool: 'get_weather', duration: '412ms' },
  { tool: 'search_knowledge_base', duration: '186ms' },
  { tool: 'rank_crops', duration: '3ms' },
  { tool: 'compute_financials', duration: '2ms' },
  { tool: 'bdapps_direct_debit', duration: '640ms' },
];

export default function DemoPage() {
  return (
    <AppShell height="fill" contentPadding={0}>
      <Layout
        start={
          <LayoutPanel width={280}>
            <VStack gap={2} padding={3}>
              <Text type="label" weight="semibold">
                Farm at a glance
              </Text>
              <MetadataList>
                <MetadataListItem label="District">Gazipur · AEZ 28</MetadataListItem>
                <MetadataListItem label="Area">0.49 ha</MetadataListItem>
                <MetadataListItem label="Crop · stage">Boro rice · Tillering, day 32</MetadataListItem>
              </MetadataList>
            </VStack>
          </LayoutPanel>
        }
        content={
          <LayoutContent>
            <VStack gap={3} padding={3}>
              <Text type="label" weight="semibold">
                Net result
              </Text>
              <Card variant="green">
                <VStack gap={1}>
                  <Text type="label" color="secondary">
                    Net profit
                  </Text>
                  <Text type="display-2" weight="semibold">
                    ৳27,540
                  </Text>
                  <HStack gap={2} wrap="wrap">
                    <MetadataList orientation="horizontal" columns="multi">
                      <MetadataListItem label="ROI">65%</MetadataListItem>
                      <MetadataListItem label="BCR">1.65</MetadataListItem>
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
                Agent trace
              </Text>
              <List hasDividers>
                {TRACE_ROWS.map((row) => (
                  <ListItem key={row.tool} label={row.tool} endContent={<Text type="supporting">{row.duration}</Text>} />
                ))}
              </List>
            </VStack>
          </LayoutPanel>
        }
      />
    </AppShell>
  );
}
