import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { envs } from './config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: envs.nats.servers,
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          return `${error.property} has wrong value ${error.value}. ${Object.values(
            error.constraints || {},
          ).join(', ')}`;
        });
        return new RpcException({
          message: messages.join('; '),
          status: 'Bad Request',
          code: 400,
        });
      },
    }),
  );

  await app.listen();
}
void bootstrap();
