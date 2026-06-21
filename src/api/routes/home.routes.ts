import {Router} from 'express';
import {isAuthenticatedGuard} from "../guards";
import {getHomePageData} from "../controllers/home.controller";

export const router = Router();

router.get('/', isAuthenticatedGuard, getHomePageData);
