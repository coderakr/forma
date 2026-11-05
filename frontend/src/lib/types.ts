// API contracts are intentionally local to the independently deployed storefront.
export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice: number;
  stock: number;
  images: string[];
  variants: string[];
  material: string;
  dimensions: string;
  featured: boolean;
  active: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
}
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
export interface Review {
  _id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  createdAt: string;
}
export interface StoreConfig {
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number;
}
export interface AddressInput {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: 'IN';
}
export interface Address extends AddressInput {
  _id: string;
}
export interface CartLine {
  productId: string;
  variant: string;
  quantity: number;
  product: Product | null;
}
export interface Cart {
  items: CartLine[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
}
export type OrderStatus = 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export interface Order {
  _id: string;
  items: {
    productId: string;
    name: string;
    image: string;
    variant: string;
    quantity: number;
    unitPrice: number;
  }[];
  address: AddressInput;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}
