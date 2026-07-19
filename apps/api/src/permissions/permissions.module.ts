import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController, MoiController } from './permissions.controller';

@Module({
  controllers: [PermissionsController, MoiController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
