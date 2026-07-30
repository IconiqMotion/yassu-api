import {Router} from 'express';
import {validationMiddleware} from '../middlewares/validation.middleware';
import {rateLimitMiddleware} from '../middlewares/rate-limit.middleware';
import {deleteProfile, me, register, updateProfile, verify} from '../controllers/auth.controller';
import {VerifyDTO} from '../dto/auth/verifyDTO';
import {RegisterDTO} from '../dto/auth/registerDTO';
import {isAuthenticatedGuard} from "../guards";
import {UpdateProfileDTO} from "../dto/auth/updateProfileDTO";
import {parsePhone} from '../services/utils.service';
import multer from "multer";

export const router = Router();
const upload = multer();

const TEN_MINUTES = 10 * 60 * 1000;

// every register costs a real sms, so cap it. runs after validation, so req.body.phone is
// already a well formed number by the time parsePhone buckets it.
router.post(
	'/register',
	validationMiddleware(RegisterDTO),
	rateLimitMiddleware({ windowMs: TEN_MINUTES, max: 4, keyFrom: (req) => parsePhone(req.body.phone) }),
	rateLimitMiddleware({ windowMs: TEN_MINUTES, max: 20 }),
	register
);
router.post('/verify', validationMiddleware(VerifyDTO), verify);
router.get('/me', isAuthenticatedGuard, me);
router.post('/me', isAuthenticatedGuard, validationMiddleware(UpdateProfileDTO), updateProfile);
router.delete('/me', isAuthenticatedGuard, deleteProfile);
