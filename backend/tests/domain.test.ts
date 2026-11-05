import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTotals } from '../src/services/cart.js';
import { env } from '../src/config/env.js';
import { addressInput } from '../src/lib/validation.js';
import { transitions } from '../src/services/orders.js';
test('shipping threshold uses integer minor units, including an empty bag', () => {
  assert.equal(calculateTotals(0).total, 0);
  assert.equal(calculateTotals(env.FREE_SHIPPING_THRESHOLD - 1).shipping, env.SHIPPING_FEE);
  assert.equal(calculateTotals(env.FREE_SHIPPING_THRESHOLD).shipping, 0);
  assert.equal(calculateTotals(1999).total, 1999 + env.SHIPPING_FEE);
});
test('terminal orders cannot be re-opened or cancelled twice', () => {
  assert.deepEqual(transitions.delivered, []);
  assert.deepEqual(transitions.cancelled, []);
  assert.equal(transitions.shipped?.includes('cancelled'), false);
});
test('address validation rejects extra fields and invalid PIN codes', () => {
  const address = {
    name: 'Test Person',
    phone: '9876543210',
    line1: '12 Example Lane',
    line2: '',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411001',
    country: 'IN',
  };
  assert.equal(addressInput.safeParse(address).success, true);
  assert.equal(addressInput.safeParse({ ...address, userId: 'someone-else' }).success, false);
  assert.equal(addressInput.safeParse({ ...address, postalCode: 'wrong' }).success, false);
});
