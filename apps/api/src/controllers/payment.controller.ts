// C — bdapps checkout. Propose basket → HITL approve → balance query → debit → receipt (§A.3).
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CAAS_STATUS } from '@agrisense/shared';
import { FieldModel } from '../models/field.model';
import { LedgerModel } from '../models/ledger.model';
import { TransactionModel } from '../models/transaction.model';
import { caasClient, resolveSubscriberId, resolveUserPhone, processDirectDebit } from '../services/tools/payment.tools';
import { serializeReceipt } from '../views/receipt.view';

const FERTILIZER_CARRIERS = ['urea', 'tsp', 'mop', 'gypsum'];

export const proposeBasketSchema = z.object({ fieldId: z.string().min(1) });

export async function proposeBasket(req: Request, res: Response, next: NextFunction) {
  const { fieldId } = req.body as z.infer<typeof proposeBasketSchema>;
  try {
    const field = await FieldModel.getState(fieldId);
    const cycle = field.activeCycle;
    if (!cycle) {
      res.status(400).json({ error: 'no active crop cycle — nothing to check out yet.' });
      return;
    }

    const ledger = await LedgerModel.listByCycle(cycle.id);
    const items = ledger.filter(
      (l) => l.kind === 'cost' && !l.isActual && FERTILIZER_CARRIERS.some((c) => l.item.startsWith(c)),
    );
    if (items.length === 0) {
      res.status(400).json({ error: 'no pending fertilizer costs found on the season plan to check out.' });
      return;
    }

    const totalBdt = items.reduce((sum, l) => sum + l.total, 0);
    const externalTrxId = `AGRISENSE-${randomUUID()}`;
    const phone = await resolveUserPhone(fieldId);

    await TransactionModel.propose(fieldId, externalTrxId, totalBdt, phone);

    const subscriberId = await resolveSubscriberId(fieldId);
    const balance = await caasClient.queryBalance(subscriberId);

    res.status(201).json({
      externalTrxId,
      items: items.map((l) => ({ id: l.id, item: l.item, qty: l.qty, unit: l.unit, unitCost: l.unitCost, total: l.total })),
      totalBdt,
      balanceBdt: balance.chargeableBalance,
    });
  } catch (err) {
    next(err);
  }
}

export const approveAndDebitSchema = z.object({ externalTrxId: z.string().min(1) });

export async function approveAndDebit(req: Request, res: Response, next: NextFunction) {
  const { externalTrxId } = req.body as z.infer<typeof approveAndDebitSchema>;
  try {
    await TransactionModel.approve(externalTrxId);

    const txn = await TransactionModel.findApproved(externalTrxId);
    if (!txn) {
      res.status(404).json({ error: `transaction ${externalTrxId} not found` });
      return;
    }

    const subscriberId = `tel:88${txn.msisdn}`;
    const balance = await caasClient.queryBalance(subscriberId);
    if (balance.chargeableBalance < txn.amount_bdt) {
      res.status(400).json({
        error: `insufficient balance: ৳${balance.chargeableBalance} available, ৳${txn.amount_bdt} required.`,
        balanceBdt: balance.chargeableBalance,
      });
      return;
    }

    const result = await processDirectDebit(externalTrxId);

    if (result.statusCode === CAAS_STATUS.SUCCESS && txn.field_id) {
      const field = await FieldModel.getState(txn.field_id);
      if (field.activeCycle) {
        await LedgerModel.postActual(field.activeCycle.id, {
          id: '',
          cropCycleId: field.activeCycle.id,
          kind: 'cost',
          item: 'bdapps payment — fertilizer purchase',
          qty: null,
          unit: null,
          unitCost: null,
          total: txn.amount_bdt,
          source: 'bdapps CaaS (directDebit)',
          assumption: null,
          isActual: true,
          occurredOn: new Date().toISOString().slice(0, 10),
          transactionId: txn.id,
        });
      }
    }

    const settled = await TransactionModel.findApproved(externalTrxId);
    if (result.statusCode !== CAAS_STATUS.SUCCESS) {
      res.status(400).json({ error: result.statusDetail, statusCode: result.statusCode, receipt: settled ? serializeReceipt(settled) : null });
      return;
    }

    res.json({ receipt: serializeReceipt(settled!) });
  } catch (err) {
    next(err);
  }
}
