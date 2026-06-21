import { Service } from 'typedi';
import * as jwt from 'jsonwebtoken';
import { getRepository, Repository } from 'typeorm';
import { Admin } from '../models/admin.model';
import { AdminLoginDTO } from '../dto/admin/admin-login.dto';
import { ForbiddenError, BadRequestError } from '../errors';
import getConfig from '../../config/env.config';
import { hashSync } from 'bcrypt-nodejs';

@Service()
export class AdminAuthService {
    private repo: Repository<Admin>;

    getRepository() {
        if (!this.repo) {
            this.repo = getRepository(Admin);
        }
        return this.repo;
    }

    /**
     * Creates a JWT token for admin
     */
    createAdminJWT(payload: { id: number; isAdmin: boolean }) {
        return jwt.sign(payload, getConfig().jwt.key, { expiresIn: getConfig().jwt.token_expires });
    }

    /**
     * Verifies admin JWT token
     */
    verifyAdminJWT(token: string): { id: number; isAdmin: boolean } | null {
        try {
            const decoded = jwt.verify(token, getConfig().jwt.key) as { id: number; isAdmin: boolean };
            if (!decoded.isAdmin) {
                return null;
            }
            return decoded;
        } catch (error) {
            return null;
        }
    }

    /**
     * Login with username and password
     */
    async login(dto: AdminLoginDTO) {
        const admin = await this.getRepository().findOne({ where: { username: dto.username } });

        if (!admin) {
            throw new ForbiddenError('ERR_INVALID_CREDENTIALS', 'Invalid username or password');
        }

        if (!admin.isActive) {
            throw new ForbiddenError('ERR_ACCOUNT_DISABLED', 'Account is disabled');
        }

        if (!admin.validatePassword(dto.password)) {
            throw new ForbiddenError('ERR_INVALID_CREDENTIALS', 'Invalid username or password');
        }

        // Update last login
        admin.lastLoginAt = new Date();
        await this.getRepository().save(admin);

        const token = this.createAdminJWT({ id: admin.id, isAdmin: true });

        return {
            admin: {
                id: admin.id,
                username: admin.username,
                fullName: admin.fullName,
                email: admin.email
            },
            token
        };
    }

    /**
     * Get admin by ID
     */
    async getAdminById(id: number) {
        return this.getRepository().findOne(id);
    }

    /**
     * Create a new admin (for seeding purposes)
     */
    async createAdmin(username: string, password: string, fullName?: string, email?: string) {
        const existing = await this.getRepository().findOne({ where: { username } });
        if (existing) {
            throw new BadRequestError('ERR_ADMIN_EXISTS', 'Admin with this username already exists');
        }

        const admin = this.getRepository().create({
            username,
            password,
            fullName,
            email,
            isActive: true
        });

        return this.getRepository().save(admin);
    }

    /**
     * Seed default admin if none exists
     */
    async seedDefaultAdmin() {
        const count = await this.getRepository().count();
        if (count === 0) {
            await this.createAdmin('admin', 'admin123', 'System Admin', 'admin@yassu.com');
            console.log('Default admin created: username=admin, password=admin123');
        }
    }
}

