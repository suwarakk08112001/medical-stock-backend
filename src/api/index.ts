import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { configure as serverlessExpress } from '@vendia/serverless-express';
import { AppModule } from 'src/app.module';
import type {VercelRequest, VercelResponse} from '@vercel/node'
// import type { VercelRequest, VercelResponse } from '@vercel/node';

let server: any;

async function bootstrap() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);

  await app.init();

  return serverlessExpress({ app: expressApp });
}

export default async (req: VercelRequest, res: VercelResponse) => {
  server = server ?? (await bootstrap());
  return server(req, res);
};