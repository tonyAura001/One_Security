import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';

/** Module global : `AccessControlService` disponible pour les guards/contrôleurs. */
@Global()
@Module({
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
