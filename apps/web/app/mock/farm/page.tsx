// Screen 02/14 of the /mock deck rebuild — farm overview as a 3-up card grid (active
// field / harvested field / "+ new field"). Distinct from app/farm/page.tsx's dense List:
// that page correctly follows DESIGN.md's "don't card-wrap dense lists" rule for a
// many-field future; this screen replicates the mock's card-grid pattern for exactly two
// fields + a CTA, which DESIGN.md's Cards section allows as "a distinct editable/
// actionable module." New route, app/farm/page.tsx is untouched.
'use client';

import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Plus } from 'lucide-react';
import { useT } from '../../providers';
import { ModeLangToggle } from '../../../components/ModeLangToggle';
import { MockRail } from '../../../components/mock/MockRail';
import { SeasonStageStrip } from '../../../components/mock/SeasonStageStrip';
import { farm, fieldList } from '../../../lib/mock-data';

export default function MockFarmPage() {
  const { t } = useT();

  return (
    <AppShell height="fill" contentPadding={4} sideNav={<MockRail />} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4}>
        <VStack gap={0}>
          <Text type="display-3">{farm.name}</Text>
          <Text type="supporting" color="secondary">
            {farm.district} · AEZ {farm.aez}
          </Text>
          <Text type="supporting" color="secondary">
            {t('farm_screen_desc')}
          </Text>
        </VStack>

        <Grid columns={{ minWidth: 260 }} gap={3}>
          {fieldList.map((f) =>
            f.isReadOnly ? (
              <Card key={f.id} variant="muted">
                <VStack gap={2}>
                  <HStack justify="between" vAlign="center">
                    <Text type="label" weight="semibold">
                      {f.name}
                    </Text>
                    <Badge variant="neutral" label={t('field_status_harvested')} />
                  </HStack>
                  <Text type="supporting" color="secondary">
                    {f.areaHa} {t('unit_hectare')} · {f.crop ?? t('no_crop')}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {t('farm_south_field_note')}
                  </Text>
                </VStack>
              </Card>
            ) : (
              <Card key={f.id}>
                <VStack gap={2}>
                  <HStack justify="between" vAlign="center">
                    <Text type="label" weight="semibold">
                      {f.name}
                    </Text>
                    <Badge variant="green" label={t('field_status_active')} />
                  </HStack>
                  <Text type="supporting" color="secondary">
                    {f.areaHa} {t('unit_hectare')} · {f.crop ?? t('no_crop')}
                    {f.stage ? ` · ${t(`stage_${f.stage}`)}` : ''}
                  </Text>
                  <SeasonStageStrip compact />
                  <Button label={t('go_to_field')} variant="primary" href="/mock/field/overview" />
                </VStack>
              </Card>
            ),
          )}

          <Card variant="muted">
            <VStack gap={2} hAlign="center">
              <Icon icon={Plus} color="secondary" size="lg" />
              <Text type="label" weight="semibold">
                {t('add_field')}
              </Text>
              <Button label={t('add_field')} variant="secondary" href="/mock/onboarding" />
            </VStack>
          </Card>
        </Grid>
      </VStack>
    </AppShell>
  );
}
