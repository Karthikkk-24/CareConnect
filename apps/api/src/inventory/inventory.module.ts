import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from '../database/entities';
import { InventoryResolver } from './inventory.resolver';
import { InventoryService } from './inventory.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem])],
  providers: [InventoryResolver, InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
