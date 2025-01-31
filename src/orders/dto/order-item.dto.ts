import { IsNumber, IsPositive } from 'class-validator';

export class OrderItemDto {
  @IsNumber()
  @IsPositive()
  readonly productId: number;

  @IsNumber()
  @IsPositive()
  readonly quantity: number;
}
