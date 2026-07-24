// HITL approval gate — Checkout step 0. Same "agent proposes a charge" pattern already
// built inline in app/field/[id]/page.tsx's money tab, lifted into its own component for
// the dedicated Checkout screen.
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { List, ListItem } from '@astryxdesign/core/List';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { useT } from '../../app/providers';
import { bdt } from '../../lib/format';
import type { CaasBasketItem } from '../../lib/mock-data';

export function HitlApprovalCard({
  items,
  totalBdt,
  balanceBdt,
  isInsufficient,
  onApprove,
  onCancel,
}: {
  items: CaasBasketItem[];
  totalBdt: number;
  balanceBdt: number;
  isInsufficient: boolean;
  onApprove: () => void;
  onCancel: () => void;
}) {
  const { t, tf } = useT();

  return (
    <Card variant="yellow" padding={3}>
      <VStack gap={2}>
        <Text type="label" weight="semibold">
          {t('checkout_hitl_waiting')}
        </Text>
        <Text type="supporting">{tf('approve_charge_desc', { amount: bdt(totalBdt) })}</Text>
        <List hasDividers>
          {items.map((row) => (
            <ListItem
              key={row.item}
              label={`${row.item} · ${row.qty} ${row.unit} @ ${bdt(row.unitCostBdt)}`}
              endContent={<Text type="supporting">{bdt(row.totalBdt)}</Text>}
            />
          ))}
        </List>
        <Text type="supporting" color="secondary">
          {t('checkout_charged_to')}: {bdt(balanceBdt)}
        </Text>
        {isInsufficient ? (
          <Banner status="error" title={t('checkout_insufficient_title')} description={t('checkout_insufficient_desc')} />
        ) : null}
        <VStack gap={1.5}>
          <Button
            label={tf('approve_charge_button', { amount: bdt(totalBdt) })}
            variant="primary"
            isDisabled={isInsufficient}
            onClick={onApprove}
          />
          <Button label={t('checkout_cancel')} variant="ghost" onClick={onCancel} />
        </VStack>
      </VStack>
    </Card>
  );
}
