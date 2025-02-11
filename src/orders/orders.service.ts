import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { NATS_SERVICE } from 'src/config/services';
import { firstValueFrom } from 'rxjs';
import { Product } from './types/products.types';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  constructor(@Inject(NATS_SERVICE) private readonly natsClient: ClientProxy) {
    super();
  }

  private readonly logger = new Logger('OrdersService');

  async onModuleInit() {
    this.logger.log('Database connected');
    await this.$connect();
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      const ids = createOrderDto.items.map((product) => product.productId);
      const products: Product[] = await firstValueFrom(
        this.natsClient.send('validateProducts', ids),
      );

      const { totalAmount, totalItems } = createOrderDto.items.reduce(
        (acc, orderItem) => {
          const price = products.find(
            (product) => product.id === orderItem.productId,
          )?.price;
          acc.totalAmount += (price ?? 0) * orderItem.quantity;
          acc.totalItems += orderItem.quantity;
          return acc;
        },
        { totalAmount: 0, totalItems: 0 },
      );

      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                quantity: orderItem.quantity,
                productId: orderItem.productId,
                price: products.find(
                  (product) => product.id === orderItem.productId,
                )?.price,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId)
            ?.name,
        })),
      };
    } catch (error) {
      if (error.toString().includes('Empty response')) {
        return {
          status: 500,
          message: error
            .toString()
            .substring(0, error.toString().indexOf('(') - 1),
        };
      }

      throw new RpcException({
        message: error,
        status: 'Bad request',
        code: 400,
      });
    }

    // return {
    //   service: 'orders',
    //   createOrderDto,
    // };
    // // return this.order.create({
    // //   data: createOrderDto,
    // // });
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page, limit } = orderPaginationDto;
    const total = await this.order.count({
      where: { status: orderPaginationDto.status },
    });
    const lastPage = Math.ceil(total / limit);
    if (page > lastPage) {
      return {
        data: [],
        meta: {
          total,
          page,
          lastPage,
        },
      };
    }

    return {
      data: await this.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { status: orderPaginationDto.status },
      }),
      meta: {
        total,
        page,
        lastPage,
      },
    };
  }

  async findOne(id: string) {
    try {
      const order = await this.order.findFirst({
        where: { id },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });
      if (!order) {
        throw new RpcException({
          message: `order #${id} not found`,
          status: 'Bad request',
          code: 400,
        });
      }

      const productsIds = order.OrderItem.map(
        (orderItem) => orderItem.productId,
      );

      const products: Product[] = await firstValueFrom(
        this.natsClient.send('validateProducts', productsIds),
      );

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId)
            ?.name,
        })),
      };
    } catch (error) {
      if (error.toString().includes('Empty response')) {
        return {
          status: 500,
          message: error
            .toString()
            .substring(0, error.toString().indexOf('(') - 1),
        };
      }

      throw new RpcException({
        message: error,
        status: 'Bad request',
        code: 400,
      });
    }
  }

  async changeStatus(changeStatusDto: ChangeStatusDto) {
    try {
      const { id, status } = changeStatusDto;

      return await this.order.update({
        where: { id },
        data: { status },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new RpcException({
            message: `Product #${changeStatusDto.id} not found`,
            status: 'Bad request',
            code: 400,
          });
        }
      }
      throw error;
    }
  }
}
