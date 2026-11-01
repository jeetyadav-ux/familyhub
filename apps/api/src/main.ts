import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { loadEnv } from './config/env.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule.forRoot({ env }));
  configureApp(app, env);
  await app.listen(env.PORT, '0.0.0.0');
  const docs = env.NODE_ENV !== 'production' ? ' (API docs at /docs)' : '';
  new Logger('FamilyHub').log(`API listening on port ${env.PORT}${docs}`);
}

void bootstrap();
