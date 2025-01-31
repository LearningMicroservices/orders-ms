import { OrderStatus } from '@prisma/client';
import { IsEnum, IsString, IsUUID } from 'class-validator';

export class ChangeStatusDto {
  @IsString()
  @IsUUID(4)
  readonly id: string;

  @IsEnum(OrderStatus)
  readonly status: OrderStatus;
}
