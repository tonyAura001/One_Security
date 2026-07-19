import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // CORS restreint aux origines autorisées. En prod, définir CORS_ORIGINS
  // (liste séparée par des virgules) ; sinon on autorise le front déployé
  // et le dev local. `*` (ou aucune origine définie hors prod) = tout ouvert.
  const corsEnv = process.env.CORS_ORIGINS?.trim();
  const corsOrigin =
    corsEnv === '*'
      ? true
      : corsEnv
        ? corsEnv.split(',').map((o) => o.trim())
        : [
            'https://pilotepme-sandy.vercel.app',
            'http://localhost:3000',
            'http://localhost:3199',
          ];
  app.enableCors({ origin: corsOrigin, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Documentation OpenAPI → /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PilotePME API')
    .setDescription('API de gestion pour entreprises de sécurité privée.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
}
void bootstrap();
