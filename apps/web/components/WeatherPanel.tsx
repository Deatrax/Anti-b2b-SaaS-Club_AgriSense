// Weather mini-card + full-page modal — real data only, sourced from the live feed's most
// recent get_weather tool result (lib/weather.ts). Per stakeholder feedback (screenshot
// review): "clicking on this is going to open this in a full page modal."
'use client';

import { useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Citation } from '@astryxdesign/core/Citation';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { useT } from '../app/providers';
import type { ForecastSummary } from '../lib/weather';

function sum(values: number[], count: number): number {
  return Math.round(values.slice(0, count).reduce((s, v) => s + v, 0));
}

export function WeatherPanel({ forecast, onAskWeather }: { forecast: ForecastSummary | null; onAskWeather: () => void }) {
  const { t } = useT();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <VStack gap={2}>
        <HStack gap={1.5} vAlign="center">
          <Icon icon="info" color="accent" />
          <Text type="label" weight="semibold">
            {t('card_weather')}
          </Text>
        </HStack>

        {forecast ? (
          <>
            <HStack gap={1.5} vAlign="center">
              <Text type="display-3">
                {Math.round(forecast.daily.temperature_2m_min[0] ?? 0)}–{Math.round(forecast.daily.temperature_2m_max[0] ?? 0)}°C
              </Text>
            </HStack>
            <Text type="supporting" color="secondary">
              {t('weather_rain_7d')}: {sum(forecast.daily.precipitation_sum, 7)}mm
              {forecast.stale ? ` · ${t('weather_stale')}` : ''}
            </Text>
            <Button label={t('weather_view_details')} variant="ghost" size="sm" endContent={<Icon icon="chevronRight" size="xsm" />} onClick={() => setIsOpen(true)} />
          </>
        ) : (
          <>
            <Text type="supporting" color="secondary">
              {t('weather_not_checked')}
            </Text>
            <Button label={t('weather_check')} variant="secondary" size="sm" onClick={onAskWeather} />
          </>
        )}
      </VStack>

      <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
        <Layout
          header={<DialogHeader title={t('card_weather')} onOpenChange={setIsOpen} />}
          content={
            <LayoutContent>
              {forecast ? (
                <VStack gap={4}>
                  <VStack gap={0}>
                    <Text type="display-2">
                      {Math.round(forecast.daily.temperature_2m_min[0] ?? 0)}–{Math.round(forecast.daily.temperature_2m_max[0] ?? 0)}°C
                    </Text>
                    <Text type="supporting" color="secondary">
                      {t('weather_updated')} <Timestamp value={forecast.cachedAt} format="relative" />
                    </Text>
                  </VStack>
                  <MetadataList>
                    <MetadataListItem label={t('weather_rain_7d')}>{sum(forecast.daily.precipitation_sum, 7)}mm</MetadataListItem>
                    <MetadataListItem label={t('weather_rain_probability_label')}>{Math.round(forecast.daily.precipitation_probability_max[0] ?? 0)}%</MetadataListItem>
                    <MetadataListItem label={t('weather_et0')}>{(forecast.daily.et0_fao_evapotranspiration[0] ?? 0).toFixed(1)}mm/d</MetadataListItem>
                    <MetadataListItem label={t('weather_forecast_days')}>{forecast.daily.time.length}</MetadataListItem>
                  </MetadataList>
                  <Citation source={{ title: 'Open-Meteo (ECMWF)' }} number={1} />
                </VStack>
              ) : (
                <Text type="supporting" color="secondary">
                  {t('weather_not_checked')}
                </Text>
              )}
            </LayoutContent>
          }
        />
      </Dialog>
    </Card>
  );
}
