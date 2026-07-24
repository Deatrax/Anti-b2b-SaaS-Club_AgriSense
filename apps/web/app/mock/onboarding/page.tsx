// Screen 03/14 of the /mock deck rebuild — conversational field intake, stopping before
// crop selection (that's screen 04, Planning). Modeled on app/field/new/page.tsx's early
// steps (new file, that page is untouched) plus a "not sure" -> inferred-default WhyPanel
// disclosure the existing intake flow doesn't have yet.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { List, ListItem } from '@astryxdesign/core/List';
import { Icon } from '@astryxdesign/core/Icon';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { ChatMessageList, ChatMessage, ChatMessageBubble } from '@astryxdesign/core/Chat';
import type { IntakeField } from '@agrisense/shared';
import { REQUIRED_INTAKE_FIELDS } from '@agrisense/shared';
import { useT } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { WhyPanel } from '../../../components/mock/WhyPanel';
import { bdt } from '../../../lib/format';

type Step = 'location' | 'soil_water' | 'budget_season' | 'done';

interface Answers {
  location: string | null;
  areaHa: number | null;
  soilKey: string | null;
  soilInferred: boolean;
  waterKey: string | null;
  budgetLabel: string | null;
  seasonKey: string | null;
}

const EMPTY_ANSWERS: Answers = {
  location: null,
  areaHa: null,
  soilKey: null,
  soilInferred: false,
  waterKey: null,
  budgetLabel: null,
  seasonKey: null,
};

const DISTRICTS = ['gazipur', 'mymensingh', 'rangpur'] as const;
const SOILS = ['loam', 'clay_loam', 'clay', 'sandy_loam'] as const;
const WATERS = ['shallow_tubewell', 'deep_tubewell', 'canal', 'rainfed'] as const;
const BUDGETS = [20000, 45000, 80000] as const;
const SEASONS = ['now', 'later'] as const;
const AEZ_MAJORITY_SOIL = 'clay_loam';

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

export default function MockOnboardingPage() {
  const router = useRouter();
  const { t } = useT();
  const [step, setStep] = useState<Step>('location');
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);

  const soilLabel = (k: string) => t(`soil_${k}`);
  const waterLabel = (k: string) => t(`water_${k}`);
  const seasonLabel = (k: string) => t(`season_${k}`);

  function pickLocation(district: string) {
    setAnswers((a) => ({ ...a, location: t(`district_${district}`), areaHa: 0.49 }));
    setStep('soil_water');
  }

  function pickSoil(value: string) {
    const inferred = value === 'not_sure';
    const soilKey = inferred ? AEZ_MAJORITY_SOIL : value;
    setAnswers((a) => {
      const next = { ...a, soilKey, soilInferred: inferred };
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
      if (next.seasonKey) setStep('done');
      return next;
    });
  }

  function pickSeason(seasonKey: string) {
    setAnswers((a) => {
      const next = { ...a, seasonKey };
      if (next.budgetLabel) setStep('done');
      return next;
    });
  }

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

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4}>
        <VStack gap={0}>
          <Text type="label" color="secondary">
            {t('onboarding_eyebrow')}
          </Text>
          <Text type="display-3">{t('onboarding_title')}</Text>
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
                      <ToggleButtonGroup
                        label={t('intake_soil')}
                        type="single"
                        value={answers.soilInferred ? 'not_sure' : answers.soilKey}
                        onChange={(v) => v && pickSoil(v as string)}
                      >
                        {SOILS.map((s) => (
                          <ToggleButton key={s} value={s} label={t(`soil_${s}`)} />
                        ))}
                        <ToggleButton value="not_sure" label={t('soil_not_sure')} />
                      </ToggleButtonGroup>
                      {answers.soilInferred ? (
                        <WhyPanel
                          items={[
                            {
                              toolClass: 'retrieval',
                              label: t('why_soil_inferred_headline'),
                              description: t('why_soil_inferred_detail'),
                            },
                          ]}
                        />
                      ) : null}
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

              {step === 'done' ? (
                <Card variant="green">
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      {t('onboarding_record_heading')}
                    </Text>
                    <Button label={t('continue')} variant="primary" onClick={() => router.push('/mock/planning')} />
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
