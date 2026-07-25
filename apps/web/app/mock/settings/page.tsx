// Screen 13/14 of the /mock deck rebuild — settings. Same composition as
// app/settings/page.tsx (untouched), wired to the real useLang(); adds the rail nav.
'use client';

import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { useT, useLang } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { MockRail } from '../../../components/mock/MockRail';
import { farm } from '../../../lib/mock-data';

export default function MockSettingsPage() {
  const { t } = useT();
  const { lang, setLang } = useLang();
  const [farmName, setFarmName] = useState(farm.name);
  const [units, setUnits] = useState<'mixed' | 'metric'>('mixed');

  return (
    <AppShell height="fill" contentPadding={4} sideNav={<MockRail />} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4} width={480}>
        <HStack justify="between" vAlign="center">
          <Text type="display-3">{t('settings_title')}</Text>
        </HStack>

        <Card>
          <VStack gap={4}>
            <FormLayout>
              <TextInput label={t('settings_phone')} value="+880 17 1234 5678" isDisabled disabledMessage={t('phone_label')} />
              <TextInput label={t('settings_farm_name')} value={farmName} onChange={setFarmName} />
            </FormLayout>

            <VStack gap={2}>
              <Text type="label" weight="semibold">
                {t('settings_language')}
              </Text>
              <ToggleButtonGroup label={t('settings_language')} type="single" value={lang} onChange={(v) => v && setLang(v as 'en' | 'bn')}>
                <ToggleButton value="bn" label={t('lang_bn')} />
                <ToggleButton value="en" label={t('lang_en')} />
              </ToggleButtonGroup>
            </VStack>

            <VStack gap={2}>
              <Text type="label" weight="semibold">
                {t('settings_units')}
              </Text>
              <ToggleButtonGroup label={t('settings_units')} type="single" value={units} onChange={(v) => v && setUnits(v as 'mixed' | 'metric')}>
                <ToggleButton value="mixed" label={t('units_mixed')} />
                <ToggleButton value="metric" label={t('units_metric')} />
              </ToggleButtonGroup>
            </VStack>

            <VStack gap={2}>
              <Text type="label" weight="semibold">
                {t('settings_theme')}
              </Text>
              <Text type="supporting" color="secondary">
                {t('settings_theme_note')}
              </Text>
            </VStack>
          </VStack>
        </Card>
      </VStack>
    </AppShell>
  );
}
