// Marketplace & supplier comparison — ranks the season plan's remaining fertilizer/seed
// needs against the seeded mock catalog (GET /fields/:id/marketplace). Selecting a supplier
// (POST .../marketplace/select) writes to supplier_selections and re-runs compute_financials
// server-side, so Money/Checkout pick up the chosen price with no changes of their own.
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Table } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { useT, useSession } from '../../../providers';
import { ModeLangToggle } from '../../../../components/ModeLangToggle';
import { FieldRail } from '../../../../components/FieldRail';
import { bdt } from '../../../../lib/format';
import {
  getField,
  listFields,
  listRecentChats,
  getMarketplaceMatches,
  selectSupplier,
  type ApiField,
  type ApiRecentChat,
  type ApiMarketplaceMatches,
  type ApiItemMatch,
} from '../../../../lib/api';

const ITEM_LABEL_KEYS: Record<string, string> = {
  urea: 'item_urea', tsp: 'item_tsp', mop: 'item_mop', gypsum: 'item_gypsum', seed: 'item_seed',
};

export default function FieldBuyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useT();
  const { session, isHydrated } = useSession();

  const [field, setField] = useState<ApiField | null>(null);
  const [siblingFields, setSiblingFields] = useState<ApiField[]>([]);
  const [recentChats, setRecentChats] = useState<ApiRecentChat[]>([]);
  const [matches, setMatches] = useState<ApiMarketplaceMatches | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBy, setSelectedBy] = useState<Record<string, string>>({});
  const [selectingKey, setSelectingKey] = useState<string | null>(null);
  const [recomputeWarning, setRecomputeWarning] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!session) {
      router.push('/');
      return;
    }
    getField(id).then(setField).catch((err) => setError(String(err)));
    getMarketplaceMatches(id)
      .then((res) => {
        setMatches(res);
        // Hydrate "already selected" from the server so the badge survives a reload —
        // not just right after this session's own POST /marketplace/select.
        const alreadySelected: Record<string, string> = {};
        for (const item of res.items) {
          if (item.selectedSupplierId) alreadySelected[item.itemKey] = item.selectedSupplierId;
        }
        setSelectedBy(alreadySelected);
      })
      .catch((err) => setError(String(err)));
    if (session.farmId) {
      listFields(session.farmId).then((res) => setSiblingFields(res.fields)).catch(() => {});
      listRecentChats(session.farmId).then((res) => setRecentChats(res.chats)).catch(() => {});
    }
  }, [id, isHydrated, session, router]);

  function handleSelect(itemKey: string, supplierId: string) {
    setSelectingKey(`${itemKey}:${supplierId}`);
    selectSupplier(id, itemKey, supplierId)
      .then((res) => {
        setSelectedBy((prev) => ({ ...prev, [itemKey]: supplierId }));
        setRecomputeWarning(res.recomputeFailed);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setSelectingKey(null));
  }

  if (!isHydrated || !session) return null;

  const items: ApiItemMatch[] = matches?.items ?? [];

  return (
    <AppShell
      height="fill"
      contentPadding={4}
      sideNav={
        <FieldRail
          farmName={session.farmName ?? ''}
          farmDistrict={session.farmDistrict}
          farmAez={session.farmAez}
          fields={siblingFields}
          activeFieldId={id}
          recentChats={recentChats}
        />
      }
      topNav={<TopNav endContent={<ModeLangToggle />} />}
    >
      <VStack gap={3}>
        <VStack gap={0}>
          <Text type="label" color="secondary">
            {t('buy_eyebrow')}
          </Text>
          <Text type="display-3">{t('buy_title')}</Text>
          <Text type="supporting" color="secondary">
            {t('buy_desc')}
          </Text>
        </VStack>

        {field ? (
          <Text type="supporting" color="secondary">
            {field.name ?? t('field_unnamed')}
          </Text>
        ) : null}

        {error ? <Banner status="error" title={t('login_error_title')} description={error} /> : null}

        {recomputeWarning ? (
          <Banner status="warning" title={t('buy_recompute_warning_title')} description={t('buy_recompute_warning_desc')} />
        ) : null}

        {!matches ? (
          <Skeleton height={320} />
        ) : items.length === 0 ? (
          <Banner status="info" title={t('buy_empty_title')} description={t('buy_empty_desc')} />
        ) : (
          <VStack gap={4}>
            {items.map((item) => (
              <Card key={item.itemKey} padding={3}>
                <VStack gap={2}>
                  <HStack justify="between" vAlign="center">
                    <Text type="label" weight="semibold">
                      {t(ITEM_LABEL_KEYS[item.itemKey] ?? item.itemKey)} — {item.neededQty}
                      {item.unit}
                    </Text>
                    {selectedBy[item.itemKey] ? <Badge label={t('buy_selected_badge')} variant="green" /> : null}
                  </HStack>

                  {item.offers.length === 0 ? (
                    <Text type="supporting" color="secondary">
                      {t('buy_empty_desc')}
                    </Text>
                  ) : (
                    <Table
                      data={item.offers.map((o) => ({
                        id: o.supplierId,
                        supplier: `${o.name} (${o.district})`,
                        price: bdt(o.priceBdtPerKg),
                        delivery: `${o.deliveryDays}d`,
                        distance: `${o.distanceKm}km`,
                        rating: o.rating.toFixed(1),
                        action:
                          selectedBy[item.itemKey] === o.supplierId ? (
                            <Badge key={o.supplierId} label={t('buy_selected_badge')} variant="green" />
                          ) : (
                            <Button
                              key={o.supplierId}
                              label={t('buy_select_button')}
                              variant="secondary"
                              size="sm"
                              isDisabled={selectingKey === `${item.itemKey}:${o.supplierId}`}
                              onClick={() => handleSelect(item.itemKey, o.supplierId)}
                            />
                          ),
                      }))}
                      idKey="id"
                      columns={[
                        { key: 'supplier', header: t('table_supplier') },
                        { key: 'price', header: t('table_price_per_kg') },
                        { key: 'delivery', header: t('table_delivery_days') },
                        { key: 'distance', header: t('table_distance_km') },
                        { key: 'rating', header: t('table_rating') },
                        { key: 'action', header: '' },
                      ]}
                    />
                  )}
                </VStack>
              </Card>
            ))}
          </VStack>
        )}
      </VStack>
    </AppShell>
  );
}
