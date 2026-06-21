import {Router} from 'express';
import {isAuthenticatedGuard} from "../guards";
import {
    create,
    createGroup,
    deleteGroup,
    editGroup,
    getGroupById,
    getGroupByHash,
    getGroupHash,
    getMyGroups,
    inviteMembersToGroup,
    withdrawMoney,
    acceptGroupInvitation,
    rejectGroupInvitation,
    getMyGroupInvitations,
    deleteAllGroupsTest
} from "../controllers/group.controller";
import {validationMiddleware} from "../middlewares/validation.middleware";
import {SendGroupGiftDTO, WithdrawMoneyDTO} from "../dto/sendGiftDTO";

export const router = Router();

//router.delete('/test/delete-all', deleteAllGroupsTest);

// Public endpoint (no authentication) - must be before other routes with parameters
router.get('/public/:hash', getGroupByHash);

router.get('/my', isAuthenticatedGuard, getMyGroups);
router.get('/invitations', isAuthenticatedGuard, getMyGroupInvitations);
router.get('/:id/hash', isAuthenticatedGuard, getGroupHash); // Get encoded hash for group ID
router.post('/', isAuthenticatedGuard, createGroup);
router.post('/:id/withdraw-request', isAuthenticatedGuard, validationMiddleware(WithdrawMoneyDTO), withdrawMoney);
router.post('/event', isAuthenticatedGuard, validationMiddleware(SendGroupGiftDTO), create);
router.post('/:id/members', isAuthenticatedGuard, inviteMembersToGroup);
router.post('/:id/accept', isAuthenticatedGuard, acceptGroupInvitation);
router.post('/:id/reject', isAuthenticatedGuard, rejectGroupInvitation);
router.post('/:id', isAuthenticatedGuard, editGroup);
router.get('/:id', isAuthenticatedGuard, getGroupById);
