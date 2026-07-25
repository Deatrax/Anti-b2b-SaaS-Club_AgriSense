// Screen 14/14 of the /mock deck rebuild — a living design-token reference page. No rail
// (mock: rail:false). Swatch fills reference existing farmesy/globals.css CSS vars by name
// only (never a literal hex) via TokenSwatch's approved inline-style exception.
'use client';

import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { useT } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { TokenSwatch } from '../../../components/mock/TokenSwatch';

const SWATCHES = [
  { varName: '--color-background-body', label: 'Canvas', description: 'Page field' },
  { varName: '--color-background-surface', label: 'Surface', description: 'Working layer' },
  { varName: '--color-accent', label: 'Forest Accent', description: 'Structure, icons, headings' },
  { varName: '--color-success', label: 'Positive Green', description: 'Healthy / completed state' },
  { varName: '--color-warning', label: 'Warning Orange', description: 'Attention, non-alarmist' },
  { varName: '--color-background-green', label: 'Soft Green', description: 'Quiet positive container' },
  { varName: '--color-background-yellow', label: 'AI Soft Lime', description: 'Light AI/evidence container' },
  { varName: '--color-brand-lime', label: 'AI Lime', description: 'Primary CTA / AI highlight only' },
  { varName: '--color-trace-memory', label: 'Trace · Memory', description: 'Field & conversation state' },
  { varName: '--color-trace-external', label: 'Trace · External', description: 'Live APIs' },
  { varName: '--color-trace-retrieval', label: 'Trace · Retrieval', description: 'Knowledge base' },
  { varName: '--color-trace-deterministic', label: 'Trace · Deterministic', description: 'Tables & pure functions' },
  { varName: '--color-trace-side', label: 'Trace · Side effect', description: 'HITL-approved side effects' },
];

export default function MockTokensPage() {
  const { t } = useT();

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4}>
        <VStack gap={0}>
          <Text type="label" color="secondary">
            {t('tokens_eyebrow')}
          </Text>
          <Text type="display-3">{t('tokens_title')}</Text>
          <Text type="supporting" color="secondary">
            {t('tokens_desc')}
          </Text>
        </VStack>

        <Grid columns={{ minWidth: 150 }} gap={3}>
          {SWATCHES.map((s) => (
            <TokenSwatch key={s.varName} {...s} />
          ))}
        </Grid>

        <Divider />

        <Card padding={3}>
          <VStack gap={2}>
            <Text type="display-1">Display 1</Text>
            <Text type="display-2">Display 2</Text>
            <Text type="display-3">Display 3</Text>
            <Text type="label" weight="semibold">
              Label
            </Text>
            <Text type="supporting" color="secondary">
              Supporting
            </Text>
            <Text type="body">উত্তরের জমি · আমন ধান · BRRI dhan49</Text>
          </VStack>
        </Card>

        <Card padding={3}>
          <VStack gap={3}>
            <HStack gap={2} wrap="wrap">
              <Button label="Primary" variant="primary" />
              <Button label="Secondary" variant="secondary" />
              <Button label="Ghost" variant="ghost" />
            </HStack>
            <HStack gap={2} wrap="wrap">
              <Badge variant="green" label="Green" />
              <Badge variant="yellow" label="Yellow / AI" />
              <Badge variant="neutral" label="Neutral" />
            </HStack>
            <Text type="supporting" color="secondary">
              {t('tokens_one_lime_rule_title')} — {t('tokens_one_lime_rule_desc')}
            </Text>
          </VStack>
        </Card>
      </VStack>
    </AppShell>
  );
}
