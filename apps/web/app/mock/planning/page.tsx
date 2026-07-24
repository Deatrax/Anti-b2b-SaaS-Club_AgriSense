// Screen 04/14 of the /mock deck rebuild — crop recommendation chain. Modeled on
// app/field/new/page.tsx's `step === 'crop'` phase (new file, that page is untouched).
//
// Per stakeholder feedback (screenshot review, 2026-07-24): the original mock's raw 0-1
// sub-scores ("SEASON 1.00 · RAIN 0.78 …") are not legible to a farmer audience. Rather
// than reinstating those exact fabricated decimals with a label paint job, this rebuilds
// the comparison using ONLY real fields lib/mock-data.ts's CropCandidate already has
// (score, water, risk, netProfitBdt, totalCostBdt) — each range-mapped, deterministically,
// to a natural-language tier badge instead of a decimal. No new invented per-axis numbers
// (Season/Temp/Soil/Rotation fit) are introduced, consistent with mock-data.ts's own header
// comment against rendering figures that aren't backed by a real source.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Badge, type BadgeVariant } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Grid } from '@astryxdesign/core/Grid';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Table } from '@astryxdesign/core/Table';
import { useT } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { WhyPanel } from '../../../components/mock/WhyPanel';
import { bdt } from '../../../lib/format';
import { cropCandidates, type CropCandidate } from '../../../lib/mock-data';

type Tier = 'strong' | 'moderate' | 'limited';

const TIER_BADGE_VARIANT: Record<Tier, BadgeVariant> = { strong: 'green', moderate: 'neutral', limited: 'warning' };
const TIER_PROGRESS_VARIANT: Record<Tier, 'success' | 'neutral' | 'warning'> = { strong: 'success', moderate: 'neutral', limited: 'warning' };

function fitTier(score: number): Tier {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'moderate';
  return 'limited';
}

function returnTier(candidate: CropCandidate): Tier {
  const ratio = candidate.totalCostBdt > 0 ? candidate.netProfitBdt / candidate.totalCostBdt : 0;
  if (ratio >= 1) return 'strong';
  if (ratio >= 0.5) return 'moderate';
  return 'limited';
}

function levelTier(level: 'Low' | 'Medium' | 'High', invert: boolean): Tier {
  if (level === 'Low') return invert ? 'limited' : 'strong';
  if (level === 'High') return invert ? 'strong' : 'limited';
  return 'moderate';
}

function ScoreMeter({ label, value, tier, tierLabel }: { label: string; value: number; tier: Tier; tierLabel: string }) {
  return (
    <HStack gap={2} vAlign="center">
      <StackItem width={90}>
        <Text type="supporting" color="secondary">
          {label}
        </Text>
      </StackItem>
      <StackItem size="fill">
        <ProgressBar label={label} isLabelHidden value={value} max={100} variant={TIER_PROGRESS_VARIANT[tier]} />
      </StackItem>
      <Badge variant={TIER_BADGE_VARIANT[tier]} label={tierLabel} />
    </HStack>
  );
}

export default function MockPlanningPage() {
  const router = useRouter();
  const { t, tf } = useT();
  const [chosenCrop, setChosenCrop] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const chosen = chosenCrop ? cropCandidates.find((c) => c.key === chosenCrop) ?? null : null;
  const tierLabel = (tier: Tier) => t(`score_${tier}`);
  const levelLabel = (level: 'Low' | 'Medium' | 'High') => t(`level_${level.toLowerCase()}`);

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4}>
        <HStack justify="between" vAlign="start" wrap="wrap">
          <VStack gap={0}>
            <Text type="label" color="secondary">
              {t('crop_selection_eyebrow')}
            </Text>
            <Text type="display-3">{t('crop_selection_title')}</Text>
            <Text type="supporting" color="secondary">
              {t('crop_selection_desc')}
            </Text>
          </VStack>
          <Button label={t('crop_compare_toggle')} variant="secondary" onClick={() => setIsCompareOpen((v) => !v)} />
        </HStack>

        <Grid columns={{ minWidth: 300 }} gap={3}>
          {cropCandidates.map((c) => {
            const suitTier = fitTier(c.score);
            const retTier = returnTier(c);
            const waterTier = levelTier(c.water, true);
            const riskTier = levelTier(c.risk, true);
            return (
              <Card key={c.key}>
                <VStack gap={2}>
                  <HStack justify="between" vAlign="center">
                    <HStack gap={1.5} vAlign="center">
                      <Text type="label" weight="semibold">
                        {c.name}
                      </Text>
                      {c.key === 'aman' ? <Badge variant="yellow" label={t('crop_recommended')} /> : null}
                    </HStack>
                    <Text type="display-3">{c.score}</Text>
                  </HStack>
                  <Text type="supporting" color="secondary">
                    {c.variety} · {c.days}d
                  </Text>

                  <VStack gap={1.5}>
                    <ScoreMeter label={t('crop_suitability')} value={c.score} tier={suitTier} tierLabel={tierLabel(suitTier)} />
                    <ScoreMeter label={t('crop_est_return')} value={Math.min(100, Math.round((c.netProfitBdt / c.totalCostBdt) * 50))} tier={retTier} tierLabel={tierLabel(retTier)} />
                    <HStack gap={2} vAlign="center">
                      <StackItem width={90}>
                        <Text type="supporting" color="secondary">
                          {t('crop_water_need')}
                        </Text>
                      </StackItem>
                      <Badge variant={TIER_BADGE_VARIANT[waterTier]} label={levelLabel(c.water)} />
                    </HStack>
                    <HStack gap={2} vAlign="center">
                      <StackItem width={90}>
                        <Text type="supporting" color="secondary">
                          {t('crop_risk')}
                        </Text>
                      </StackItem>
                      <Badge variant={TIER_BADGE_VARIANT[riskTier]} label={levelLabel(c.risk)} />
                    </HStack>
                  </VStack>

                  <Text type="supporting">
                    {t('crop_est_net')} <b>{bdt(c.netProfitBdt)}</b> · {t('crop_est_cost')} {bdt(c.totalCostBdt)}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {c.note}
                  </Text>
                  <Button label={tf('crop_plan_button', { crop: c.name })} variant={c.key === 'aman' ? 'primary' : 'secondary'} onClick={() => setChosenCrop(c.key)} />
                </VStack>
              </Card>
            );
          })}
        </Grid>

        {isCompareOpen ? (
          <Card padding={3}>
            <VStack gap={2}>
              <Table
                data={cropCandidates.map((c) => ({
                  id: c.key,
                  crop: c.name,
                  score: `${c.score} · ${tierLabel(fitTier(c.score))}`,
                  water: levelLabel(c.water),
                  risk: levelLabel(c.risk),
                  net: bdt(c.netProfitBdt),
                  cost: bdt(c.totalCostBdt),
                }))}
                idKey="id"
                columns={[
                  { key: 'crop', header: t('crop_selection_title') },
                  { key: 'score', header: t('crop_suitability') },
                  { key: 'water', header: t('crop_water_need') },
                  { key: 'risk', header: t('crop_risk') },
                  { key: 'net', header: t('crop_est_net') },
                  { key: 'cost', header: t('crop_est_cost') },
                ]}
              />
              <WhyPanel items={[{ toolClass: 'deterministic', label: t('crop_compare_footnote') }]} />
            </VStack>
          </Card>
        ) : null}

        {chosen ? (
          <Card variant="green">
            <VStack gap={2}>
              <Text type="label" weight="semibold">
                {t('crop_confirmed_title')}
              </Text>
              <Text type="supporting">{tf('crop_confirmed_desc', { crop: chosen.name })}</Text>
              <Button label={t('go_to_field')} variant="primary" onClick={() => router.push('/mock/field/overview')} />
            </VStack>
          </Card>
        ) : null}
      </VStack>
    </AppShell>
  );
}
