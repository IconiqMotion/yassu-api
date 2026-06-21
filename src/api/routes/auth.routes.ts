import {Router} from 'express';
import {validationMiddleware} from '../middlewares/validation.middleware';
import {deleteProfile, me, register, updateProfile, verify} from '../controllers/auth.controller';
import {VerifyDTO} from '../dto/auth/verifyDTO';
import {RegisterDTO} from '../dto/auth/registerDTO';
import {isAuthenticatedGuard} from "../guards";
import {UpdateProfileDTO} from "../dto/auth/updateProfileDTO";
import multer from "multer";

export const router = Router();
const upload = multer();

router.post('/register', validationMiddleware(RegisterDTO), register);
router.post('/verify', validationMiddleware(VerifyDTO), verify);
router.get('/me', isAuthenticatedGuard, me);
router.post('/me', isAuthenticatedGuard, validationMiddleware(UpdateProfileDTO), updateProfile);
router.delete('/me', isAuthenticatedGuard, deleteProfile);
