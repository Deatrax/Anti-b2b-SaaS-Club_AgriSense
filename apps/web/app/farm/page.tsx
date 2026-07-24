// Farm / field list. Raw Astryx components only, no wrapper components — colors +
// mockup data pass over the neutral scaffold. See Docs/inventory_import.md and
// Docs/AgriSense_Wireframe.html.
import { AppShell } from '@astryxdesign/core/AppShell';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { List, ListItem } from '@astryxdesign/core/List';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';

export default function FarmPage() {
  return (
    <AppShell height="fill" contentPadding={4}>
      <VStack gap={4}>
        <HStack justify="between" vAlign="center">
          <Text type="display-3">Karim's farm</Text>
          <Button label="Add field" variant="primary" />
        </HStack>
        <Divider />
        <List hasDividers>
          <ListItem label="North field" description="Gazipur · AEZ 28 · 0.49 ha (1.2 bigha) · Boro rice, tillering" />
          <ListItem label="South field" description="Gazipur · AEZ 28 · 0.32 ha · Aman rice, harvested" />
        </List>
      </VStack>
    </AppShell>
  );
}
