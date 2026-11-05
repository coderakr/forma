import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { env, parseSeedEnv } from '../src/config/env.js';
if (env.NODE_ENV === 'production')
  throw new Error('Run E2E only against a local/test API and database');
const seed = parseSeedEnv();
const run = `e2e-${randomUUID().slice(0, 8)}`;
const users: string[] = [];
const products: string[] = [];
const categories: string[] = [];
let assertions = 0;
function check(condition: unknown, message: string) {
  assert.ok(condition, message);
  assertions++;
  console.log(`✓ ${message}`);
}
class BrowserSession {
  cookie = '';
  async request<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    extra: Record<string, string> = {},
  ) {
    const response = await fetch(`${env.BETTER_AUTH_URL}${path}`, {
      method,
      headers: {
        Origin: env.FRONTEND_URL,
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...extra,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) this.cookie = cookies.map((c) => c.split(';')[0]).join('; ');
    return {
      status: response.status,
      headers: response.headers,
      body: (await response.json()) as T,
    };
  }
  async signup(label: string) {
    const result = await this.request<{ user: { id: string; role: string } }>(
      '/api/auth/sign-up/email',
      'POST',
      {
        name: `${run} ${label}`,
        email: `${run}-${label}@example.test`,
        password: `${run}-GoodPassphrase!`,
        role: 'admin',
      },
    );
    assert.equal(result.status, 200, JSON.stringify(result.body));
    users.push(result.body.user.id);
    return result.body.user;
  }
}
interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  variants: string[];
}
interface Cart {
  subtotal: number;
  shipping: number;
  total: number;
  items: unknown[];
}
interface Order {
  _id: string;
  total: number;
  status: string;
  items: { unitPrice: number }[];
}
const anonymous = new BrowserSession();
const first = new BrowserSession();
const second = new BrowserSession();
const admin = new BrowserSession();
const client = new MongoClient(env.MONGODB_URI);
await client.connect();
const db = client.db();
try {
  check(
    (await anonymous.request('/health')).status === 200,
    'independent production API responds to health check',
  );
  const user = await first.signup('first');
  await second.signup('second');
  check(user.role === 'user', 'sign-up cannot grant itself administrator privileges');
  check((await first.request('/api/me')).status === 200, 'cookie session resolves after sign-up');
  check((await anonymous.request('/api/cart')).status === 401, 'anonymous carts are protected');
  check(
    (await first.request('/api/admin/stats')).status === 403,
    'store admin routes reject regular users',
  );
  check((await first.request('/api/auth/sign-out', 'POST', {})).status === 200, 'sign-out works');
  first.cookie = '';
  check((await first.request('/api/me')).status === 401, 'sign-out invalidates the session');
  const signin = await first.request('/api/auth/sign-in/email', 'POST', {
    email: `${run}-first@example.test`,
    password: `${run}-GoodPassphrase!`,
  });
  check(
    signin.status === 200 && Boolean(first.cookie),
    'email/password sign-in restores the cookie session',
  );
  check(
    signin.headers.get('access-control-allow-origin') === env.FRONTEND_URL &&
      signin.headers.get('access-control-allow-credentials') === 'true',
    'credentialed CORS uses the configured frontend origin',
  );
  const auth = await admin.request('/api/auth/sign-in/email', 'POST', {
    email: seed.SEED_ADMIN_EMAIL,
    password: seed.SEED_ADMIN_PASSWORD,
  });
  assert.equal(auth.status, 200, JSON.stringify(auth.body));
  check(
    (await admin.request('/api/admin/stats')).status === 200,
    'seeded administrator can manage the store',
  );
  const category = await admin.request<{ _id: string }>('/api/admin/categories', 'POST', {
    name: run,
    slug: run,
    description: 'Isolated test category',
    image: `${seed.IMAGE_BASE_URL}/photo-1514228742587-6b1558fcca3d`,
  });
  assert.equal(category.status, 201);
  categories.push(category.body._id);
  const productBody = (slug: string, stock: number) => ({
    name: `${run} ${slug}`,
    slug: `${run}-${slug}`,
    description: 'A test piece created only for isolated checkout verification.',
    category: run,
    price: 123400,
    compareAtPrice: 150000,
    stock,
    images: [`${seed.IMAGE_BASE_URL}/photo-1514228742587-6b1558fcca3d`],
    variants: ['Natural', 'Sage'],
    material: 'Ceramic',
    dimensions: '10 cm',
    featured: false,
    active: true,
  });
  async function createProduct(slug: string, stock: number) {
    const result = await admin.request<Product>(
      '/api/admin/products',
      'POST',
      productBody(slug, stock),
    );
    assert.equal(result.status, 201, JSON.stringify(result.body));
    products.push(result.body._id);
    return result.body;
  }
  const product = await createProduct('piece', 10);
  check(
    (
      await anonymous.request<{ total: number }>(
        `/api/products?category=${run}&q=piece&sort=price-asc`,
      )
    ).body.total === 1,
    'search, category filters and sorting work against the real catalog',
  );
  check(
    (await anonymous.request('/api/products?limit=-1')).status === 400,
    'invalid pagination is rejected',
  );
  check(
    (
      await first.request(
        '/api/cart/items',
        'PUT',
        { productId: product._id, variant: 'Natural', quantity: 1 },
        { Origin: '' },
      )
    ).status === 403,
    'store mutations reject missing/untrusted origins',
  );
  check(
    (
      await first.request('/api/cart/items', 'PUT', {
        productId: product._id,
        variant: 'Fake',
        quantity: 1,
      })
    ).status === 400,
    'invalid product finishes are rejected',
  );
  check(
    (
      await first.request('/api/cart/items', 'PUT', {
        productId: product._id,
        variant: 'Natural',
        quantity: 11,
      })
    ).status === 409,
    'cart quantities cannot exceed available inventory',
  );
  const cart = await first.request<Cart>('/api/cart/items', 'PUT', {
    productId: product._id,
    variant: 'Natural',
    quantity: 2,
  });
  check(
    cart.status === 200 && cart.body.subtotal === product.price * 2,
    'cart prices come from the catalog in integer minor units',
  );
  check(
    (await second.request<Cart>('/api/cart')).body.items.length === 0,
    'carts are isolated between users',
  );
  const address = {
    name: 'Test Buyer',
    phone: '9876543210',
    line1: '12 Test Lane',
    line2: 'Apartment 3',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411001',
    country: 'IN',
  };
  const saved = await first.request<{ _id: string }>('/api/addresses', 'POST', address);
  check(saved.status === 201, 'delivery addresses can be saved');
  check(
    (await second.request(`/api/addresses/${saved.body._id}`, 'DELETE')).status === 404,
    'another user cannot delete a saved address',
  );
  const orderBody = { address, paymentMethod: 'cod', expectedTotal: cart.body.total };
  check(
    (
      await first.request(
        '/api/orders',
        'POST',
        { ...orderBody, total: 1 },
        { 'Idempotency-Key': randomUUID() },
      )
    ).status === 400,
    'client-supplied order totals are rejected',
  );
  check(
    (
      await first.request(
        '/api/orders',
        'POST',
        { ...orderBody, expectedTotal: 1 },
        { 'Idempotency-Key': randomUUID() },
      )
    ).status === 409,
    'changed/mismatched prices abort checkout',
  );
  check(
    (await db.collection('products').findOne({ _id: new ObjectId(product._id) }))?.stock === 10,
    'failed checkout rolls back inventory',
  );
  const key = randomUUID();
  const [a, b] = await Promise.all([
    first.request<Order>('/api/orders', 'POST', orderBody, { 'Idempotency-Key': key }),
    first.request<Order>('/api/orders', 'POST', orderBody, { 'Idempotency-Key': key }),
  ]);
  assert.equal(a.status, 201, JSON.stringify(a.body));
  assert.equal(b.status, 201, JSON.stringify(b.body));
  check(a.body._id === b.body._id, 'concurrent checkout retries create exactly one order');
  check(
    a.body.total === cart.body.total && a.body.items[0]?.unitPrice === product.price,
    'order stores authoritative prices and totals',
  );
  check(
    (await db.collection('products').findOne({ _id: new ObjectId(product._id) }))?.stock === 8,
    'stock decrements exactly once',
  );
  check(
    (await first.request<Cart>('/api/cart')).body.items.length === 0,
    'successful checkout atomically clears the cart',
  );
  check(
    (await second.request(`/api/orders/${a.body._id}`)).status === 404,
    'order details cannot be read by another customer',
  );
  check(
    (await first.request(`/api/orders/${a.body._id}`)).status === 200,
    'customer can retrieve confirmation and order details',
  );
  check(
    (await admin.request(`/api/admin/orders/${a.body._id}`, 'PATCH', { status: 'delivered' }))
      .status === 409,
    'order lifecycle prevents skipping fulfilment steps',
  );
  for (const status of ['processing', 'shipped', 'delivered'])
    assert.equal(
      (await admin.request(`/api/admin/orders/${a.body._id}`, 'PATCH', { status })).status,
      200,
    );
  check(
    (
      await first.request(`/api/products/${product._id}/reviews`, 'POST', {
        rating: 5,
        title: 'A lovely piece',
        body: 'Beautifully made and exactly what I needed.',
      })
    ).status === 201,
    'delivered customers can leave a verified review',
  );
  check(
    (
      await second.request(`/api/products/${product._id}/reviews`, 'POST', {
        rating: 5,
        title: 'A lovely piece',
        body: 'Beautifully made and exactly what I needed.',
      })
    ).status === 403,
    'reviews require a delivered purchase',
  );
  const last = await createProduct('last-item', 1);
  const ca = await first.request<Cart>('/api/cart/items', 'PUT', {
    productId: last._id,
    variant: 'Natural',
    quantity: 1,
  });
  const cb = await second.request<Cart>('/api/cart/items', 'PUT', {
    productId: last._id,
    variant: 'Sage',
    quantity: 1,
  });
  const race = await Promise.all([
    first.request<Order>(
      '/api/orders',
      'POST',
      { ...orderBody, expectedTotal: ca.body.total },
      { 'Idempotency-Key': randomUUID() },
    ),
    second.request<Order>(
      '/api/orders',
      'POST',
      { ...orderBody, expectedTotal: cb.body.total },
      { 'Idempotency-Key': randomUUID() },
    ),
  ]);
  check(
    race.filter((r) => r.status === 201).length === 1 &&
      race.filter((r) => r.status === 409).length === 1,
    'two customers competing for the last unit cannot oversell',
  );
  check(
    (await db.collection('products').findOne({ _id: new ObjectId(last._id) }))?.stock === 0,
    'inventory stays nonnegative after competing purchases',
  );
  const winner = race.find((r) => r.status === 201)!;
  await admin.request(`/api/admin/orders/${winner.body._id}`, 'PATCH', { status: 'cancelled' });
  await admin.request(`/api/admin/orders/${winner.body._id}`, 'PATCH', { status: 'cancelled' });
  check(
    (await db.collection('products').findOne({ _id: new ObjectId(last._id) }))?.stock === 1,
    'repeat cancellation restores stock only once',
  );
  check(
    (await admin.request(`/api/admin/categories/${category.body._id}`, 'DELETE')).status === 409,
    'categories in use cannot be removed',
  );
  check(
    (await admin.request(`/api/admin/products/${product._id}`, 'DELETE')).status === 200 &&
      (await anonymous.request(`/api/products/${product.slug}`)).status === 404,
    'archived products disappear from public catalog',
  );
  console.log(`\n${assertions} end-to-end checks passed.`);
} finally {
  const userKeys = users.flatMap((id) => (ObjectId.isValid(id) ? [id, new ObjectId(id)] : [id]));
  for (const collection of ['carts', 'orders', 'addresses', 'reviews', 'session', 'account'])
    await db.collection(collection).deleteMany({ userId: { $in: userKeys } });
  await db.collection('user').deleteMany({
    _id: { $in: users.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) },
  });
  await db
    .collection('products')
    .deleteMany({ _id: { $in: products.map((id) => new ObjectId(id)) } });
  await db
    .collection('categories')
    .deleteMany({ _id: { $in: categories.map((id) => new ObjectId(id)) } });
  await client.close();
}
