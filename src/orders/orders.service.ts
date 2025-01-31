import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeStatusDto } from './dto/change-status.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  async onModuleInit() {
    this.logger.log('Database connected');
    await this.$connect();
  }

  create(createOrderDto: CreateOrderDto) {
    return this.order.create({
      data: createOrderDto,
    });
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
    const order = await this.order.findFirst({
      where: { id },
    });
    if (!order) {
      throw new RpcException({
        message: `order #${id} not found`,
        status: 'Bad request',
        code: 400,
      });
    }
    return order;
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
