import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsPositive } from 'class-validator';

export class CreateOrderDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  readonly totalAmount: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  readonly totalItems: number;

  @IsEnum(OrderStatus)
  status: OrderStatus = OrderStatus.PENDING;
}
