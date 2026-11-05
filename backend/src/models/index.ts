import { Schema, model } from 'mongoose';
const options = { timestamps: true, versionKey: false } as const;
const image = { type: String, required: true };
const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    image,
  },
  options,
);
export const Category = model('Category', categorySchema);
const productSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: 0 },
    stock: { type: Number, required: true, min: 0 },
    images: { type: [String], required: true },
    variants: { type: [String], default: ['Natural'] },
    material: { type: String, default: '' },
    dimensions: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  options,
);
productSchema.index({ active: 1, createdAt: -1, _id: -1 });
productSchema.index({ category: 1, active: 1, price: 1 });
export const Product = model('Product', productSchema);
const lineSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    variant: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: false },
);
export const Cart = model(
  'Cart',
  new Schema(
    {
      userId: { type: String, required: true, unique: true },
      items: { type: [lineSchema], default: [] },
    },
    options,
  ),
);
export const addressFields = {
  name: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: { type: String, default: '' },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
};
export const Address = model(
  'Address',
  new Schema({ userId: { type: String, required: true, index: true }, ...addressFields }, options),
);
const orderLineSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    variant: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  },
  { _id: false },
);
const orderSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    idempotencyKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    items: { type: [orderLineSchema], required: true },
    address: { type: new Schema(addressFields, { _id: false }), required: true },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true },
    currency: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
    status: {
      type: String,
      enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
    },
  },
  options,
);
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
export const Order = model('Order', orderSchema);
const reviewSchema = new Schema(
  {
    userId: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, required: true, index: true },
    author: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true },
    body: { type: String, required: true },
    verified: { type: Boolean, default: false },
  },
  options,
);
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
export const Review = model('Review', reviewSchema);
// Read-only view of Better Auth's collection. Auth exclusively owns user/session/account writes.
export const User = model(
  'User',
  new Schema(
    { name: String, email: String, role: { type: String, enum: ['user', 'admin'] } },
    { collection: 'user', strict: false },
  ),
);
export async function ensureIndexes() {
  await Promise.all([
    Category.init(),
    Product.init(),
    Cart.init(),
    Order.init(),
    Address.init(),
    Review.init(),
  ]);
}
