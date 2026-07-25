// Season stage-strip — mock's stagestrip component. Uses ProgressBar directly: the
// theme's progressbar-fill override already renders the exact positive-green -> ai-lime
// gradient DESIGN.md specifies for crop-stage progress (theme/farmesy.theme.ts), so no
// custom gradient CSS is needed here.
import { RICE_STAGES } from '@agrisense/shared';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { useT } from '../../app/providers';
import { cropCycle } from '../../lib/mock-data';

const STAGE_INDEX = cropCycle.stage ? RICE_STAGES.indexOf(cropCycle.stage as (typeof RICE_STAGES)[number]) : -1;
const CYCLE_TOTAL_DAYS =
  cropCycle.sowingDate && cropCycle.expectedHarvest
    ? Math.round((new Date(cropCycle.expectedHarvest).getTime() - new Date(cropCycle.sowingDate).getTime()) / 86_400_000)
    : 150;

export function SeasonStageStrip({ compact = false }: { compact?: boolean }) {
  const { t, tf } = useT();

  return (
    <VStack gap={1.5}>
      <ProgressBar
        label={t('card_crop_stage')}
        isLabelHidden
        value={cropCycle.dayIndex ?? 0}
        max={CYCLE_TOTAL_DAYS}
        variant="success"
        hasValueLabel
        formatValueLabel={() => tf('day_progress', { n: cropCycle.dayIndex ?? 0 })}
      />
      {!compact ? (
        <HStack gap={2} vAlign="center" wrap="wrap">
          {RICE_STAGES.map((stage, i) => (
            <HStack key={stage} gap={1.5} vAlign="center">
              <StatusDot
                variant={i < STAGE_INDEX ? 'success' : i === STAGE_INDEX ? 'accent' : 'neutral'}
                label={t(`stage_${stage}`)}
                isPulsing={i === STAGE_INDEX}
              />
              <Text type="supporting">{t(`stage_${stage}`)}</Text>
            </HStack>
          ))}
        </HStack>
      ) : null}
    </VStack>
  );
}
