// The "Field record — filling in live" panel from the v2 intake mockup: the six Tier-0
// intake fields (§1.2 #1) shown as a checklist that fills in as the agent gathers them via
// update_field. Memory made into a visible artifact — a farmer (or judge) sees the record
// populate independently of the chat, which is what makes the flow read as orchestrated
// rather than a plain chatbot. The caller re-fetches the field after each agent turn so this
// updates live.
'use client';

import { VStack, HStack, StackItem } from '@astryxdesign/core/Stack';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Icon } from '@astryxdesign/core/Icon';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { MapPin, Ruler, Layers, Droplets, Wallet, CalendarClock, Check, Sprout, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IntakeField } from '@agrisense/shared';
import { useT } from '../app/providers';
import { bdt } from '../lib/format';
import type { ApiField } from '../lib/api';

const ROWS: { key: IntakeField; labelKey: string; icon: LucideIcon }[] = [
  { key: 'name', labelKey: 'intake_name', icon: Tag },
  { key: 'location', labelKey: 'intake_location', icon: MapPin },
  { key: 'area_ha', labelKey: 'intake_area', icon: Ruler },
  { key: 'soil_type', labelKey: 'intake_soil', icon: Layers },
  { key: 'water_source', labelKey: 'intake_water', icon: Droplets },
  { key: 'budget_bdt', labelKey: 'intake_budget', icon: Wallet },
  { key: 'target_season', labelKey: 'intake_season', icon: CalendarClock },
];

export function IntakePanel({ field, farmDistrict, fieldId }: { field: ApiField; farmDistrict?: string | null; fieldId: string }) {
  const { t, tf } = useT();
  const missing = new Set(field.missingFields);
  const done = ROWS.length - ROWS.filter((r) => missing.has(r.key)).length;
  const complete = missing.size === 0;
  const activeCrop = field.activeCycle?.crop ?? null;

  function valueFor(key: IntakeField): string {
    switch (key) {
      case 'name':
        return field.name ?? t('intake_set');
      case 'location':
        return farmDistrict ?? t('intake_set');
      case 'area_ha':
        return field.areaHa != null ? `${field.areaHa} ${t('unit_hectare')}` : '';
      case 'soil_type':
        return field.soilType ? t(`soil_${field.soilType}`) : '';
      case 'water_source':
        return field.waterSource ? t(`water_${field.waterSource}`) : '';
      case 'budget_bdt':
        return field.budgetBdt != null ? bdt(field.budgetBdt) : '';
      case 'target_season': {
        const season = field.targetSeason ?? field.activeCycle?.season;
        return season ? t(`season_${season}`) : t('intake_set');
      }
    }
  }

  return (
    <Card>
      <VStack gap={3}>
        <HStack justify="between" vAlign="center">
          <Text type="label" weight="semibold">
            {t('onboarding_record_heading')}
          </Text>
          <Badge
            variant={complete ? 'green' : 'yellow'}
            label={complete ? t('intake_ready_title') : tf('intake_progress', { done })}
          />
        </HStack>

        <VStack gap={0}>
          {ROWS.map((row, i) => {
            const filled = !missing.has(row.key);
            const value = valueFor(row.key);
            return (
              <VStack key={row.key} gap={0}>
                {i > 0 ? <Divider /> : null}
                <HStack gap={2.5} vAlign="center" padding={{ block: 2 }}>
                  <Icon icon={row.icon} color={filled ? 'accent' : 'secondary'} size="sm" />
                  <StackItem size="fill">
                    <Text type="supporting" color="secondary">
                      {t(row.labelKey)}
                    </Text>
                  </StackItem>
                  {filled ? (
                    <>
                      <Text type="supporting" weight="semibold">
                        {value}
                      </Text>
                      <Icon icon={Check} color="success" size="sm" />
                    </>
                  ) : (
                    <Text type="supporting" color="disabled">
                      {t('onboarding_not_given')}
                    </Text>
                  )}
                </HStack>
              </VStack>
            );
          })}
        </VStack>

        {complete ? (
          <Card variant="muted" padding={3}>
            <VStack gap={1.5}>
              <HStack gap={1.5} vAlign="center">
                <Icon icon={Sprout} color="accent" size="sm" />
                <Text type="label" weight="semibold">
                  {activeCrop ? tf('intake_active_crop', { crop: activeCrop.replace(/_/g, ' ') }) : t('intake_ready_title')}
                </Text>
              </HStack>
              <Text type="supporting" color="secondary">
                {t('intake_ready_desc')}
              </Text>
              <Button label={t('field_season_plan_nav')} variant="secondary" size="sm" href={`/field/${fieldId}/plan`} />
            </VStack>
          </Card>
        ) : null}
      </VStack>
    </Card>
  );
}
