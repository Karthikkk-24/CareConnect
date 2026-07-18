import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SupabaseAdminService implements OnModuleInit {
  private client: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (url && serviceKey && !serviceKey.includes('REPLACE_WITH')) {
      this.client = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(
        'Supabase Admin is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/api/.env',
      );
    }
    return this.client;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async inviteUserByEmail(email: string, fullName: string): Promise<{ id: string }> {
    const supabase = this.getClient();
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });
    if (error) {
      // Fallback: create user if invite fails (e.g. email already exists path)
      const created = await supabase.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { full_name: fullName },
      });
      if (created.error || !created.data.user) {
        throw new Error(error.message || created.error?.message || 'Failed to create auth user');
      }
      return { id: created.data.user.id };
    }
    if (!data.user) throw new Error('Invite succeeded but no user returned');
    return { id: data.user.id };
  }
}
