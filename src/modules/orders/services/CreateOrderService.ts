import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists', 400);
    }

    const dbProducts = await this.productsRepository.findAllById(products);

    const selectedProducts = products.map(product => {
      const { quantity } = product;
      const findProduct = dbProducts.find(
        dbProduct => dbProduct.id === product.id,
      );

      if (!findProduct) {
        throw new AppError('Product does not exists', 400);
      }

      if (findProduct.quantity < product.quantity) {
        throw new AppError('There is not enough stock', 400);
      }

      const selectedProduct = {
        product_id: product.id,
        price: findProduct.price,
        quantity,
      };

      return selectedProduct;
    });

    await this.productsRepository.updateQuantity(products);

    const order = await this.ordersRepository.create({
      customer,
      products: selectedProducts,
    });

    return order;
  }
}

export default CreateOrderService;
