// Numeric stepper — AGRISENSE_V2_DESIGN_ARCHITECTURE.md §6's `.stepper` component
// ("value, minus/plus buttons ... small numerical adjustment for field area"). Built from
// Button's documented icon-only mode (no separate IconButton export in this Astryx
// version), not a NumberInput — the doc is explicit that this is a stepper, not a typed
// field.
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Minus, Plus } from 'lucide-react';

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 0.1,
  formatValue,
  decrementLabel,
  incrementLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue: (value: number) => string;
  decrementLabel: string;
  incrementLabel: string;
}) {
  const round = (n: number) => Math.round(n * 100) / 100;

  return (
    <HStack gap={2} vAlign="center">
      <Button label={decrementLabel} variant="secondary" size="sm" isIconOnly icon={<Minus size={14} />} isDisabled={value <= min} onClick={() => onChange(round(Math.max(min, value - step)))} />
      <Text type="label" weight="semibold">
        {formatValue(value)}
      </Text>
      <Button label={incrementLabel} variant="secondary" size="sm" isIconOnly icon={<Plus size={14} />} isDisabled={value >= max} onClick={() => onChange(round(Math.min(max, value + step)))} />
    </HStack>
  );
}
