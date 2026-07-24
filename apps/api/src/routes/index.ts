// Routes (§C.3) — thin mapping HTTP → controllers. Mounted under /api in app.ts.
import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { requestOtp, requestOtpSchema, verifyOtp, verifyOtpSchema } from '../controllers/auth.controller';
import { listFarms, createFarm, createFarmSchema, listFields } from '../controllers/farm.controller';
import { getField, getFieldPlan, createField, createFieldSchema } from '../controllers/field.controller';
import { postChat, postChatSchema } from '../controllers/chat.controller';
import { postLog, postLogSchema } from '../controllers/log.controller';
import { postScenario, postScenarioSchema } from '../controllers/scenario.controller';
import { proposeBasket, proposeBasketSchema, approveAndDebit, approveAndDebitSchema } from '../controllers/payment.controller';

export const router = Router();

router.post('/auth/otp/request', validate(requestOtpSchema), requestOtp);
router.post('/auth/otp/verify', validate(verifyOtpSchema), verifyOtp);

router.get('/farms', listFarms);
router.post('/farms', validate(createFarmSchema), createFarm);
router.get('/farms/:id/fields', listFields);

router.post('/fields', validate(createFieldSchema), createField);
router.get('/fields/:id', getField);
router.get('/fields/:id/plan', getFieldPlan);
router.post('/fields/:id/log', validate(postLogSchema), postLog);
router.post('/fields/:id/scenario', validate(postScenarioSchema), postScenario);

router.post('/chat', validate(postChatSchema), postChat);

router.post('/payment/propose', validate(proposeBasketSchema), proposeBasket);
router.post('/payment/approve', validate(approveAndDebitSchema), approveAndDebit);
