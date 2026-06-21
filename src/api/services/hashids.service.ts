import { Service } from 'typedi';
import Hashids from 'hashids';

@Service()
export class HashidsService {
    private hashids: Hashids;

    constructor() {
        // Use secret key from config or environment variables
        // Salt is used for security
        const salt = process.env.HASHIDS_SALT || 'yassu-group-salt-2024';
        // Minimum 5 characters for hash
        // Hashids requires at least 16 unique characters in alphabet
        // Using digits + lowercase letters to meet requirement
        const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
        this.hashids = new Hashids(salt, 5, alphabet);
    }

    /**
     * Encodes group ID into hash with G prefix
     * @param groupId - numeric group ID
     * @returns string like "GB3bRZ" or "G73387" (can contain letters and digits)
     */
    encodeGroupId(groupId: number): string {
        const encoded = this.hashids.encode(groupId);
        return `G${encoded}`;
    }

    /**
     * Decodes group hash back to ID
     * @param hash - string like "GB3bRZ" or "G73387" or "B3bRZ" or "73387"
     * @returns numeric group ID or null if invalid
     */
    decodeGroupId(hash: string): number | null {
        // Remove G prefix if present
        const hashWithoutPrefix = hash.startsWith('G') ? hash.substring(1) : hash;
        
        if (!hashWithoutPrefix || hashWithoutPrefix.length === 0) {
            return null;
        }
        
        try {
            const decoded = this.hashids.decode(hashWithoutPrefix);
            if (decoded && decoded.length > 0) {
                return decoded[0] as number;
            }
        } catch (error) {
            console.error('Error decoding group hash:', error);
        }
        
        return null;
    }

    /**
     * Encodes event ID into hash with E prefix
     * @param eventId - numeric event ID
     * @returns string like "EB3bRZ" or "E73387" (can contain letters and digits)
     */
    encodeEventId(eventId: number): string {
        const encoded = this.hashids.encode(eventId);
        return `E${encoded}`;
    }

    /**
     * Decodes event hash back to ID
     * @param hash - string like "EB3bRZ" or "E73387" or "B3bRZ" or "73387"
     * @returns numeric event ID or null if invalid
     */
    decodeEventId(hash: string): number | null {
        // Remove E prefix if present
        const hashWithoutPrefix = hash.startsWith('E') ? hash.substring(1) : hash;
        
        if (!hashWithoutPrefix || hashWithoutPrefix.length === 0) {
            return null;
        }
        
        try {
            const decoded = this.hashids.decode(hashWithoutPrefix);
            if (decoded && decoded.length > 0) {
                return decoded[0] as number;
            }
        } catch (error) {
            console.error('Error decoding event hash:', error);
        }
        
        return null;
    }
}

