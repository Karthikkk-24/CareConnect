import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, type ClerkClient } from '@clerk/backend';

/**
 * Thin wrapper around @clerk/backend for admin flows (staff invites, user
 * lookup, deactivation). All auth-provider concerns live here so downstream
 * services depend on a single service.
 */
@Injectable()
export class ClerkAdminService implements OnModuleInit {
  private readonly logger = new Logger(ClerkAdminService.name);
  private client: ClerkClient | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const secretKey = this.config.get<string>('CLERK_SECRET_KEY');
    if (!secretKey || secretKey.includes('REPLACE_WITH')) {
      this.logger.warn(
        'CLERK_SECRET_KEY is missing or placeholder — staff invites will fall back to local-only tokens.',
      );
      return;
    }
    this.client = createClerkClient({ secretKey });
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getClient(): ClerkClient {
    if (!this.client) {
      throw new Error(
        'Clerk admin client is not configured. Set CLERK_SECRET_KEY in apps/api/.env.',
      );
    }
    return this.client;
  }

  /**
   * Invite a staff member via Clerk. Returns the Clerk user id if the invited
   * user already exists in Clerk, or a placeholder id derived from the
   * invitation (Clerk assigns the real `user_...` id once the invite is
   * accepted). The staff_invites row is the source of truth until acceptance.
   */
  async inviteStaffByEmail(
    email: string,
    fullName: string,
    redirectUrl?: string,
  ): Promise<{ clerkUserId: string | null; invitationId: string | null }> {
    if (!this.client) {
      return { clerkUserId: null, invitationId: null };
    }

    const existing = await this.findUserByEmail(email);
    if (existing) {
      return { clerkUserId: existing.id, invitationId: null };
    }

    try {
      const invitation = await this.client.invitations.createInvitation({
        emailAddress: email,
        redirectUrl,
        publicMetadata: { fullName },
        notify: true,
        ignoreExisting: true,
      });
      return { clerkUserId: null, invitationId: invitation.id };
    } catch (error) {
      this.logger.error(
        `Failed to create Clerk invitation for ${email}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async findUserByEmail(email: string) {
    if (!this.client) return null;
    const { data } = await this.client.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    return data[0] ?? null;
  }

  async deactivateUser(clerkUserId: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.users.banUser(clerkUserId);
    } catch (error) {
      this.logger.warn(
        `Failed to deactivate Clerk user ${clerkUserId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async reactivateUser(clerkUserId: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.users.unbanUser(clerkUserId);
    } catch (error) {
      this.logger.warn(
        `Failed to reactivate Clerk user ${clerkUserId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
