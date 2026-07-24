// New field: conversational intake → crop selection chain. Raw Astryx components only, no
// wrapper components, same convention as farm/page.tsx and field/[id]/page.tsx. There is no
// apps/api yet (§C.1), so "creating" a field here routes to the one seeded active field
// (lib/mock-data.ts) rather than persisting a new one — the chain itself (gap-detection intake,
// then a ranked crop comparison) is the content being demonstrated, not a multi-field backend.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Grid } from '@astryxdesign/core/Grid';
import { List, ListItem } from '@astryxdesign/core/List';
import { Icon } from '@astryxdesign/core/Icon';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { ChatMessageList, ChatMessage, ChatMessageBubble } from '@astryxdesign/core/Chat';
import type { IntakeField } from '@agrisense/shared';
import { REQUIRED_INTAKE_FIELDS } from '@agrisense/shared';
import { useT } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { bdt } from '../../../lib/format';
import { fieldState, cropCandidates } from '../../../lib/mock-data';

type Step = 'location' | 'soil_water' | 'budget_season' | 'crop' | 'confirmed';

interface Answers {
  location: string | null;
  areaHa: number | null;
  soilKey: string | null;
  waterKey: string | null;
  budgetLabel: string | null;
  seasonKey: string | null;
}

const EMPTY_ANSWERS: Answers = {
  location: null,
  areaHa: null,
  soilKey: null,
  waterKey: null,
  budgetLabel: null,
  seasonKey: null,
};

const DISTRICTS = ['gazipur', 'mymensingh', 'rangpur'] as const;
const SOILS = ['loam', 'clay_loam', 'clay', 'sandy_loam'] as const;
const WATERS = ['shallow_tubewell', 'deep_tubewell', 'canal', 'rainfed'] as const;
const BUDGETS = [20000, 45000, 80000] as const;
const SEASONS = ['now', 'later'] as const;

const INTAKE_LABEL_KEYS: Record<IntakeField, string> = {
  location: 'intake_location',
  area_ha: 'intake_area',
  soil_type: 'intake_soil',
  water_source: 'intake_water',
  budget_bdt: 'intake_budget',
  target_season: 'intake_season',
};

function intakeValue(field: IntakeField, a: Answers, soilLabel: (k: string) => string, waterLabel: (k: string) => string, seasonLabel: (k: string) => string): string | null {
  if (field === 'location') return a.location;
  if (field === 'area_ha') return a.areaHa != null ? `${a.areaHa} ha` : null;
  if (field === 'soil_type') return a.soilKey ? soilLabel(a.soilKey) : null;
  if (field === 'water_source') return a.waterKey ? waterLabel(a.waterKey) : null;
  if (field === 'budget_bdt') return a.budgetLabel;
  if (field === 'target_season') return a.seasonKey ? seasonLabel(a.seasonKey) : null;
  return null;
}

export default function NewFieldPage() {
  const router = useRouter();
  const { t, tf } = useT();
  const [step, setStep] = useState<Step>('location');
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [chosenCrop, setChosenCrop] = useState<string | null>(null);

  const soilLabel = (k: string) => t(`soil_${k}`);
  const waterLabel = (k: string) => t(`water_${k}`);
  const seasonLabel = (k: string) => t(`season_${k}`);

  function pickLocation(district: string) {
    setAnswers((a) => ({ ...a, location: t(`district_${district}`), areaHa: 0.49 }));
    setStep('soil_water');
  }

  function pickSoil(soilKey: string) {
    setAnswers((a) => {
      const next = { ...a, soilKey };
      if (next.waterKey) setStep('budget_season');
      return next;
    });
  }

  function pickWater(waterKey: string) {
    setAnswers((a) => {
      const next = { ...a, waterKey };
      if (next.soilKey) setStep('budget_season');
      return next;
    });
  }

  function pickBudget(amount: number | null) {
    setAnswers((a) => {
      const budgetLabel = amount == null ? t('budget_not_sure') : bdt(amount);
      const next = { ...a, budgetLabel };
      if (next.seasonKey) setStep('crop');
      return next;
    });
  }

  function pickSeason(seasonKey: string) {
    setAnswers((a) => {
      const next = { ...a, seasonKey };
      if (next.budgetLabel) setStep('crop');
      return next;
    });
  }

  function confirmCrop(key: string) {
    setChosenCrop(key);
    setStep('confirmed');
  }

  const chosen = chosenCrop ? cropCandidates.find((c) => c.key === chosenCrop) ?? null : null;

  const messages: { role: 'user' | 'assistant'; text: string }[] = [{ role: 'assistant', text: t('onboarding_intro') }];
  if (answers.location) {
    messages.push({ role: 'user', text: `${answers.location} · ${answers.areaHa} ha` });
    messages.push({ role: 'assistant', text: t('onboarding_ask_soil_water') });
  }
  if (answers.soilKey && answers.waterKey) {
    messages.push({ role: 'user', text: `${soilLabel(answers.soilKey)} · ${waterLabel(answers.waterKey)}` });
    messages.push({ role: 'assistant', text: t('onboarding_ask_budget_season') });
  }
  if (answers.budgetLabel && answers.seasonKey) {
    messages.push({ role: 'user', text: `${answers.budgetLabel} · ${seasonLabel(answers.seasonKey)}` });
  }
  if (chosen) {
    messages.push({ role: 'user', text: chosen.name });
    messages.push({ role: 'assistant', text: tf('crop_confirmed_desc', { crop: chosen.name }) });
  }

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4}>
        <VStack gap={0}>
          <Text type="label" color="secondary">
            {step === 'crop' || step === 'confirmed' ? t('crop_selection_eyebrow') : t('onboarding_eyebrow')}
          </Text>
          <Text type="display-3">{step === 'crop' || step === 'confirmed' ? t('crop_selection_title') : t('onboarding_title')}</Text>
          <Text type="supporting" color="secondary">
            {step === 'crop' || step === 'confirmed' ? t('crop_selection_desc') : t('onboarding_intro')}
          </Text>
        </VStack>

        <HStack gap={4} vAlign="start" wrap="wrap">
          <StackItem size="fill">
          <VStack gap={3}>
            <Card>
              <ChatMessageList>
                {messages.map((m, i) => (
                  <ChatMessage key={i} sender={m.role === 'user' ? 'user' : 'assistant'}>
                    <ChatMessageBubble variant={m.role === 'user' ? 'filled' : 'ghost'}>{m.text}</ChatMessageBubble>
                  </ChatMessage>
                ))}
              </ChatMessageList>
            </Card>

            {step === 'location' ? (
              <Card>
                <VStack gap={2}>
                  <Text type="label" weight="semibold">
                    {t('intake_location')}
                  </Text>
                  <ToggleButtonGroup label={t('intake_location')} type="single" value={null} onChange={(v) => v && pickLocation(v as string)}>
                    {DISTRICTS.map((d) => (
                      <ToggleButton key={d} value={d} label={t(`district_${d}`)} />
                    ))}
                  </ToggleButtonGroup>
                </VStack>
              </Card>
            ) : null}

            {step === 'soil_water' ? (
              <Card>
                <VStack gap={3}>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      {t('intake_soil')}
                    </Text>
                    <ToggleButtonGroup label={t('intake_soil')} type="single" value={answers.soilKey} onChange={(v) => v && pickSoil(v as string)}>
                      {SOILS.map((s) => (
                        <ToggleButton key={s} value={s} label={t(`soil_${s}`)} />
                      ))}
                    </ToggleButtonGroup>
                  </VStack>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      {t('intake_water')}
                    </Text>
                    <ToggleButtonGroup label={t('intake_water')} type="single" value={answers.waterKey} onChange={(v) => v && pickWater(v as string)}>
                      {WATERS.map((w) => (
                        <ToggleButton key={w} value={w} label={t(`water_${w}`)} />
                      ))}
                    </ToggleButtonGroup>
                  </VStack>
                </VStack>
              </Card>
            ) : null}

            {step === 'budget_season' ? (
              <Card>
                <VStack gap={3}>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      {t('intake_budget')}
                    </Text>
                    <ToggleButtonGroup label={t('intake_budget')} type="single" value={null} onChange={(v) => (v === 'unsure' ? pickBudget(null) : pickBudget(Number(v)))}>
                      {BUDGETS.map((b) => (
                        <ToggleButton key={b} value={String(b)} label={bdt(b)} />
                      ))}
                      <ToggleButton value="unsure" label={t('budget_not_sure')} />
                    </ToggleButtonGroup>
                  </VStack>
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      {t('intake_season')}
                    </Text>
                    <ToggleButtonGroup label={t('intake_season')} type="single" value={answers.seasonKey} onChange={(v) => v && pickSeason(v as string)}>
                      {SEASONS.map((s) => (
                        <ToggleButton key={s} value={s} label={t(`season_${s}`)} />
                      ))}
                    </ToggleButtonGroup>
                  </VStack>
                </VStack>
              </Card>
            ) : null}

            {step === 'crop' ? (
              <Grid columns={{ minWidth: 280 }} gap={3}>
                {cropCandidates.map((c) => (
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
                        {c.variety} · {t('crop_water_need')}: {c.water} · {t('crop_risk')}: {c.risk}
                      </Text>
                      <Text type="supporting">
                        {t('crop_est_net')} <b>{bdt(c.netProfitBdt)}</b> · {t('crop_est_cost')} {bdt(c.totalCostBdt)} · {c.days}d
                      </Text>
                      <Text type="supporting" color="secondary">
                        {c.note}
                      </Text>
                      <Button label={tf('crop_plan_button', { crop: c.name })} variant={c.key === 'aman' ? 'primary' : 'secondary'} onClick={() => confirmCrop(c.key)} />
                    </VStack>
                  </Card>
                ))}
              </Grid>
            ) : null}

            {step === 'confirmed' && chosen ? (
              <Card variant="green">
                <VStack gap={2}>
                  <Text type="label" weight="semibold">
                    {t('crop_confirmed_title')}
                  </Text>
                  <Text type="supporting">{tf('crop_confirmed_desc', { crop: chosen.name })}</Text>
                  <Button label={t('go_to_field')} variant="primary" onClick={() => router.push(`/field/${fieldState.identity.id}`)} />
                </VStack>
              </Card>
            ) : null}
          </VStack>
          </StackItem>

          <StackItem>
            <Card>
              <VStack gap={2}>
                <Text type="label" weight="semibold">
                  {t('onboarding_record_heading')}
                </Text>
                <List hasDividers>
                  {REQUIRED_INTAKE_FIELDS.map((field) => {
                    const value = intakeValue(field, answers, soilLabel, waterLabel, seasonLabel);
                    return (
                      <ListItem
                        key={field}
                        label={t(INTAKE_LABEL_KEYS[field])}
                        description={value ?? t('onboarding_not_given')}
                        endContent={value ? <Icon icon="check" color="success" /> : undefined}
                      />
                    );
                  })}
                </List>
              </VStack>
            </Card>
          </StackItem>
        </HStack>
      </VStack>
    </AppShell>
  );
}
