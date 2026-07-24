// Farm Profile — farmer info, farm details (aggregated from its fields, since size/water/
// budget live on Field, not Farm, in this data model), the field list, and account actions.
// Top rail option, above the Fields section.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Banner } from '@astryxdesign/core/Banner';
import { useT, useSession } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { FieldRail } from '../../../components/FieldRail';
import { bdt } from '../../../lib/format';
import { listFarms, listFields, type ApiFarm, type ApiField } from '../../../lib/api';

export default function FarmProfilePage() {
  const router = useRouter();
  const { t } = useT();
  const { session, isHydrated, setSession } = useSession();

  const [farm, setFarm] = useState<ApiFarm | null>(null);
  const [fields, setFields] = useState<ApiField[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!session) {
      router.push('/');
      return;
    }
    if (!session.farmId) {
      router.push('/farm');
      return;
    }
    listFarms(session.userId)
      .then((res) => setFarm(res.farms.find((f) => f.id === session.farmId) ?? null))
      .catch((err) => setError(String(err)));
    listFields(session.farmId)
      .then((res) => setFields(res.fields))
      .catch((err) => setError(String(err)));
  }, [isHydrated, session, router]);

  function handleLogout() {
    setSession(null);
    router.push('/');
  }

  if (!isHydrated || !session) return null;

  const totalAreaHa = fields?.reduce((sum, f) => sum + (f.areaHa ?? 0), 0) ?? null;
  const totalBudgetBdt = fields?.reduce((sum, f) => sum + (f.budgetBdt ?? 0), 0) ?? null;
  const waterSources = Array.from(new Set((fields ?? []).map((f) => f.waterSource).filter((w): w is string => w != null)));
  const waterSourceLabel = waterSources.length === 1 ? t(`water_${waterSources[0]}`) : waterSources.length > 1 ? t('farm_profile_varies_by_field') : t('not_set');

  return (
    <AppShell
      height="fill"
      contentPadding={4}
      sideNav={<FieldRail farmName={session.farmName ?? ''} fields={fields ?? []} />}
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      <VStack gap={4} width={640}>
        <Text type="display-3">{t('farm_profile_title')}</Text>

        {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}

        <Card>
          <VStack gap={2}>
            <Text type="label" weight="semibold">
              {t('farm_profile_farmer_heading')}
            </Text>
            <MetadataList orientation="horizontal" columns="multi">
              <MetadataListItem label={t('farm_owner_name_label')}>{session.name ?? t('not_set')}</MetadataListItem>
              <MetadataListItem label={t('phone_label')}>{session.phone}</MetadataListItem>
            </MetadataList>
            <Text type="supporting" color="secondary">
              {t('farm_profile_subscriber_id_note')}
            </Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={2}>
            <Text type="label" weight="semibold">
              {t('farm_profile_farm_heading')}
            </Text>
            {!farm ? (
              <Skeleton height={60} />
            ) : (
              <MetadataList orientation="horizontal" columns="multi">
                <MetadataListItem label={t('farm_district_label')}>{farm.district ?? t('not_set')}</MetadataListItem>
                <MetadataListItem label={t('farm_profile_total_size_label')}>
                  {totalAreaHa != null ? `${totalAreaHa} ${t('unit_hectare')}` : t('not_set')}
                </MetadataListItem>
                <MetadataListItem label={t('farm_profile_water_source_label')}>{waterSourceLabel}</MetadataListItem>
                <MetadataListItem label={t('farm_profile_budget_label')}>{totalBudgetBdt != null ? bdt(totalBudgetBdt) : t('not_set')}</MetadataListItem>
              </MetadataList>
            )}
          </VStack>
        </Card>

        <Card>
          <VStack gap={2}>
            <Text type="label" weight="semibold">
              {t('farm_profile_fields_heading')}
            </Text>
            {!fields ? (
              <Grid columns={{ minWidth: 220 }} gap={3}>
                <Skeleton height={100} />
                <Skeleton height={100} />
              </Grid>
            ) : fields.length === 0 ? (
              <Text type="supporting" color="secondary">
                {t('next_steps_empty')}
              </Text>
            ) : (
              <Grid columns={{ minWidth: 220 }} gap={3}>
                {fields.map((f) => {
                  const isActive = f.activeCycle != null;
                  return (
                    <Card key={f.id} variant="muted" padding={2}>
                      <VStack gap={1.5}>
                        <HStack justify="between" vAlign="center">
                          <Text type="label" weight="semibold">
                            {f.name ?? t('field_unnamed')}
                          </Text>
                          <Badge variant={isActive ? 'green' : 'neutral'} label={isActive ? t('field_status_active') : t('field_status_new')} />
                        </HStack>
                        <Text type="supporting" color="secondary">
                          {f.activeCycle?.crop ?? t('no_crop')}
                          {f.activeCycle?.stage ? ` · ${t(`stage_${f.activeCycle.stage}`)}` : ''}
                        </Text>
                        <Button label={t('go_to_field')} variant="ghost" size="sm" href={`/field/${f.id}/overview`} />
                      </VStack>
                    </Card>
                  );
                })}
              </Grid>
            )}
          </VStack>
        </Card>

        <Card>
          <VStack gap={2}>
            <Text type="label" weight="semibold">
              {t('farm_profile_account_heading')}
            </Text>
            <HStack gap={2} wrap="wrap">
              <Button label={t('edit_profile')} variant="secondary" href="/settings" />
              <Button label={t('logout')} variant="ghost" onClick={handleLogout} />
            </HStack>
          </VStack>
        </Card>
      </VStack>
    </AppShell>
  );
}
