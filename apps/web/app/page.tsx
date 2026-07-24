// Phone entry + real OTP (bdapps API guide §6) — the sole identifier (§B.5 scope), now with
// actual verification instead of a bare phone-number form. Two steps: request a code, then
// verify it. If a session already exists (returning visitor), skip straight to /farm instead
// of asking for the phone again every time.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Center } from '@astryxdesign/core/Center';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { useT, useSession } from './providers';
import { ModeLangToggle } from '../components/ModeLangToggle';
import { requestOtp, verifyOtp } from '../lib/api';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const { session, isHydrated, setSession } = useSession();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && session) router.replace('/farm');
  }, [isHydrated, session, router]);

  async function handleSendCode() {
    if (phone.trim().length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { referenceNo: ref } = await requestOtp(phone.trim());
      setReferenceNo(ref);
      setCode('');
      setStep('otp');
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify() {
    if (!referenceNo || code.trim().length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { user, farms } = await verifyOtp(referenceNo, code.trim());
      setSession({ userId: user.id, phone: user.phone, name: user.name, farmId: farms[0]?.id ?? null, farmName: farms[0]?.name ?? null });
      router.push('/farm');
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session) return null;

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <Center height="100%">
        <Card width={360}>
          <VStack gap={4}>
            <VStack gap={0}>
              <Text type="label" color="secondary">
                {t('login_eyebrow')}
              </Text>
              <Text type="display-3">{t('login_title')}</Text>
              <Text type="supporting" color="secondary">
                {step === 'phone' ? t('login_subtitle') : t('otp_subtitle')}
              </Text>
            </VStack>

            {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}

            {step === 'phone' ? (
              <>
                <FormLayout>
                  <TextInput label={t('phone_label')} value={phone} onChange={setPhone} placeholder={t('phone_placeholder')} />
                </FormLayout>
                <Button label={t('otp_send')} variant="primary" isDisabled={phone.trim().length === 0 || isSubmitting} onClick={handleSendCode} />
              </>
            ) : (
              <>
                <Text type="supporting" color="secondary">
                  {phone}
                </Text>
                <FormLayout>
                  <TextInput label={t('otp_code_label')} value={code} onChange={setCode} placeholder={t('otp_code_placeholder')} />
                </FormLayout>
                <Button label={t('otp_verify')} variant="primary" isDisabled={code.trim().length === 0 || isSubmitting} onClick={handleVerify} />
                <HStack justify="between">
                  <Button label={t('otp_change_number')} variant="ghost" size="sm" isDisabled={isSubmitting} onClick={() => setStep('phone')} />
                  <Button label={t('otp_resend')} variant="ghost" size="sm" isDisabled={isSubmitting} onClick={handleSendCode} />
                </HStack>
              </>
            )}

            <Text type="supporting" color="secondary">
              {t('login_demo_note')}
            </Text>
          </VStack>
        </Card>
      </Center>
    </AppShell>
  );
}
