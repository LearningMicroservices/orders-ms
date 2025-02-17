import { OrderStatus } from '@prisma/client';

export interface OrderWithProducts {
  OrderItem: {
    name: string | undefined;
    productId: number;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  totalItems: number;
  id: string;
  status: OrderStatus;
  paid: boolean;
  createdAt: Date;
  updatedAt: Date;
}
