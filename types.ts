/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  sku: string;
  name: string;
  unit: string;
  category: string;
  brand: string;
  price: number; // parsed numerical price
  rawPrice: string; // original price string
  qty: number; // parsed stock quantity
  rawQty: string; // original stock string
  imageUrl: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
}

export interface OrderDetails {
  customerName: string;
  whatsappNumber: string;
  shippingAddress: string;
  notes: string;
}
