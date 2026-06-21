import {Request, Response} from 'express';
import {Container} from 'typedi';
import {ResHandlerService} from '../services/res-handler.service';
import {BadRequestError} from '../errors';
import {GroupService} from '../services/group.service';
import {User} from '../models/user.model';
import {plainToInstance} from 'class-transformer';
import {CreateGroupDTO, InviteMembersDTO} from "../dto/createGroup.dto";
import {SendGroupGiftDTO, WithdrawMoneyDTO} from "../dto/sendGiftDTO";

const resService = Container.get(ResHandlerService);
const groupService = Container.get(GroupService);

export const getMyGroups = async (req: Request, res: Response) => {
	try {
		const user = req.user as User;
		const groups = await groupService.getMyGroups(user);
		return resService.handleSuccess(res, groups);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
};

export const getGroupById = async (req: Request, res: Response) => {
	try {
		const groupId = req.params.id;
		const user = req.user as User;
		const group = await groupService.getGroupById(+groupId, user);
		return resService.handleSuccess(res, group);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
}

/**
 * Get encoded hash for group ID
 * Used by client to generate shareable links
 */
export const getGroupHash = async (req: Request, res: Response) => {
	try {
		const groupId = req.params.id;
		const user = req.user as User;
		
		// Verify user has access to this group
		const group = await groupService.getGroupById(+groupId, user);
		if (!group) {
			return resService.handleError(res, new BadRequestError('group.not_found', 'Group not found'));
		}
		
		const hash = groupService.getGroupHash(+groupId);
		const shareableLink = `https://yassuapp.com/${hash}`;
		
		return resService.handleSuccess(res, {
			groupId: +groupId, 
			hash: hash,
			shareableLink: shareableLink
		});
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
}

/**
 * Public endpoint to get group data by encoded hash
 * No authentication required
 */
export const getGroupByHash = async (req: Request, res: Response) => {
	try {
		const groupHash = req.params.hash; // e.g. "G73387"
		
		if (!groupHash) {
			return resService.handleError(res, new BadRequestError('group.invalid_hash', 'Group hash is required'));
		}

		const group = await groupService.getGroupByHash(groupHash);
		
		if (!group) {
			return resService.handleError(res, new BadRequestError('group.not_found', 'Group not found'));
		}

		return resService.handleSuccess(res, group);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
}

export const createGroup = async (req: Request, res: Response) => {
	try {
		const transformed = plainToInstance(CreateGroupDTO, req.body);
		const user = req.user as User;
		const group = await groupService.createGroup(transformed, user);
		return resService.handleSuccess(res, group);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
};

export const withdrawMoney = async (req: Request, res: Response) => {
	try {
		const groupId = req.params.id;
		const user = req.user as User;
		const transformed = plainToInstance(WithdrawMoneyDTO, req.body);
		const result = await groupService.withdrawMoney(+groupId, user);
		return resService.handleSuccess(res, result);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
};

export const create = async (req: Request, res: Response) => {
	try {
		const user = req.user as User;
		const transformed = plainToInstance(SendGroupGiftDTO, req.body);
		const event = await groupService.sendGreeting(transformed, user);
		return resService.handleSuccess(res, event);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('group.greeting.error', e.message, e));
	}
};

export const inviteMembersToGroup = async (req: Request, res: Response) => {
	try {
		const groupId = req.params.id;
		const transformed = plainToInstance(InviteMembersDTO, req.body);
		const result = await groupService.inviteMembersToGroup(+groupId, transformed.membersPhoneNumbers);
		return resService.handleSuccess(res, result);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('group.invite.error', e.message, e));
	}
};

export const editGroup = async (req: Request, res: Response) => {
	try {
		const groupId = Number(req.params.id);
		const { name, dueDate, comment } = req.body;
		const adminUser = req.user as User;
		const group = await groupService.editGroup(groupId, adminUser, name, new Date(dueDate), comment);
		return resService.handleSuccess(res, group);
	} catch (e) {
		// Handle or transform errors as needed
		return resService.handleError(res, new BadRequestError('group.edit.error', e.message, e));
	}
};

export const deleteGroup = async (req: Request, res: Response) => {
	try {
		const groupId = req.params.id;
		const user = req.user as User;
		const result = await groupService.deleteGroup(+groupId, user);
		return resService.handleSuccess(res, result);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
};

export const acceptGroupInvitation = async (req: Request, res: Response) => {
	try {
		const groupId = req.params.id;
		const user = req.user as User;
		const result = await groupService.acceptGroupInvitation(+groupId, user.id);
		return resService.handleSuccess(res, result);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('group.invitation.error', e.message, e));
	}
};

export const rejectGroupInvitation = async (req: Request, res: Response) => {
	try {
		const groupId = req.params.id;
		const user = req.user as User;
		const result = await groupService.rejectGroupInvitation(+groupId, user.id);
		return resService.handleSuccess(res, result);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('group.invitation.error', e.message, e));
	}
};

export const getMyGroupInvitations = async (req: Request, res: Response) => {
	try {
		const user = req.user as User;
		const invitations = await groupService.getUserGroupInvitations(user.id);
		return resService.handleSuccess(res, invitations);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
};

export const deleteAllGroupsTest = async (req: Request, res: Response) => {
	try {
		const result = await groupService.deleteAllGroupsForTesting();
		return resService.handleSuccess(res, result);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
};