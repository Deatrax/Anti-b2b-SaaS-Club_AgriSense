// Field workspace. Raw Astryx components only, no wrapper components — colors +
// mockup data pass over the neutral scaffold. Every component used here comes
// from Docs/inventory_import.md; content follows the canonical demo narrative in
// Docs/AgriSense_Wireframe.html (Karim · Gazipur · Boro rice · BRRI dhan89).
'use client';

import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { Divider } from '@astryxdesign/core/Divider';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Item } from '@astryxdesign/core/Item';
import { Icon } from '@astryxdesign/core/Icon';
import { Badge } from '@astryxdesign/core/Badge';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Banner } from '@astryxdesign/core/Banner';
import { List, ListItem } from '@astryxdesign/core/List';
import { Citation } from '@astryxdesign/core/Citation';
import { Popover } from '@astryxdesign/core/Popover';
import { Button } from '@astryxdesign/core/Button';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Table } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import {
  ChatLayout,
  ChatMessageList,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageMetadata,
  ChatToolCalls,
  ChatComposer,
  ChatSendButton,
} from '@astryxdesign/core/Chat';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { EmptyState } from '@astryxdesign/core/EmptyState';

type WorkspaceTab = 'overview' | 'plan' | 'money';

const STAGES = ['Land prep', 'Transplanting', 'Basal fertilizer', 'Tillering', 'Panicle', 'Pest scouting', 'Harvest'];
const CURRENT_STAGE_INDEX = 3;

interface PlanRow extends Record<string, unknown> {
  id: string;
  label: string;
  date: string;
  status: string;
}
const PLAN_ROWS: PlanRow[] = [
  { id: '1', label: 'Land prep & puddling', date: 'Dec 20 – Dec 28', status: 'Done' },
  { id: '2', label: 'Transplanting', date: 'Dec 29 – Jan 5', status: 'Done' },
  { id: '3', label: 'Basal fertilizer (TSP/MoP)', date: 'Jan 4', status: 'Done' },
  { id: '4', label: 'Tillering · N top-dress 1', date: 'was Mar 24 → Mar 28 (+4d rain)', status: 'Current' },
  { id: '5', label: 'N top-dress 2 · panicle', date: 'Apr 12 – Apr 15', status: 'Pending' },
  { id: '6', label: 'Pest scouting checkpoint', date: 'Apr 20', status: 'Pending' },
  { id: '7', label: 'Harvest', date: 'May 8 – May 18', status: 'Pending' },
];

interface FinanceRow extends Record<string, unknown> {
  id: string;
  item: string;
  detail: string;
  amount: string;
}
const FINANCE_ROWS: FinanceRow[] = [
  { id: '1', item: 'Total cost', detail: '', amount: '৳42,300' },
  { id: '2', item: 'Expected yield', detail: '4.95 t/ha × 0.49 ha × 0.80 weather adj', amount: '1.94 t' },
  { id: '3', item: 'Gross revenue', detail: '@ ৳36/kg govt procurement', amount: '৳69,840' },
];

interface BasketRow extends Record<string, unknown> {
  id: string;
  item: string;
  amount: string;
}
const BASKET_ROWS: BasketRow[] = [
  { id: '1', item: 'Urea · 45 kg @ ৳27', amount: '৳1,215' },
  { id: '2', item: 'TSP · 22 kg @ ৳27', amount: '৳594' },
  { id: '3', item: 'Subsidy applied', amount: '− ৳569' },
];

export default function FieldWorkspace({ params }: { params: { id: string } }) {
  void params;

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [quickReply, setQuickReply] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState('');
  const [logAmount, setLogAmount] = useState<number | null>(null);

  return (
    <AppShell
      height="fill"
      contentPadding={0}
      sideNav={
        <SideNav header={<SideNavHeading heading="AgriSense AI" />}>
          <SideNavSection title="Fields">
            <SideNavItem label="North field" isSelected href="#" />
            <SideNavItem label="South field" href="#" />
          </SideNavSection>
        </SideNav>
      }
    >
      <VStack height="100%" gap={0}>
        <StackItem>
          <VStack gap={3} padding={3}>
            <HStack justify="between" vAlign="center">
              <MetadataList orientation="horizontal" columns="multi" title="North field">
                <MetadataListItem label="District">Gazipur · AEZ 28</MetadataListItem>
                <MetadataListItem label="Soil">Loam</MetadataListItem>
                <MetadataListItem label="Water source">Shallow tubewell</MetadataListItem>
                <MetadataListItem label="Area">0.49 ha (1.2 bigha)</MetadataListItem>
              </MetadataList>
              <Button label="Details" variant="secondary" onClick={() => setIsDetailsOpen(true)} />
            </HStack>

            <HStack gap={2} vAlign="center" wrap="wrap">
              {STAGES.map((stage, i) => (
                <HStack key={stage} gap={1.5} vAlign="center">
                  {i > 0 ? <Divider orientation="vertical" /> : null}
                  <StatusDot
                    variant={i < CURRENT_STAGE_INDEX ? 'success' : i === CURRENT_STAGE_INDEX ? 'accent' : 'neutral'}
                    label={stage}
                    isPulsing={i === CURRENT_STAGE_INDEX}
                  />
                  <Text type="supporting">{stage}</Text>
                </HStack>
              ))}
            </HStack>

            <TabList value={activeTab} onChange={(v) => setActiveTab(v as WorkspaceTab)} hasDivider>
              <Tab value="overview" label="Overview" />
              <Tab value="plan" label="Plan" />
              <Tab value="money" label="Money" />
            </TabList>

            {activeTab === 'overview' ? (
              <Grid columns={{ minWidth: 280 }} gap={3}>
                <Card>
                  <VStack gap={2}>
                    <HStack gap={1.5} vAlign="center">
                      <Icon icon="calendar" color="accent" />
                      <Text type="label" weight="semibold">
                        Next steps
                      </Text>
                    </HStack>
                    <Item
                      label="N top-dress 2 · panicle"
                      description="In 15 days"
                      endContent={
                        <HStack gap={1.5} vAlign="center">
                          <Badge variant="yellow" label="Next" />
                          <Popover
                            label="Why?"
                            className={undefined}
                            style={undefined}
                            content={
                              <VStack padding={3} width={260}>
                                <Text type="supporting">
                                  Nitrogen split 2 of 3, per BRRI dhan89's fertilizer recommendation guide (BARC FRG-2018). Timed to
                                  panicle initiation.
                                </Text>
                              </VStack>
                            }
                          >
                            <Button label="Why?" variant="ghost" size="sm" />
                          </Popover>
                        </HStack>
                      }
                    />
                    <Item label="Pest scouting checkpoint" description="In 23 days" />
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={2}>
                    <HStack justify="between" vAlign="center">
                      <Text type="label" weight="semibold">
                        Crop stage
                      </Text>
                      <Badge variant="green" label="Tillering" />
                    </HStack>
                    <Text type="supporting" color="secondary">
                      Boro rice · BRRI dhan89
                    </Text>
                    <ProgressBar
                      label="Crop stage"
                      isLabelHidden
                      value={32}
                      max={150}
                      variant="success"
                      hasValueLabel
                      formatValueLabel={() => 'Day 32'}
                    />
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      Weather
                    </Text>
                    <MetadataList orientation="horizontal" columns="multi">
                      <MetadataListItem label="Temp">18–29°C</MetadataListItem>
                      <MetadataListItem label="Rain (14d)">41.2mm</MetadataListItem>
                      <MetadataListItem label="ET₀">3.2mm/d</MetadataListItem>
                    </MetadataList>
                    <Citation source={{ title: 'Open-Meteo (ECMWF)' }} number={1} />
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      Risk
                    </Text>
                    <Banner status="warning" title="Brown planthopper" description="Elevated risk during tillering" />
                    <Collapsible trigger={<Text type="supporting">More detail</Text>}>
                      <List>
                        <ListItem label="Prevention" description="Keep field drainage; avoid excess nitrogen." />
                        <ListItem label="Treatment" description="Apply recommended insecticide if threshold exceeded." />
                      </List>
                    </Collapsible>
                  </VStack>
                </Card>
              </Grid>
            ) : activeTab === 'plan' ? (
              <Table
                data={PLAN_ROWS}
                idKey="id"
                columns={[
                  { key: 'label', header: 'Stage' },
                  { key: 'date', header: 'Date' },
                  { key: 'status', header: 'Status' },
                ]}
              />
            ) : (
              <VStack gap={4}>
                <Table
                  data={FINANCE_ROWS}
                  idKey="id"
                  columns={[
                    { key: 'item', header: 'Item' },
                    { key: 'detail', header: 'Detail' },
                    { key: 'amount', header: 'Amount' },
                  ]}
                />

                <Card variant="green" padding={3}>
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
                        <MetadataListItem label="Break-even">1.18 t</MetadataListItem>
                      </MetadataList>
                    </HStack>
                  </VStack>
                </Card>

                <Card variant="yellow" padding={3}>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      Agent proposes a charge
                    </Text>
                    <Text type="supporting">
                      Charge ৳1,240 to 017XXXXXXXX for the fertilizer basket.
                    </Text>
                    <List hasDividers>
                      {BASKET_ROWS.map((row) => (
                        <ListItem key={row.id} label={row.item} endContent={<Text type="supporting">{row.amount}</Text>} />
                      ))}
                    </List>
                    <Button label="Approve ৳1,240 charge" variant="primary" onClick={() => setIsApproveOpen(true)} />
                  </VStack>
                </Card>
              </VStack>
            )}
          </VStack>
        </StackItem>

        <StackItem size="fill">
          <ChatLayout
            composer={
              <VStack gap={2}>
                <ToggleButtonGroup
                  label="Quick replies"
                  type="single"
                  value={quickReply}
                  onChange={(v) => setQuickReply(typeof v === 'string' ? v : null)}
                  size="sm"
                >
                  <ToggleButton value="loam" label="Loam" />
                  <ToggleButton value="clay" label="Clay" />
                  <ToggleButton value="sandy" label="Sandy" />
                  <ToggleButton value="not-sure" label="Not sure" />
                </ToggleButtonGroup>
                <ChatComposer
                  value={composerValue}
                  onChange={setComposerValue}
                  placeholder="Type a message..."
                  onSubmit={() => setComposerValue('')}
                  sendButton={<ChatSendButton />}
                />
              </VStack>
            }
            emptyState={<EmptyState title="No messages yet" description="Start a conversation." />}
          >
            <ChatMessageList>
              <ChatMessage sender="assistant">
                <ChatToolCalls
                  calls={[
                    { key: '1', name: 'get_weather', node: 'external', status: 'complete', target: 'lat=23.99, lon=90.42', duration: '412ms' },
                    { key: '2', name: 'search_knowledge_base', node: 'retrieval', status: 'complete', target: 'BARC FRG-2018 · tillering N', duration: '186ms' },
                  ]}
                />
              </ChatMessage>
              <ChatMessage sender="assistant">
                <ChatMessageBubble
                  variant="ghost"
                  metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-07-24T05:00:00Z" format="relative" />} />}
                >
                  This week's forecast shows 41mm of rain over the next 14 days — I've shifted the tillering nitrogen top-dress by 4
                  days to avoid runoff loss.
                </ChatMessageBubble>
              </ChatMessage>
              <ChatMessage sender="assistant">
                <ChatToolCalls
                  calls={[
                    { key: '3', name: 'rank_crops', node: 'deterministic', status: 'complete', target: 'season=boro, aez=28', duration: '3ms' },
                    { key: '4', name: 'compute_financials', node: 'deterministic', status: 'complete', target: 'area_ha=0.49', duration: '2ms' },
                  ]}
                />
              </ChatMessage>
              <ChatMessage sender="assistant">
                <ChatMessageBubble
                  variant="ghost"
                  metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-07-24T05:00:05Z" format="relative" />} />}
                >
                  Net profit is currently ৳27,540 (ROI 65%, BCR 1.65) — see the Money tab for the full breakdown.
                </ChatMessageBubble>
              </ChatMessage>
              <ChatMessage sender="assistant">
                <Card variant="muted">
                  <VStack gap={2}>
                    <Text type="label">Log irrigation</Text>
                    <NumberInput label="Amount" isLabelHidden value={logAmount} onChange={setLogAmount} units="mm" placeholder="0" />
                    <Button label="Log" variant="primary" isDisabled={logAmount == null} />
                  </VStack>
                </Card>
              </ChatMessage>
            </ChatMessageList>
          </ChatLayout>
        </StackItem>
      </VStack>

      <Dialog isOpen={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <Layout
          header={<DialogHeader title="Field details" onOpenChange={setIsDetailsOpen} />}
          content={
            <LayoutContent>
              <MetadataList>
                <MetadataListItem label="District">Gazipur · AEZ 28</MetadataListItem>
                <MetadataListItem label="Soil">Loam</MetadataListItem>
                <MetadataListItem label="Water source">Shallow tubewell</MetadataListItem>
                <MetadataListItem label="Area">0.49 ha (1.2 bigha)</MetadataListItem>
                <MetadataListItem label="Crop">Boro rice · BRRI dhan89</MetadataListItem>
              </MetadataList>
            </LayoutContent>
          }
        />
      </Dialog>

      <AlertDialog
        isOpen={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        title="Approve this charge?"
        description="This will charge ৳1,240 to 017XXXXXXXX for the fertilizer basket (Urea, TSP). Nothing is debited until you approve."
        actionLabel="Approve"
        actionVariant="primary"
        onAction={() => setIsApproveOpen(false)}
      />
    </AppShell>
  );
}
