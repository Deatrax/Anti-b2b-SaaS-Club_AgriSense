// Farm overview — real fields for the logged-in user's farm (GET /farms/:id/fields), a
// 3-up card grid (screen matches the mock's farm-card pattern). If the user has no farm yet
// (brand new phone number), prompts to create one first (POST /farms).
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Center } from '@astryxdesign/core/Center';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Banner } from '@astryxdesign/core/Banner';
import { Plus } from 'lucide-react';
import { useT, useSession } from '../providers';
import { ModeLangToggle } from '../../components/ModeLangToggle';
import { FieldRail } from '../../components/FieldRail';
import { listFields, listRecentChats, createFarm, createField, type ApiField, type ApiRecentChat } from '../../lib/api';

export default function FarmPage() {
  const router = useRouter();
  const { t } = useT();
  const { session, isHydrated, setSession } = useSession();
  const [fields, setFields] = useState<ApiField[] | null>(null);
  const [recentChats, setRecentChats] = useState<ApiRecentChat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmDistrict, setNewFarmDistrict] = useState('');
  const [isCreatingFarm, setIsCreatingFarm] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    if (!session) {
      router.push('/');
      return;
    }
    if (!session.farmId) return;
    listFields(session.farmId)
      .then((res) => setFields(res.fields))
      .catch((err) => setError(String(err)));
    listRecentChats(session.farmId)
      .then((res) => setRecentChats(res.chats))
      .catch(() => {});
  }, [isHydrated, session, router]);

  async function handleCreateFarm() {
    if (!session || ownerName.trim().length === 0 || newFarmName.trim().length === 0 || newFarmDistrict.trim().length === 0) return;
    setIsCreatingFarm(true);
    setError(null);
    try {
      const { farm, user } = await createFarm(session.userId, newFarmName.trim(), newFarmDistrict.trim(), ownerName.trim());
      setSession({ ...session, name: user.name, farmId: farm.id, farmName: farm.name, farmDistrict: farm.district, farmAez: farm.aez });
      
      // Automatically create the first field and start the chat flow
      const { field } = await createField(farm.id);
      router.push(`/field/${field.id}/chat`);
    } catch (err) {
      setError(String(err));
      setIsCreatingFarm(false);
    }
  }

  async function handleAddField() {
    if (!session?.farmId) return;
    setIsAddingField(true);
    setError(null);
    try {
      const { field } = await createField(session.farmId, newFieldName.trim() || undefined);
      router.push(`/field/${field.id}/chat`);
    } catch (err) {
      setError(String(err));
      setIsAddingField(false);
    }
  }

  if (!isHydrated || !session) return null;

  if (!session.farmId) {
    return (
      <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
        <Center height="100%">
          <VStack gap={4} width={360}>
            <VStack gap={0}>
              <Text type="display-3">{t('farm_create_title')}</Text>
              <Text type="supporting" color="secondary">
                {t('farm_create_desc')}
              </Text>
            </VStack>
            {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}
            <FormLayout>
              <TextInput label={t('farm_owner_name_label')} value={ownerName} onChange={setOwnerName} placeholder={t('farm_owner_name_placeholder')} />
              <TextInput label={t('farm_name_label')} value={newFarmName} onChange={setNewFarmName} placeholder={t('farm_name_placeholder')} />
              <TextInput label={t('farm_district_label')} value={newFarmDistrict} onChange={setNewFarmDistrict} placeholder={t('farm_district_placeholder')} />
            </FormLayout>
            <Button
              label={t('continue')}
              variant="primary"
              isDisabled={isCreatingFarm || ownerName.trim().length === 0 || newFarmName.trim().length === 0 || newFarmDistrict.trim().length === 0}
              onClick={handleCreateFarm}
            />
          </VStack>
        </Center>
      </AppShell>
    );
  }

  return (
    <AppShell
      height="fill"
      contentPadding={4}
      sideNav={
        <FieldRail
          farmName={session.farmName ?? ''}
          farmDistrict={session.farmDistrict}
          farmAez={session.farmAez}
          fields={fields ?? []}
          recentChats={recentChats}
          onAddField={handleAddField}
        />
      }
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      <VStack gap={4}>
        <VStack gap={0}>
          <Text type="display-3">{t('farm_fields_heading')}</Text>
          <Text type="supporting" color="secondary">
            {t('farm_screen_desc')}
          </Text>
        </VStack>

        {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}

        {fields === null ? (
          <Grid columns={{ minWidth: 260 }} gap={3}>
            <Skeleton height={140} />
            <Skeleton height={140} />
          </Grid>
        ) : (
          <Grid columns={{ minWidth: 260 }} gap={3}>
            {fields.map((f) => {
              const isActive = f.activeCycle != null;
              return (
                <Card key={f.id}>
                  <VStack gap={2}>
                    <HStack justify="between" vAlign="center">
                      <Text type="label" weight="semibold">
                        {f.name ?? t('field_unnamed')}
                      </Text>
                      <Badge variant={isActive ? 'green' : 'neutral'} label={isActive ? t('field_status_active') : t('field_status_new')} />
                    </HStack>
                    <Text type="supporting" color="secondary">
                      {f.areaHa != null ? `${f.areaHa} ${t('unit_hectare')} · ` : ''}
                      {f.activeCycle?.crop ?? t('no_crop')}
                      {f.activeCycle?.stage ? ` · ${t(`stage_${f.activeCycle.stage}`)}` : ''}
                    </Text>
                    <Button label={t('go_to_field')} variant="primary" href={`/field/${f.id}/overview`} />
                  </VStack>
                </Card>
              );
            })}

            <Card variant="muted">
              <VStack gap={2} hAlign="center">
                <Icon icon={Plus} color="secondary" size="lg" />
                <Text type="label" weight="semibold">
                  {t('add_field')}
                </Text>
                <TextInput value={newFieldName} onChange={setNewFieldName} placeholder={t('field_name_placeholder') || 'Field Name (Optional)'} />
                <Button label={t('add_field')} variant="secondary" isDisabled={isAddingField} onClick={handleAddField} />
              </VStack>
            </Card>
          </Grid>
        )}
      </VStack>
    </AppShell>
  );
}
