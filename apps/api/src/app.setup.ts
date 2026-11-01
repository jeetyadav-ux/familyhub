import { VersioningType, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Env } from './config/env.js';

/** Applies the same HTTP setup in production and in tests. */
export function configureApp(app: INestApplication, env: Env): void {
  app.use(helmet());
  app.enableCors({ origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : false });
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();

  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('FamilyHub API')
      .setDescription('Server-side endpoints. Authenticate with a Supabase access token (Bearer).')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, config));
  }
}
