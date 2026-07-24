// Phone entry. Raw Astryx components only, no wrapper components — colors +
// mockup data pass over the neutral scaffold. See Docs/inventory_import.md and
// Docs/AgriSense_Wireframe.html.
'use client';

import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Center } from '@astryxdesign/core/Center';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';

export default function Home() {
  const [phone, setPhone] = useState('');

  return (
    <AppShell height="fill" contentPadding={4}>
      <Center height="100%">
        <VStack gap={6} width={360}>
          <Text type="display-3">AgriSense AI</Text>
          <FormLayout>
            <TextInput label="Phone number" placeholder="017XXXXXXXX" value={phone} onChange={setPhone} />
            <Button label="Continue" variant="primary" width="100%" />
          </FormLayout>
        </VStack>
      </Center>
    </AppShell>
  );
}
