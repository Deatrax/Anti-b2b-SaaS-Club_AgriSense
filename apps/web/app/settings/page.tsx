// Account settings — real name/language editing (PATCH /users/:id) and account deletion
// (DELETE /users/:id, cascades through every farm/field/plan the user owns). Reachable from
// FieldRail's "Settings" link.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { useImperativeAlertDialog } from '@astryxdesign/core/AlertDialog';
import { useT, useSession, useLang } from '../providers';
import { ModeLangToggle } from '../../components/ModeLangToggle';
import { FieldRail } from '../../components/FieldRail';
import { updateUser, deleteUser, listFields, type ApiField } from '../../lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useT();
  const { lang, setLang } = useLang();
  const { session, isHydrated, setSession } = useSession();

  const [fields, setFields] = useState<ApiField[]>([]);
  const [name, setName] = useState(session?.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteDialog = useImperativeAlertDialog();

  useEffect(() => {
    if (!isHydrated) return;
    if (!session) {
      router.push('/');
      return;
    }
    setName(session.name ?? '');
    if (session.farmId) {
      listFields(session.farmId)
        .then((res) => setFields(res.fields))
        .catch(() => {});
    }
  }, [isHydrated, session, router]);

  if (!isHydrated || !session) return null;

  async function handleSaveName() {
    if (!session || name.trim().length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const { user } = await updateUser(session.userId, { name: name.trim() });
      setSession({ ...session, name: user.name });
      setSavedAt(Date.now());
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  }

  function handleLangChange(next: 'en' | 'bn') {
    setLang(next);
    updateUser(session!.userId, { lang: next }).catch(() => {}); // best-effort server sync; UI already reflects it locally
  }

  async function handleDeleteAccount() {
    if (!session) return;
    setIsDeleting(true);
    try {
      await deleteUser(session.userId);
      setSession(null);
      router.push('/');
    } catch (err) {
      setError(String(err));
      setIsDeleting(false);
    }
  }

  return (
    <AppShell
      height="fill"
      contentPadding={4}
      sideNav={<FieldRail farmName={session.farmName ?? ''} fields={fields} />}
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      <VStack gap={4} width={480}>
        <Text type="display-3">{t('settings_title')}</Text>

        {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}

        <Card>
          <VStack gap={4}>
            <FormLayout>
              <TextInput label={t('settings_phone')} value={session.phone} isDisabled />
              <TextInput label={t('farm_owner_name_label')} value={name} onChange={setName} />
            </FormLayout>
            <HStack gap={2} vAlign="center">
              <Button label={t('save')} variant="primary" size="sm" isDisabled={isSaving || name.trim().length === 0} onClick={handleSaveName} />
              {savedAt ? (
                <Text type="supporting" color="secondary">
                  {t('saved')}
                </Text>
              ) : null}
            </HStack>

            <VStack gap={2}>
              <Text type="label" weight="semibold">
                {t('settings_language')}
              </Text>
              <ToggleButtonGroup label={t('settings_language')} type="single" value={lang} onChange={(v) => v && handleLangChange(v as 'en' | 'bn')}>
                <ToggleButton value="bn" label={t('lang_bn')} />
                <ToggleButton value="en" label={t('lang_en')} />
              </ToggleButtonGroup>
            </VStack>
          </VStack>
        </Card>

        <Card variant="red" padding={3}>
          <VStack gap={2}>
            <Text type="label" weight="semibold">
              {t('settings_delete_heading')}
            </Text>
            <Text type="supporting" color="secondary">
              {t('settings_delete_desc')}
            </Text>
            <Button
              label={t('settings_delete_button')}
              variant="destructive"
              isDisabled={isDeleting}
              onClick={() =>
                deleteDialog.show({
                  title: t('settings_delete_confirm_title'),
                  description: t('settings_delete_confirm_desc'),
                  actionLabel: t('settings_delete_button'),
                  isActionLoading: isDeleting,
                  onAction: handleDeleteAccount,
                })
              }
            />
          </VStack>
        </Card>
      </VStack>
      {deleteDialog.element}
    </AppShell>
  );
}
