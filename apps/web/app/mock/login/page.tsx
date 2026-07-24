// Screen 01/14 of the /mock deck rebuild of agrisense-v2.html — phone-number sign-in.
// No existing equivalent page; static UI, no lib/mock-data.ts source (§ plan "Login").
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Center } from '@astryxdesign/core/Center';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { useT } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';

export default function MockLoginPage() {
  const router = useRouter();
  const { t } = useT();
  const [phone, setPhone] = useState('');

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <Center>
        <Card width={360}>
          <VStack gap={4}>
            <VStack gap={0}>
              <Text type="label" color="secondary">
                {t('login_eyebrow')}
              </Text>
              <Text type="display-3">{t('login_title')}</Text>
              <Text type="supporting" color="secondary">
                {t('login_subtitle')}
              </Text>
            </VStack>
            <FormLayout>
              <TextInput label={t('phone_label')} value={phone} onChange={setPhone} placeholder={t('phone_placeholder')} />
            </FormLayout>
            <Button label={t('continue')} variant="primary" isDisabled={phone.trim().length === 0} onClick={() => router.push('/mock/farm')} />
            <Text type="supporting" color="secondary">
              {t('login_demo_note')}
            </Text>
          </VStack>
        </Card>
      </Center>
    </AppShell>
  );
}
