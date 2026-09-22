import { describe, it, expect } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { OwnershipValidator } from './ownership.util.js';
import { UserRole } from '../../users/enums/user-role.enum.js';
import { User } from '../../users/entities/user.entity.js';

describe('OwnershipValidator', () => {
  const userA: Pick<User, 'id' | 'role'> = {
    id: 'user-a-uuid',
    role: UserRole.USER,
  };

  const userB: Pick<User, 'id' | 'role'> = {
    id: 'user-b-uuid',
    role: UserRole.USER,
  };

  const adminUser: Pick<User, 'id' | 'role'> = {
    id: 'admin-uuid',
    role: UserRole.ADMIN,
  };

  describe('validate', () => {
    it('should allow access if user is the resource owner', () => {
      expect(() => {
        OwnershipValidator.validate('user-a-uuid', userA, 'booking');
      }).not.toThrow();
    });

    it('should allow access if user is an ADMIN, even if not the owner', () => {
      expect(() => {
        OwnershipValidator.validate('user-a-uuid', adminUser, 'booking');
      }).not.toThrow();
    });

    it('should throw ForbiddenException if user is not the owner and not an ADMIN', () => {
      expect(() => {
        OwnershipValidator.validate('user-a-uuid', userB, 'booking');
      }).toThrow(ForbiddenException);

      expect(() => {
        OwnershipValidator.validate('user-a-uuid', userB, 'booking');
      }).toThrow('Access denied: you do not have permission to view or manage this booking');
    });

    it('should throw ForbiddenException if current user is missing', () => {
      expect(() => {
        OwnershipValidator.validate('user-a-uuid', null as any, 'booking');
      }).toThrow(ForbiddenException);
    });
  });

  describe('isOwnerOrAdmin', () => {
    it('should return true if owner', () => {
      expect(OwnershipValidator.isOwnerOrAdmin('user-a-uuid', userA)).toBe(true);
    });

    it('should return true if admin', () => {
      expect(OwnershipValidator.isOwnerOrAdmin('user-a-uuid', adminUser)).toBe(true);
    });

    it('should return false if different user', () => {
      expect(OwnershipValidator.isOwnerOrAdmin('user-a-uuid', userB)).toBe(false);
    });

    it('should return false if currentUser is null', () => {
      expect(OwnershipValidator.isOwnerOrAdmin('user-a-uuid', null as any)).toBe(false);
    });
  });
});
