// Cost ledger with a click-to-edit unit price on one row — the mock's Money-tab table,
// minus its native prompt() edit (replaced with a Popover + NumberInput).
'use client';

import { useState } from 'react';
import { Table } from '@astryxdesign/core/Table';
import { Popover } from '@astryxdesign/core/Popover';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Pencil } from 'lucide-react';
import type { LedgerEntry } from '@agrisense/shared';
import { useT } from '../../app/providers';
import { bdt } from '../../lib/format';

export function EditableLedgerTable({
  lineItems,
  editableItemId,
  originalUnitCost,
  currentUnitCost,
  onEditUnitCost,
  onResetUnitCost,
}: {
  lineItems: LedgerEntry[];
  editableItemId: string;
  originalUnitCost: number;
  currentUnitCost: number;
  onEditUnitCost: (value: number) => void;
  onResetUnitCost: () => void;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState<number | null>(currentUnitCost);
  const isEdited = currentUnitCost !== originalUnitCost;

  return (
    <Table
      data={lineItems.map((l) => ({
        id: l.id,
        item:
          l.id === editableItemId ? (
            <HStack gap={1} vAlign="center">
              <Text type="label">{l.item}</Text>
              <Popover
                label={t('money_edit_urea_action')}
                className={undefined}
                style={undefined}
                content={
                  <VStack gap={2} padding={3} width={220}>
                    <NumberInput label={t('money_edit_urea_action')} value={draft} onChange={setDraft} units="৳/kg" />
                    <Button
                      label={t('continue')}
                      variant="primary"
                      size="sm"
                      isDisabled={draft == null}
                      onClick={() => draft != null && onEditUnitCost(draft)}
                    />
                  </VStack>
                }
              >
                <Button label={t('money_edit_urea_action')} variant="ghost" size="sm" icon={<Pencil size={14} />} isIconOnly />
              </Popover>
              {isEdited ? <Badge variant="yellow" label={t('money_edited_badge')} /> : null}
            </HStack>
          ) : (
            l.item
          ),
        detail:
          l.id === editableItemId && isEdited ? (
            <Text type="supporting" color="secondary">
              <s>{bdt(originalUnitCost)}/kg</s> → {bdt(currentUnitCost)}/kg
            </Text>
          ) : (
            (l.assumption ?? (l.qty != null ? `${l.qty}${l.unit ?? ''} @ ${l.unitCost != null ? bdt(l.unitCost) : ''}` : ''))
          ),
        amount: `${l.kind === 'cost' ? '−' : '+'}${bdt(l.total)}`,
        actions:
          l.id === editableItemId && isEdited ? (
            <Button label={t('money_reset_urea_action')} variant="ghost" size="sm" onClick={onResetUnitCost} />
          ) : null,
      }))}
      idKey="id"
      columns={[
        { key: 'item', header: t('table_item') },
        { key: 'detail', header: t('table_detail') },
        { key: 'amount', header: t('table_amount') },
        { key: 'actions', header: '' },
      ]}
    />
  );
}
