import { Router } from 'express';
import { router as AuthRoutes } from './auth.routes';
import { router as FilesRoutes } from './files.routes';
import { router as GiftRoutes } from './gift.routes';
import { router as CardRoutes } from './card.routes';
import { router as EventRoutes } from './event.routes';
import { router as StaticRoutes } from './static.routes';
import { router as GroupRoutes } from './group.routes';
import { router as HomeRoutes } from './home.routes';
import { router as NotificationRoutes } from './notification.routes';
import { router as AdminRoutes } from './admin.routes';
import { router as BankAccountRoutes } from './bank-account.routes';
import {isAuthenticatedGuard} from "../guards";

const APIRouter = Router({ mergeParams: true });


APIRouter.use('/files', isAuthenticatedGuard, FilesRoutes);
APIRouter.use('/auth', AuthRoutes);
APIRouter.use('/home', HomeRoutes);
APIRouter.use('/gift', GiftRoutes);
APIRouter.use('/greeting', GiftRoutes);
APIRouter.use('/card', CardRoutes);
APIRouter.use('/event', EventRoutes);
APIRouter.use('/static', StaticRoutes);
APIRouter.use('/group', GroupRoutes);
APIRouter.use('/notifications', NotificationRoutes);
APIRouter.use('/admin', AdminRoutes);
APIRouter.use('/bank-account', isAuthenticatedGuard, BankAccountRoutes);

export default APIRouter;
