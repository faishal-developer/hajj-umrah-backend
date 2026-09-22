import { ForbiddenException } from '@nestjs/common';
import { User } from '../../users/entities/user.entity.js';
import { UserRole } from '../../users/enums/user-role.enum.js';

export class OwnershipValidator {
  /**
   * Validates if the current user owns the target resource, or is an ADMIN.
   * Throws ForbiddenException if unauthorized.
   *
   * @param resourceOwnerId The userId of the owner of the resource
   * @param currentUser The authenticated user from the request context
   * @param resourceType Name of the resource for descriptive error message
   */
  static validate(
    resourceOwnerId: string,
    currentUser: Pick<User, 'id' | 'role'>,
    resourceType = 'resource',
  ): void {
    if (!currentUser) {
      throw new ForbiddenException('Access denied: unauthenticated user');
    }

    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (currentUser.id !== resourceOwnerId) {
      throw new ForbiddenException(
        `Access denied: you do not have permission to view or manage this ${resourceType}`,
      );
    }
  }

  /**
   * Returns true if user is owner or admin, false otherwise.
   */
  static isOwnerOrAdmin(
    resourceOwnerId: string,
    currentUser: Pick<User, 'id' | 'role'>,
  ): boolean {
    if (!currentUser) {
      return false;
    }
    return currentUser.role === UserRole.ADMIN || currentUser.id === resourceOwnerId;
  }
}
