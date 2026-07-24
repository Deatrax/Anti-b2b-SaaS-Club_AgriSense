// Checkout step 2 — the posted-charge receipt. Values are literal simulator output, same
// spirit as lib/mock-data.ts's own approveChargeFeedItems().
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { useT } from '../../app/providers';
import { bdt } from '../../lib/format';

export function PaymentReceiptCard({
  amountBdt,
  msisdn,
  statusCode,
  internalTrxId,
  referenceId,
  onReplay,
}: {
  amountBdt: number;
  msisdn: string;
  statusCode: string;
  internalTrxId: string;
  referenceId: string;
  onReplay: () => void;
}) {
  const { t } = useT();

  return (
    <Card variant="green" padding={3}>
      <VStack gap={2}>
        <HStack justify="between" vAlign="center">
          <Text type="label" weight="semibold">
            {t('checkout_receipt_title')}
          </Text>
          <Badge variant="green" label={statusCode} />
        </HStack>
        <Text type="display-3">{bdt(amountBdt)}</Text>
        <MetadataList>
          <MetadataListItem label={t('balance_available')}>{msisdn}</MetadataListItem>
          <MetadataListItem label="Internal Trx ID">{internalTrxId}</MetadataListItem>
          <MetadataListItem label="Reference ID">{referenceId}</MetadataListItem>
        </MetadataList>
        <Text type="supporting" color="secondary">
          {t('checkout_receipt_note_desc')}
        </Text>
        <Button label={t('checkout_replay')} variant="ghost" onClick={onReplay} />
      </VStack>
    </Card>
  );
}
