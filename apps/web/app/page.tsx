// Phone entry. Raw Astryx components only, no wrapper components — colors +
// mockup data pass over the neutral scaffold. See Docs/inventory_import.md and
// Docs/AgriSense_Wireframe.html.
//
// Phone number is the sole identifier (§B.5 scope boundary) — no OTP. "Continue" is a
// placeholder auth step: it just routes to /farm, standing in for a future
// POST /api/auth that would look the number up or create a user row.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Center } from '@astryxdesign/core/Center';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';
import { useT } from './providers';
import { ModeLangToggle } from '../components/ModeLangToggle';

export default function Home() {
  const [phone, setPhone] = useState('');
  const router = useRouter();
  const { t } = useT();

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <Center height="100%">
        <VStack gap={6} width={360}>
          <VStack gap={1}>
            <Text type="display-3">{t('app_title')}</Text>
            <Text type="supporting" color="secondary">
              {t('app_tagline')}
            </Text>
          </VStack>
          <FormLayout>
            <TextInput label={t('phone_label')} placeholder={t('phone_placeholder')} value={phone} onChange={setPhone} />
            <Button
              label={t('continue')}
              variant="primary"
              width="100%"
              isDisabled={phone.trim().length === 0}
              onClick={() => router.push('/farm')}
            />
          </FormLayout>
        </VStack>
      </Center>
    </AppShell>
  );
}
