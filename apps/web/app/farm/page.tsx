// Farm / field list. Raw Astryx components only, no wrapper components — colors +
// mockup data pass over the neutral scaffold. See Docs/inventory_import.md and
// Docs/AgriSense_Wireframe.html.
'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { List, ListItem } from '@astryxdesign/core/List';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Badge } from '@astryxdesign/core/Badge';
import { useT } from '../providers';
import { ModeLangToggle } from '../../components/ModeLangToggle';
import { farm, fieldList } from '../../lib/mock-data';

export default function FarmPage() {
  const { t } = useT();
  const router = useRouter();

  return (
    <AppShell height="fill" contentPadding={4} topNav={<TopNav endContent={<ModeLangToggle />} />}>
      <VStack gap={4}>
        <HStack justify="between" vAlign="center">
          <VStack gap={0}>
            <Text type="display-3">{farm.name}</Text>
            <Text type="supporting" color="secondary">
              {farm.district} · AEZ {farm.aez}
            </Text>
          </VStack>
          <Button label={t('add_field')} variant="primary" onClick={() => router.push('/field/new')} />
        </HStack>
        <Divider />
        <Text type="label" weight="semibold">
          {t('farm_fields_heading')}
        </Text>
        <List hasDividers>
          {fieldList.map((f) => (
            <ListItem
              key={f.id}
              label={f.name}
              description={`${f.areaHa} ${t('unit_hectare')} · ${f.crop ?? t('no_crop')}${f.stage ? ` · ${t(`stage_${f.stage}`)}` : ''}`}
              href={`/field/${f.id}`}
              endContent={
                <HStack gap={1.5} vAlign="center">
                  <Badge
                    variant={f.status === 'active' ? 'green' : 'neutral'}
                    label={f.status === 'active' ? t('field_status_active') : t('field_status_harvested')}
                  />
                  {f.isReadOnly ? <Badge variant="neutral" label={t('field_read_only')} /> : null}
                </HStack>
              }
            />
          ))}
        </List>
      </VStack>
    </AppShell>
  );
}
