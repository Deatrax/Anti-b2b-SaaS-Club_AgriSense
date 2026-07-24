// Routes (§C.3) — thin mapping HTTP → controllers. Mounted under /api in app.ts.
import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { login, loginSchema } from '../controllers/auth.controller';
import { listFarms, createFarm, createFarmSchema } from '../controllers/farm.controller';
import { getField, getFieldPlan } from '../controllers/field.controller';
import { postChat, postChatSchema } from '../controllers/chat.controller';
import { postLog } from '../controllers/log.controller';
import { postScenario } from '../controllers/scenario.controller';
import { proposeBasket, approveAndDebit } from '../controllers/payment.controller';

export const router = Router();

router.post('/auth/login', validate(loginSchema), login);

router.get('/farms', listFarms);
router.post('/farms', validate(createFarmSchema), createFarm);

router.get('/fields/:id', getField);
router.get('/fields/:id/plan', getFieldPlan);
router.post('/fields/:id/log', postLog);
router.post('/fields/:id/scenario', postScenario);

router.post('/chat', validate(postChatSchema), postChat);

router.post('/payment/propose', proposeBasket);
router.post('/payment/approve', approveAndDebit);
