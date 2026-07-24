// Full-page weather detail, opened from the Overview weather card — per stakeholder
// feedback (screenshot review, 2026-07-24): "clicking on this is going to open this in a
// full page modal." Same Dialog/Layout/LayoutContent composition app/field/[id]/page.tsx
// already uses for its field-details dialog.
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Citation } from '@astryxdesign/core/Citation';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { useT } from '../../app/providers';
import { weather } from '../../lib/mock-data';

export function WeatherDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  const { t } = useT();

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={<DialogHeader title={t('card_weather')} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <VStack gap={0}>
                <Text type="display-2">
                  {weather.tempMinC}–{weather.tempMaxC}°C
                </Text>
                <Text type="supporting" color="secondary">
                  {t('weather_updated')} <Timestamp value={weather.retrievedAt} format="relative" />
                </Text>
              </VStack>
              <MetadataList>
                <MetadataListItem label={t('weather_temp')}>
                  {weather.tempMinC}–{weather.tempMaxC}°C
                </MetadataListItem>
                <MetadataListItem label={t('weather_rain')}>{weather.rainMm7d}mm</MetadataListItem>
                <MetadataListItem label={t('weather_rain_probability_label')}>{weather.rainProbabilityMax}%</MetadataListItem>
                <MetadataListItem label={t('weather_et0')}>{weather.et0MmDay}mm/d</MetadataListItem>
              </MetadataList>
              <Citation source={{ title: weather.source }} number={1} />
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
