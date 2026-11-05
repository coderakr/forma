import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, authClient } from '../lib/api';
import { useCart } from '../lib/cart';
import type { Address, AddressInput, Order } from '../lib/types';
import { money } from '../lib/utils';
import { PageMeta, Skeleton, ErrorState, EmptyState } from '../components/common';
import { Button } from '../components/ui/button';
import { AddressForm } from '../components/address-form';
export default function CheckoutPage() {
  const cart = useCart();
  const { data: session } = authClient.useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('');
  const [confirmed, setConfirmed] = useState<AddressInput | null>(null);
  const [key, setKey] = useState(() => {
    const existing = sessionStorage.getItem('forma-checkout-key');
    const value = existing ?? crypto.randomUUID();
    sessionStorage.setItem('forma-checkout-key', value);
    return value;
  });
  const addresses = useQuery({
    queryKey: ['addresses', session?.user.id],
    queryFn: () => api<Address[]>('/addresses'),
  });
  const order = useMutation({
    mutationFn: (address: AddressInput) =>
      api<Order>('/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify({ address, paymentMethod: 'cod', expectedTotal: cart.data!.total }),
      }),
    onSuccess: (data) => {
      sessionStorage.removeItem('forma-checkout-key');
      void qc.invalidateQueries({ queryKey: ['cart'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      navigate(`/orders/${data._id}/confirmation`, { replace: true });
    },
    onError: (error) => {
      toast.error(error.message);
      if (
        error instanceof ApiError &&
        ['PRICE_CHANGED', 'OUT_OF_STOCK', 'IDEMPOTENCY_CONFLICT'].includes(error.code ?? '')
      ) {
        void qc.invalidateQueries({ queryKey: ['cart'] });
        const next = crypto.randomUUID();
        sessionStorage.setItem('forma-checkout-key', next);
        setKey(next);
      }
    },
  });
  if (cart.isPending)
    return (
      <div className="container section">
        <Skeleton cards={2} />
      </div>
    );
  if (cart.error) return <ErrorState error={cart.error} retry={() => void cart.refetch()} />;
  if (!cart.data.items.length && !order.isSuccess)
    return (
      <EmptyState
        title="Your bag is taking a breather."
        description="Add a few favorites before checking out."
      />
    );
  const chosen = addresses.data?.find((a) => a._id === selected);
  const address = chosen
    ? {
        name: chosen.name,
        phone: chosen.phone,
        line1: chosen.line1,
        line2: chosen.line2,
        city: chosen.city,
        state: chosen.state,
        postalCode: chosen.postalCode,
        country: chosen.country,
      }
    : confirmed;
  const invalid = cart.data.items.some(
    (i) =>
      !i.product?.active ||
      i.quantity > (i.product?.stock ?? 0) ||
      !i.product?.variants.includes(i.variant),
  );
  return (
    <div className="container section">
      <PageMeta title="Checkout" />
      <Link className="text-link" to="/cart">
        <ArrowLeft size={15} />
        Back to your bag
      </Link>
      <h1 className="checkout-title">Almost home.</h1>
      <div className="checkout-layout">
        <div>
          <section className="checkout-step">
            <h2>
              <span>01</span>Where should we send it?
            </h2>
            {addresses.error && (
              <ErrorState error={addresses.error} retry={() => void addresses.refetch()} />
            )}
            {addresses.data && addresses.data.length > 0 && (
              <div className="saved-addresses">
                <label>
                  Saved addresses
                  <select
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setConfirmed(null);
                    }}
                  >
                    <option value="">Use a new address</option>
                    {addresses.data.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} — {a.line1}, {a.city}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {!selected && !confirmed && (
              <AddressForm
                initial={{ name: session?.user.name }}
                onSubmit={(a) => setConfirmed(a)}
                label="Use this address"
                id="checkout-address"
              />
            )}
            {address && (
              <div className="address-preview">
                <strong>{address.name}</strong>
                <p>
                  {address.line1}
                  <br />
                  {address.line2 && (
                    <>
                      {address.line2}
                      <br />
                    </>
                  )}
                  {address.city}, {address.state} {address.postalCode}
                  <br />
                  India · {address.phone}
                </p>
                {confirmed && (
                  <Button variant="ghost" onClick={() => setConfirmed(null)}>
                    Edit address
                  </Button>
                )}
              </div>
            )}
          </section>
          <section className="checkout-step">
            <h2>
              <span>02</span>A simple way to pay.
            </h2>
            <label className="payment-option">
              <input type="radio" name="payment" checked readOnly />
              <Banknote size={23} />
              <span>
                <strong>Cash on delivery</strong>
                <small>Pay when your good things arrive.</small>
              </span>
            </label>
          </section>
        </div>
        <aside className="order-summary">
          <h2>Coming home with you.</h2>
          {cart.data.items.map((i) => (
            <div className="mini-cart-item" key={`${i.productId}-${i.variant}`}>
              <img src={i.product?.images[0]} alt="" />
              <div>
                <strong>{i.product?.name}</strong>
                <p>
                  {i.variant} · Qty {i.quantity}
                </p>
              </div>
              <span>{money((i.product?.price ?? 0) * i.quantity, cart.data.currency)}</span>
            </div>
          ))}
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{money(cart.data.subtotal, cart.data.currency)}</span>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <span>
              {cart.data.shipping ? money(cart.data.shipping, cart.data.currency) : 'On us'}
            </span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{money(cart.data.total, cart.data.currency)}</span>
          </div>
          <p className="tax-note">Inclusive of all taxes. Pay on delivery.</p>
          {invalid && (
            <p className="field-error">
              A piece is no longer available. <Link to="/cart">Update your bag</Link>
            </p>
          )}
          <Button
            disabled={!address || order.isPending || invalid}
            onClick={() => address && order.mutate(address)}
          >
            {order.isPending ? 'Making it yours…' : 'Place your order'}
          </Button>
          {!address && (
            <p className="tax-note checkout-hint">Confirm your delivery address to continue.</p>
          )}
          {order.error && (
            <p role="alert" className="field-error">
              {order.error.message}
            </p>
          )}
          <p className="secure-note">
            <ShieldCheck size={15} />
            Your details are in safe hands.
          </p>
        </aside>
      </div>
    </div>
  );
}
