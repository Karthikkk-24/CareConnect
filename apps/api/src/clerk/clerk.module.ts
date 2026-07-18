import { Global, Module } from '@nestjs/common';
import { ClerkAdminService } from './clerk-admin.service';

@Global()
@Module({
  providers: [ClerkAdminService],
  exports: [ClerkAdminService],
})
export class ClerkModule {}
