import { Service } from 'typedi';
import { getRepository, Repository, Between, LessThanOrEqual, MoreThanOrEqual, Like, In } from 'typeorm';
import { Event } from '../models/event.model';
import { Transaction } from '../models/transaction.model';
import { User } from '../models/user.model';
import { Greeting } from '../models/greeting.model';
import { Group } from '../models/group.model';
import { InternalTransaction } from '../models/internal-transaction.model';
import { EMoneyRequestedStatus } from '../models/enums';
import { AdminListEventsDTO } from '../dto/admin/admin-list-events.dto';
import { AdminListTransactionsDTO } from '../dto/admin/admin-list-transactions.dto';
import { AdminListUsersDTO } from '../dto/admin/admin-list-users.dto';
import { AdminListGreetingsDTO } from '../dto/admin/admin-list-greetings.dto';
import { AdminListInternalTransactionsDTO } from '../dto/admin/admin-list-internal-transactions.dto';
import { AdminListGroupsDTO } from '../dto/admin/admin-list-groups.dto';
import { AdminUpdateEventDTO } from '../dto/admin/admin-update-event.dto';
import { PushService } from './push.service';
import { NotificationService } from './notification.service';

@Service()
export class AdminService {
    private eventRepo: Repository<Event>;
    private transactionRepo: Repository<Transaction>;
    private userRepo: Repository<User>;
    private greetingRepo: Repository<Greeting>;
    private groupRepo: Repository<Group>;
    private internalTransactionRepo: Repository<InternalTransaction>;

    constructor(
        private pushService: PushService,
        private notificationService: NotificationService
    ) {}

    // Repository getters
    private getEventRepository() {
        if (!this.eventRepo) {
            this.eventRepo = getRepository(Event);
        }
        return this.eventRepo;
    }

    private getTransactionRepository() {
        if (!this.transactionRepo) {
            this.transactionRepo = getRepository(Transaction);
        }
        return this.transactionRepo;
    }

    private getUserRepository() {
        if (!this.userRepo) {
            this.userRepo = getRepository(User);
        }
        return this.userRepo;
    }

    private getGreetingRepository() {
        if (!this.greetingRepo) {
            this.greetingRepo = getRepository(Greeting);
        }
        return this.greetingRepo;
    }

    private getGroupRepository() {
        if (!this.groupRepo) {
            this.groupRepo = getRepository(Group);
        }
        return this.groupRepo;
    }

    private getInternalTransactionRepository() {
        if (!this.internalTransactionRepo) {
            this.internalTransactionRepo = getRepository(InternalTransaction);
        }
        return this.internalTransactionRepo;
    }

    // ========== EVENTS ==========

    /**
     * List all events with pagination and filters
     */
    async listEvents(dto: AdminListEventsDTO) {
        const { page = 1, limit = 20 } = dto;
        const skip = (page - 1) * limit;

        const qb = this.getEventRepository()
            .createQueryBuilder('event')
            .leftJoinAndSelect('event.receiverUser', 'receiverUser')
            .leftJoinAndSelect('event.greetings', 'greetings')
            .leftJoinAndSelect('greetings.senderUser', 'senderUser');

        // Apply filters
        if (dto.search) {
            qb.andWhere('(event.name ILIKE :search OR event.receiverPhoneNumber ILIKE :search OR receiverUser.fullName ILIKE :search)', 
                { search: `%${dto.search}%` });
        }

        if (dto.moneyRequestedStatus) {
            qb.andWhere('event.moneyRequestedStatus = :status', { status: dto.moneyRequestedStatus });
        }

        if (dto.finishedProcessing !== undefined) {
            qb.andWhere('event.finishedProcessing = :finished', { finished: dto.finishedProcessing });
        }

        if (dto.dateFrom) {
            qb.andWhere('event._createdAt >= :dateFrom', { dateFrom: dto.dateFrom });
        }

        if (dto.dateTo) {
            qb.andWhere('event._createdAt <= :dateTo', { dateTo: dto.dateTo });
        }

        if (dto.receiverUserId) {
            qb.andWhere('event.receiverUser = :receiverUserId', { receiverUserId: dto.receiverUserId });
        }

        // Apply sorting
        const sortColumn = dto.sortBy === 'createdAt' ? 'event._createdAt' : `event.${dto.sortBy}`;
        qb.orderBy(sortColumn, dto.sortOrder || 'DESC');

        // Apply pagination
        qb.skip(skip).take(limit);

        const [events, total] = await qb.getManyAndCount();

        return {
            entities: events.map(event => ({
                ...event,
                totalAmount: event.greetings?.reduce((sum, g) => sum + (g.amountOfMoney || 0), 0) || 0,
                greetingsCount: event.greetings?.length || 0
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Get single event by ID with all relations
     */
    async getEventById(eventId: number) {
        const event = await this.getEventRepository().findOne(eventId, {
            relations: ['receiverUser', 'greetings', 'greetings.senderUser', 'greetings.receiverUser', 'internalTransaction']
        });

        if (!event) {
            return null;
        }

        return {
            ...event,
            totalAmount: event.greetings?.reduce((sum, g) => sum + (g.amountOfMoney || 0), 0) || 0,
            greetingsCount: event.greetings?.length || 0
        };
    }

    /**
     * List pending events (past due date, not sent)
     */
    async listPendingEvents(dto: AdminListEventsDTO) {
        const { page = 1, limit = 20 } = dto;
        const skip = (page - 1) * limit;
        const today = new Date();

        const qb = this.getEventRepository()
            .createQueryBuilder('event')
            .leftJoinAndSelect('event.receiverUser', 'receiverUser')
            .leftJoinAndSelect('event.greetings', 'greetings')
            .leftJoinAndSelect('event.internalTransaction', 'internalTransaction')
            .where('event.moneyRequestedStatus IN (:...statuses)', { 
                statuses: [EMoneyRequestedStatus.INITIAL, EMoneyRequestedStatus.REQUESTED] 
            })
            .andWhere('(event.year < :year OR (event.year = :year AND event.month < :month) OR (event.year = :year AND event.month = :month AND event.day <= :day))', {
                year: today.getFullYear(),
                month: today.getMonth() + 1,
                day: today.getDate()
            });

        // Apply additional filters
        if (dto.search) {
            qb.andWhere('(event.name ILIKE :search OR event.receiverPhoneNumber ILIKE :search)', 
                { search: `%${dto.search}%` });
        }

        if (dto.moneyRequestedStatus) {
            qb.andWhere('event.moneyRequestedStatus = :status', { status: dto.moneyRequestedStatus });
        }

        qb.orderBy('event._createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        const [events, total] = await qb.getManyAndCount();

        return {
            entities: events.map(event => ({
                ...event,
                totalAmount: event.greetings?.reduce((sum, g) => sum + (g.amountOfMoney || 0), 0) || 0,
                greetingsCount: event.greetings?.length || 0
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    // ========== INTERNAL TRANSACTIONS (Withdraw Requests) ==========

    /**
     * List all internal transactions (withdraw requests)
     */
    async listInternalTransactions(dto: AdminListInternalTransactionsDTO) {
        const { page = 1, limit = 20 } = dto;
        const skip = (page - 1) * limit;

        const qb = this.getInternalTransactionRepository()
            .createQueryBuilder('it')
            .leftJoinAndSelect('it.receiverUser', 'receiverUser')
            .leftJoinAndSelect('it.event', 'event');

        // Apply filters
        if (dto.isPaid !== undefined) {
            qb.andWhere('it.isPaid = :isPaid', { isPaid: dto.isPaid });
        }

        if (dto.dateFrom) {
            qb.andWhere('it.transactionDate >= :dateFrom', { dateFrom: dto.dateFrom });
        }

        if (dto.dateTo) {
            qb.andWhere('it.transactionDate <= :dateTo', { dateTo: dto.dateTo });
        }

        if (dto.receiverUserId) {
            qb.andWhere('it.receiverUser = :receiverUserId', { receiverUserId: dto.receiverUserId });
        }

        if (dto.withdrawType) {
            qb.andWhere('it.withdrawType = :withdrawType', { withdrawType: dto.withdrawType });
        }

        if (dto.minAmount !== undefined) {
            qb.andWhere('it.amount >= :minAmount', { minAmount: dto.minAmount });
        }

        if (dto.maxAmount !== undefined) {
            qb.andWhere('it.amount <= :maxAmount', { maxAmount: dto.maxAmount });
        }

        // Apply sorting
        const sortColumn = dto.sortBy === 'createdAt' ? 'it._createdAt' : `it.${dto.sortBy}`;
        qb.orderBy(sortColumn, dto.sortOrder || 'DESC');

        qb.skip(skip).take(limit);

        const [transactions, total] = await qb.getManyAndCount();

        return {
            entities: transactions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Get single internal transaction by ID
     */
    async getInternalTransactionById(id: number) {
        return this.getInternalTransactionRepository().findOne(id, {
            relations: ['receiverUser', 'event']
        });
    }

    // ========== TRANSACTIONS ==========

    /**
     * List all transactions with pagination and filters
     */
    async listTransactions(dto: AdminListTransactionsDTO) {
        const { page = 1, limit = 20 } = dto;
        const skip = (page - 1) * limit;

        const qb = this.getTransactionRepository()
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.senderUser', 'senderUser')
            .leftJoinAndSelect('transaction.receiverUser', 'receiverUser')
            .leftJoinAndSelect('transaction.event', 'event')
            .leftJoinAndSelect('transaction.group', 'group');

        // Apply filters
        if (dto.search) {
            qb.andWhere('(senderUser.fullName ILIKE :search OR receiverUser.fullName ILIKE :search OR transaction.reference ILIKE :search)', 
                { search: `%${dto.search}%` });
        }

        if (dto.type) {
            qb.andWhere('transaction.type = :type', { type: dto.type });
        }

        if (dto.finishedProcessing !== undefined) {
            qb.andWhere('transaction.finishedProcessing = :finished', { finished: dto.finishedProcessing });
        }

        if (dto.dateFrom) {
            qb.andWhere('transaction._createdAt >= :dateFrom', { dateFrom: dto.dateFrom });
        }

        if (dto.dateTo) {
            qb.andWhere('transaction._createdAt <= :dateTo', { dateTo: dto.dateTo });
        }

        if (dto.senderUserId) {
            qb.andWhere('transaction.senderUser = :senderUserId', { senderUserId: dto.senderUserId });
        }

        if (dto.receiverUserId) {
            qb.andWhere('transaction.receiverUser = :receiverUserId', { receiverUserId: dto.receiverUserId });
        }

        if (dto.eventId) {
            qb.andWhere('transaction.event = :eventId', { eventId: dto.eventId });
        }

        if (dto.groupId) {
            qb.andWhere('transaction.group = :groupId', { groupId: dto.groupId });
        }

        if (dto.minAmount !== undefined) {
            qb.andWhere('transaction.amount >= :minAmount', { minAmount: dto.minAmount });
        }

        if (dto.maxAmount !== undefined) {
            qb.andWhere('transaction.amount <= :maxAmount', { maxAmount: dto.maxAmount });
        }

        // Apply sorting
        const sortColumn = dto.sortBy === 'createdAt' ? 'transaction._createdAt' : `transaction.${dto.sortBy}`;
        qb.orderBy(sortColumn, dto.sortOrder || 'DESC');

        qb.skip(skip).take(limit);

        const [transactions, total] = await qb.getManyAndCount();

        return {
            entities: transactions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Get single transaction by ID
     */
    async getTransactionById(transactionId: number) {
        return this.getTransactionRepository().findOne(transactionId, {
            relations: ['senderUser', 'receiverUser', 'event', 'group']
        });
    }

    // ========== GREETINGS ==========

    /**
     * List all greetings with pagination and filters
     */
    async listGreetings(dto: AdminListGreetingsDTO) {
        const { page = 1, limit = 20 } = dto;
        const skip = (page - 1) * limit;

        const qb = this.getGreetingRepository()
            .createQueryBuilder('greeting')
            .leftJoinAndSelect('greeting.senderUser', 'senderUser')
            .leftJoinAndSelect('greeting.receiverUser', 'receiverUser')
            .leftJoinAndSelect('greeting.event', 'event')
            .leftJoinAndSelect('greeting.group', 'group');

        // Apply filters
        if (dto.search) {
            qb.andWhere('(greeting.greetingText ILIKE :search OR senderUser.fullName ILIKE :search OR receiverUser.fullName ILIKE :search)', 
                { search: `%${dto.search}%` });
        }

        if (dto.finishedProcessing !== undefined) {
            qb.andWhere('greeting.finishedProcessing = :finished', { finished: dto.finishedProcessing });
        }

        if (dto.hasMoney !== undefined) {
            if (dto.hasMoney) {
                qb.andWhere('greeting.amountOfMoney > 0');
            } else {
                qb.andWhere('(greeting.amountOfMoney IS NULL OR greeting.amountOfMoney = 0)');
            }
        }

        if (dto.dateFrom) {
            qb.andWhere('greeting._createdAt >= :dateFrom', { dateFrom: dto.dateFrom });
        }

        if (dto.dateTo) {
            qb.andWhere('greeting._createdAt <= :dateTo', { dateTo: dto.dateTo });
        }

        if (dto.senderUserId) {
            qb.andWhere('greeting.senderUser = :senderUserId', { senderUserId: dto.senderUserId });
        }

        if (dto.receiverUserId) {
            qb.andWhere('greeting.receiverUser = :receiverUserId', { receiverUserId: dto.receiverUserId });
        }

        if (dto.eventId) {
            qb.andWhere('greeting.event = :eventId', { eventId: dto.eventId });
        }

        if (dto.groupId) {
            qb.andWhere('greeting.group = :groupId', { groupId: dto.groupId });
        }

        if (dto.minAmount !== undefined) {
            qb.andWhere('greeting.amountOfMoney >= :minAmount', { minAmount: dto.minAmount });
        }

        if (dto.maxAmount !== undefined) {
            qb.andWhere('greeting.amountOfMoney <= :maxAmount', { maxAmount: dto.maxAmount });
        }

        // Apply sorting
        const sortColumn = dto.sortBy === 'createdAt' ? 'greeting._createdAt' : `greeting.${dto.sortBy}`;
        qb.orderBy(sortColumn, dto.sortOrder || 'DESC');

        qb.skip(skip).take(limit);

        const [greetings, total] = await qb.getManyAndCount();

        return {
            entities: greetings,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Get single greeting by ID
     */
    async getGreetingById(greetingId: number) {
        return this.getGreetingRepository().findOne(greetingId, {
            relations: ['senderUser', 'receiverUser', 'event', 'group']
        });
    }

    // ========== USERS ==========

    /**
     * List all users with pagination and filters
     */
    async listUsers(dto: AdminListUsersDTO) {
        const { page = 1, limit = 20 } = dto;
        const skip = (page - 1) * limit;

        const qb = this.getUserRepository()
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.savedCards', 'savedCards');

        // Apply filters
        if (dto.search) {
            qb.andWhere('(user.fullName ILIKE :search OR user.phone ILIKE :search OR user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)', 
                { search: `%${dto.search}%` });
        }

        if (dto.isActive !== undefined) {
            qb.andWhere('user.isActive = :isActive', { isActive: dto.isActive });
        }

        if (dto.gender) {
            qb.andWhere('user.gender = :gender', { gender: dto.gender });
        }

        if (dto.registeredFrom) {
            qb.andWhere('user._createdAt >= :registeredFrom', { registeredFrom: dto.registeredFrom });
        }

        if (dto.registeredTo) {
            qb.andWhere('user._createdAt <= :registeredTo', { registeredTo: dto.registeredTo });
        }

        if (dto.city) {
            qb.andWhere('user.city ILIKE :city', { city: `%${dto.city}%` });
        }

        // Apply sorting
        const sortColumn = dto.sortBy === 'createdAt' ? 'user._createdAt' : `user.${dto.sortBy}`;
        qb.orderBy(sortColumn, dto.sortOrder || 'DESC');

        qb.skip(skip).take(limit);

        const [users, total] = await qb.getManyAndCount();

        return {
            entities: users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Get single user by ID with stats
     */
    async getUserById(userId: number) {
        const user = await this.getUserRepository().findOne(userId, {
            relations: ['savedCards']
        });

        if (!user) {
            return null;
        }

        // Get user stats
        const sentGreetingsCount = await this.getGreetingRepository().count({ where: { senderUser: userId } });
        const receivedGreetingsCount = await this.getGreetingRepository().count({ where: { receiverUser: userId } });
        const sentTransactionsCount = await this.getTransactionRepository().count({ where: { senderUser: userId } });
        const receivedTransactionsCount = await this.getTransactionRepository().count({ where: { receiverUser: userId } });

        return {
            ...user,
            stats: {
                sentGreetingsCount,
                receivedGreetingsCount,
                sentTransactionsCount,
                receivedTransactionsCount
            }
        };
    }

    /**
     * Get full user activity details - all events, greetings, payment requests
     */
    async getUserFullDetails(userId: number) {
        const user = await this.getUserRepository().findOne(userId, {
            relations: ['savedCards']
        });

        if (!user) {
            return null;
        }

        // Get all events where user is the receiver
        const eventsAsReceiver = await this.getEventRepository()
            .createQueryBuilder('event')
            .leftJoinAndSelect('event.greetings', 'greetings')
            .leftJoinAndSelect('greetings.senderUser', 'senderUser')
            .where('event.receiverUser = :userId', { userId })
            .orderBy('event._createdAt', 'DESC')
            .getMany();

        // Get all greetings sent by this user
        const sentGreetings = await this.getGreetingRepository()
            .createQueryBuilder('greeting')
            .leftJoinAndSelect('greeting.receiverUser', 'receiverUser')
            .leftJoinAndSelect('greeting.event', 'event')
            .leftJoinAndSelect('greeting.group', 'group')
            .where('greeting.senderUser = :userId', { userId })
            .orderBy('greeting._createdAt', 'DESC')
            .getMany();

        // Get all internal transactions (payment requests) for this user
        const paymentRequests = await this.getInternalTransactionRepository()
            .createQueryBuilder('it')
            .leftJoinAndSelect('it.event', 'event')
            .where('it.receiverUser = :userId', { userId })
            .orderBy('it._createdAt', 'DESC')
            .getMany();

        // Calculate totals
        const totalMoneyReceived = eventsAsReceiver.reduce((sum, event) => {
            const eventTotal = event.greetings?.reduce((gSum, g) => gSum + (g.amountOfMoney || 0), 0) || 0;
            return sum + eventTotal;
        }, 0);

        const totalMoneySent = sentGreetings.reduce((sum, g) => sum + (g.amountOfMoney || 0), 0);

        const totalMoneyPaid = paymentRequests
            .filter(p => p.isPaid)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        const totalMoneyPending = paymentRequests
            .filter(p => !p.isPaid)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        return {
            user,
            eventsAsReceiver: eventsAsReceiver.map(event => ({
                ...event,
                totalAmount: event.greetings?.reduce((sum, g) => sum + (g.amountOfMoney || 0), 0) || 0,
                greetingsCount: event.greetings?.length || 0
            })),
            sentGreetings,
            paymentRequests,
            totals: {
                totalMoneyReceived,
                totalMoneySent,
                totalMoneyPaid,
                totalMoneyPending,
                eventsCount: eventsAsReceiver.length,
                sentGreetingsCount: sentGreetings.length,
                paymentRequestsCount: paymentRequests.length
            }
        };
    }

    // ========== GROUPS ==========

    /**
     * List all groups with pagination and filters
     */
    async listGroups(dto: AdminListGroupsDTO) {
        const { page = 1, limit = 20 } = dto;
        const skip = (page - 1) * limit;

        const qb = this.getGroupRepository()
            .createQueryBuilder('group')
            .leftJoinAndSelect('group.adminUser', 'adminUser')
            .leftJoinAndSelect('group.targetUser', 'targetUser')
            .leftJoinAndSelect('group.members', 'members')
            .leftJoinAndSelect('group.greetings', 'greetings');

        // Apply filters
        if (dto.search) {
            qb.andWhere('(group.name ILIKE :search OR group.comment ILIKE :search)', 
                { search: `%${dto.search}%` });
        }

        if (dto.moneyRequestedStatus) {
            qb.andWhere('group.moneyRequestedStatus = :status', { status: dto.moneyRequestedStatus });
        }

        if (dto.isOpened !== undefined) {
            qb.andWhere('group.isOpened = :isOpened', { isOpened: dto.isOpened });
        }

        if (dto.dueDateFrom) {
            qb.andWhere('group.dueDate >= :dueDateFrom', { dueDateFrom: dto.dueDateFrom });
        }

        if (dto.dueDateTo) {
            qb.andWhere('group.dueDate <= :dueDateTo', { dueDateTo: dto.dueDateTo });
        }

        if (dto.adminUserId) {
            qb.andWhere('group.adminUser = :adminUserId', { adminUserId: dto.adminUserId });
        }

        if (dto.targetUserId) {
            qb.andWhere('group.targetUser = :targetUserId', { targetUserId: dto.targetUserId });
        }

        // Apply sorting
        const sortColumn = dto.sortBy === 'createdAt' ? 'group._createdAt' : `group.${dto.sortBy}`;
        qb.orderBy(sortColumn, dto.sortOrder || 'DESC');

        qb.skip(skip).take(limit);

        const [groups, total] = await qb.getManyAndCount();

        return {
            entities: groups.map(group => ({
                ...group,
                totalAmount: group.greetings?.reduce((sum, g) => sum + (g.amountOfMoney || 0), 0) || 0,
                greetingsCount: group.greetings?.length || 0,
                membersCount: group.members?.length || 0
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Get single group by ID
     */
    async getGroupById(groupId: number) {
        const group = await this.getGroupRepository().findOne(groupId, {
            relations: ['adminUser', 'targetUser', 'members', 'greetings', 'greetings.senderUser', 'internalTransaction']
        });

        if (!group) {
            return null;
        }

        return {
            ...group,
            totalAmount: group.greetings?.reduce((sum, g) => sum + (g.amountOfMoney || 0), 0) || 0,
            greetingsCount: group.greetings?.length || 0,
            membersCount: group.members?.length || 0
        };
    }

    // ========== DASHBOARD ==========

    /**
     * Get dashboard statistics
     */
    async getDashboardStats() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get greeting stats (money sent via greetings)
        const [
            greetingsToday,
            greetingsThisWeek,
            greetingsThisMonth,
            greetingsTotalAmount
        ] = await Promise.all([
            this.getGreetingRepository()
                .createQueryBuilder('g')
                .select('COUNT(*)', 'count')
                .addSelect('COALESCE(SUM(g.amountOfMoney), 0)', 'total')
                .where('g._createdAt >= :start', { start: todayStart })
                .getRawOne(),
            this.getGreetingRepository()
                .createQueryBuilder('g')
                .select('COUNT(*)', 'count')
                .addSelect('COALESCE(SUM(g.amountOfMoney), 0)', 'total')
                .where('g._createdAt >= :start', { start: weekStart })
                .getRawOne(),
            this.getGreetingRepository()
                .createQueryBuilder('g')
                .select('COUNT(*)', 'count')
                .addSelect('COALESCE(SUM(g.amountOfMoney), 0)', 'total')
                .where('g._createdAt >= :start', { start: monthStart })
                .getRawOne(),
            this.getGreetingRepository()
                .createQueryBuilder('g')
                .select('COUNT(*)', 'count')
                .addSelect('COALESCE(SUM(g.amountOfMoney), 0)', 'total')
                .getRawOne()
        ]);

        // Get event stats
        const [
            eventsToday,
            eventsThisWeek,
            eventsThisMonth,
            eventsTotal
        ] = await Promise.all([
            this.getEventRepository().count({ where: { _createdAt: MoreThanOrEqual(todayStart) } }),
            this.getEventRepository().count({ where: { _createdAt: MoreThanOrEqual(weekStart) } }),
            this.getEventRepository().count({ where: { _createdAt: MoreThanOrEqual(monthStart) } }),
            this.getEventRepository().count()
        ]);

        // Get user stats
        const [
            usersToday,
            usersThisWeek,
            usersThisMonth,
            usersTotal
        ] = await Promise.all([
            this.getUserRepository().count({ where: { _createdAt: MoreThanOrEqual(todayStart) } }),
            this.getUserRepository().count({ where: { _createdAt: MoreThanOrEqual(weekStart) } }),
            this.getUserRepository().count({ where: { _createdAt: MoreThanOrEqual(monthStart) } }),
            this.getUserRepository().count()
        ]);

        // Get group stats
        const [
            groupsToday,
            groupsThisWeek,
            groupsThisMonth,
            groupsTotal
        ] = await Promise.all([
            this.getGroupRepository().count({ where: { _createdAt: MoreThanOrEqual(todayStart) } }),
            this.getGroupRepository().count({ where: { _createdAt: MoreThanOrEqual(weekStart) } }),
            this.getGroupRepository().count({ where: { _createdAt: MoreThanOrEqual(monthStart) } }),
            this.getGroupRepository().count()
        ]);

        // Get pending payments count
        const pendingPaymentsCount = await this.getInternalTransactionRepository().count({ 
            where: { isPaid: false } 
        });

        // Get pending events count
        const pendingEventsCount = await this.getEventRepository()
            .createQueryBuilder('event')
            .where('event.moneyRequestedStatus IN (:...statuses)', { 
                statuses: [EMoneyRequestedStatus.INITIAL, EMoneyRequestedStatus.REQUESTED] 
            })
            .andWhere('(event.year < :year OR (event.year = :year AND event.month < :month) OR (event.year = :year AND event.month = :month AND event.day <= :day))', {
                year: now.getFullYear(),
                month: now.getMonth() + 1,
                day: now.getDate()
            })
            .getCount();

        return {
            money: {
                today: { count: parseInt(greetingsToday?.count || '0'), total: parseFloat(greetingsToday?.total || '0') },
                thisWeek: { count: parseInt(greetingsThisWeek?.count || '0'), total: parseFloat(greetingsThisWeek?.total || '0') },
                thisMonth: { count: parseInt(greetingsThisMonth?.count || '0'), total: parseFloat(greetingsThisMonth?.total || '0') },
                allTime: { count: parseInt(greetingsTotalAmount?.count || '0'), total: parseFloat(greetingsTotalAmount?.total || '0') }
            },
            events: {
                today: eventsToday,
                thisWeek: eventsThisWeek,
                thisMonth: eventsThisMonth,
                total: eventsTotal
            },
            users: {
                today: usersToday,
                thisWeek: usersThisWeek,
                thisMonth: usersThisMonth,
                total: usersTotal
            },
            groups: {
                today: groupsToday,
                thisWeek: groupsThisWeek,
                thisMonth: groupsThisMonth,
                total: groupsTotal
            },
            pending: {
                payments: pendingPaymentsCount,
                events: pendingEventsCount
            }
        };
    }

    // ========== UPDATE EVENT (Mark as Paid) ==========

    /**
     * Mark event as paid - updates event, greetings, and internal transaction
     */
    async markEventAsPaid(eventId: number, dto: AdminUpdateEventDTO) {
        const event = await this.getEventRepository().findOne(eventId, {
            relations: ['receiverUser', 'greetings', 'internalTransaction']
        });

        if (!event) {
            throw new Error('Event not found');
        }

        // Update event status
        event.moneyRequestedStatus = EMoneyRequestedStatus.SENT;
        await this.getEventRepository().save(event);

        // Update all greetings as finished processing
        for (const greeting of event.greetings) {
            greeting.finishedProcessing = true;
            greeting.reference = dto.reference;
            await this.getGreetingRepository().save(greeting);
        }

        // Update internal transaction if exists
        if (event.internalTransaction) {
            event.internalTransaction.isPaid = true;
            event.internalTransaction.comment = dto.comment || `Paid on ${new Date().toISOString()}`;
            await this.getInternalTransactionRepository().save(event.internalTransaction);
        }

        // Send push notification to receiver
        const receiverUser = event.receiverUser as User;
        if (receiverUser && receiverUser.fcmToken) {
            const title = 'הכסף הועבר אליך! 🎉';
            const body = `סכום של ${dto.amount} ש"ח הועבר לחשבונך. מספר אסמכתא: ${dto.reference}`;
            await this.pushService.send(receiverUser.fcmToken, title, body, {});
        }

        // Create notification
        if (receiverUser) {
            await this.notificationService.createNotification({
                title: 'הכסף הועבר אליך! 🎉',
                message: `סכום של ${dto.amount} ש"ח הועבר לחשבונך. מספר אסמכתא: ${dto.reference}`,
                type: 'payment',
                userId: receiverUser.id
            });
        }

        return this.getEventById(eventId);
    }

    /**
     * Mark internal transaction as paid (for withdraw requests)
     */
    async markInternalTransactionAsPaid(transactionId: number, dto: AdminUpdateEventDTO) {
        const transaction = await this.getInternalTransactionRepository().findOne(transactionId, {
            relations: ['receiverUser', 'event']
        });

        if (!transaction) {
            throw new Error('Internal transaction not found');
        }

        // Update transaction
        transaction.isPaid = true;
        transaction.comment = dto.comment || `Paid: ${dto.reference} on ${new Date().toISOString()}`;
        await this.getInternalTransactionRepository().save(transaction);

        // If linked to event, update event status
        if (transaction.event) {
            transaction.event.moneyRequestedStatus = EMoneyRequestedStatus.SENT;
            await this.getEventRepository().save(transaction.event);
        }

        // Send push notification to receiver
        const receiverUser = transaction.receiverUser as User;
        if (receiverUser && receiverUser.fcmToken) {
            const title = 'הכסף הועבר אליך! 🎉';
            const body = `סכום של ${dto.amount} ש"ח הועבר לחשבונך. מספר אסמכתא: ${dto.reference}`;
            await this.pushService.send(receiverUser.fcmToken, title, body, {});
        }

        // Create notification
        if (receiverUser) {
            await this.notificationService.createNotification({
                title: 'הכסף הועבר אליך! 🎉',
                message: `סכום של ${dto.amount} ש"ח הועבר לחשבונך. מספר אסמכתא: ${dto.reference}`,
                type: 'payment',
                userId: receiverUser.id
            });
        }

        return this.getInternalTransactionById(transactionId);
    }
}

