// Routes (§C.3) — thin mapping HTTP → controllers. Mounted under /api in app.ts.
import { Router } from 'express';
import { login } from '../controllers/auth.controller';
import { listFarms, createFarm } from '../controllers/farm.controller';
import { getField, getFieldPlan } from '../controllers/field.controller';
import { postChat } from '../controllers/chat.controller';
import { postLog } from '../controllers/log.controller';
import { postScenario } from '../controllers/scenario.controller';
import { proposeBasket, approveAndDebit } from '../controllers/payment.controller';

export const router = Router();

router.post('/auth/login', login);

router.get('/farms', listFarms);
router.post('/farms', createFarm);

router.get('/fields/:id', getField);
router.get('/fields/:id/plan', getFieldPlan);
router.post('/fields/:id/log', postLog);
router.post('/fields/:id/scenario', postScenario);

router.post('/chat', postChat);

router.post('/payment/propose', proposeBasket);
router.post('/payment/approve', approveAndDebit);
