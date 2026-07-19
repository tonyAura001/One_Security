import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Client Prisma partagé (singleton Nest). Prisma 7 se connecte via un driver
 * adapter (`@prisma/adapter-pg`) — l'URL vient de `DATABASE_URL` (ConfigService).
 * Connexion gérée au cycle de vie du module.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connecté à la base de données');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
