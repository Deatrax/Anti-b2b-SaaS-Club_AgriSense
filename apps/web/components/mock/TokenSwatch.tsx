// Color swatch for the /mock/tokens reference screen. Renders a literal token color by
// design — that's the whole point of this page — but always through `var(--token-name)`,
// never a hardcoded hex, per the plan's inline-style exception.
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export function TokenSwatch({ varName, label, description }: { varName: string; label: string; description: string }) {
  return (
    <VStack gap={1.5}>
      <div
        style={{
          background: `var(${varName})`,
          height: 56,
          borderRadius: 'var(--radius-element)',
          border: '1px solid var(--color-border)',
        }}
      />
      <VStack gap={0}>
        <Text type="label" weight="semibold">
          {label}
        </Text>
        <Text type="supporting" color="secondary">
          {varName}
        </Text>
        <Text type="supporting" color="secondary">
          {description}
        </Text>
      </VStack>
    </VStack>
  );
}
