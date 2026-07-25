// Routes (§C.3) — thin mapping HTTP → controllers. Mounted under /api in app.ts.
import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { requestOtp, requestOtpSchema, verifyOtp, verifyOtpSchema } from '../controllers/auth.controller';
import { updateUser, updateUserSchema, deleteUser } from '../controllers/user.controller';
import { listFarms, createFarm, createFarmSchema, listFields, listRecentChats, createFarmConversation } from '../controllers/farm.controller';
import { getField, getFieldPlan, getFieldChatHistory, createFieldConversation, createField, createFieldSchema, getFieldLiveUpdate } from '../controllers/field.controller';
import { getConversation, updateConversation, updateConversationSchema } from '../controllers/conversation.controller';
import { markPlanEventDone } from '../controllers/planEvent.controller';
import { postChat, postChatSchema } from '../controllers/chat.controller';
import { postLog, postLogSchema } from '../controllers/log.controller';
import { postScenario, postScenarioSchema } from '../controllers/scenario.controller';
import { proposeBasket, proposeBasketSchema, approveAndDebit, approveAndDebitSchema } from '../controllers/payment.controller';

export const router = Router();

router.post('/auth/otp/request', validate(requestOtpSchema), requestOtp);
router.post('/auth/otp/verify', validate(verifyOtpSchema), verifyOtp);

router.patch('/users/:id', validate(updateUserSchema), updateUser);
router.delete('/users/:id', deleteUser);

router.get('/farms', listFarms);
router.post('/farms', validate(createFarmSchema), createFarm);
router.get('/farms/:id/fields', listFields);
router.get('/farms/:id/chats', listRecentChats);
router.post('/farms/:id/conversations', createFarmConversation);

router.post('/fields', validate(createFieldSchema), createField);
router.get('/fields/:id', getField);
router.get('/fields/:id/plan', getFieldPlan);
router.get('/fields/:id/live-update', getFieldLiveUpdate);
router.get('/fields/:id/chat', getFieldChatHistory);
router.post('/fields/:id/conversations', createFieldConversation);
router.post('/fields/:id/log', validate(postLogSchema), postLog);
router.post('/fields/:id/scenario', validate(postScenarioSchema), postScenario);

router.get('/conversations/:id', getConversation);
router.patch('/conversations/:id', validate(updateConversationSchema), updateConversation);

router.patch('/plan-events/:id/done', markPlanEventDone);

router.post('/chat', validate(postChatSchema), postChat);

router.post('/payment/propose', validate(proposeBasketSchema), proposeBasket);
router.post('/payment/approve', validate(approveAndDebitSchema), approveAndDebit);
