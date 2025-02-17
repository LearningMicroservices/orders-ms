import { Controller } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { PaidOrderDto } from './dto/paid-order.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order);

    return { order, paymentSession };
  }

  @MessagePattern('findAllOrders')
  findAll(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload() id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern('changeStatus')
  changeStatus(@Payload() ChangeStatusDto: ChangeStatusDto) {
    return this.ordersService.changeStatus(ChangeStatusDto);
  }

  @EventPattern('payment.succeeded')
  handlePaymentSucceeded(@Payload() paidOrderDto: PaidOrderDto) {
    return this.ordersService.handlePaymentSucceeded(paidOrderDto);
  }
}
