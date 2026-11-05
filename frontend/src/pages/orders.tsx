import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ArrowUpRight, Package } from 'lucide-react';
import { api, authClient } from '../lib/api';
import type { Order, Page } from '../lib/types';
import { money } from '../lib/utils';
import { PageMeta, Skeleton, ErrorState, EmptyState } from '../components/common';
import { Button } from '../components/ui/button';
export function OrdersPage() {
  const { data: session } = authClient.useSession();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['orders', session?.user.id, page],
    queryFn: () => api<Page<Order>>(`/orders?page=${page}`),
  });
  return (
    <div className="container section">
      <PageMeta title="Your orders" />
      <span className="eyebrow">YOUR FORMA STORY</span>
      <h1>Good things, on their way.</h1>
      {query.isPending ? (
        <Skeleton cards={2} />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.items.length ? (
        <EmptyState
          title="The start of something good."
          description="Your orders will feel right at home here once you find your first favorite."
        />
      ) : (
        <>
          <div className="orders-list">
            {query.data.items.map((o) => (
              <Link className="order-card" to={`/orders/${o._id}`} key={o._id}>
                <Package size={23} strokeWidth={1.3} />
                <div>
                  <h3>Order #{o._id.slice(-8).toUpperCase()}</h3>
                  <p>
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} ·{' '}
                    {o.items.reduce((n, i) => n + i.quantity, 0)} pieces
                  </p>
                </div>
                <span className={`status status-${o.status}`}>{o.status}</span>
                <strong>{money(o.total, o.currency)}</strong>
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
          {query.data.pages > 1 && (
            <div className="pagination">
              <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span>
                {page}/{query.data.pages}
              </span>
              <Button disabled={page >= query.data.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default function OrderDetailPage({ confirmation = false }: { confirmation?: boolean }) {
  const { id } = useParams();
  const { data: session } = authClient.useSession();
  const query = useQuery({
    queryKey: ['order', id, session?.user.id],
    queryFn: () => api<Order>(`/orders/${id}`),
  });
  if (query.isPending)
    return (
      <div className="container section">
        <Skeleton cards={2} />
      </div>
    );
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const o = query.data;
  return (
    <div className="container section">
      <PageMeta title={confirmation ? 'Thank you for your order' : `Order ${o._id.slice(-8)}`} />
      {confirmation ? (
        <div className="confirmation">
          <div className="confirmation-check">
            <Check size={32} />
          </div>
          <span className="eyebrow">A LITTLE HAPPINESS, ON ITS WAY</span>
          <h1>Good things are coming.</h1>
          <p>
            Thank you, {o.address.name.split(' ')[0]}. We’re getting your pieces ready.
            <br />
            Keep an eye on your order right here.
          </p>
        </div>
      ) : (
        <>
          <span className="eyebrow">YOUR ORDER</span>
          <h1>A few good things.</h1>
        </>
      )}
      <div className="order-detail-heading">
        <h2>Order #{o._id.slice(-8).toUpperCase()}</h2>
        <span className={`status status-${o.status}`}>{o.status}</span>
        <p>{new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
      </div>
      {o.status !== 'cancelled' && (
        <ol className="order-timeline">
          {['placed', 'processing', 'shipped', 'delivered'].map((s, i) => (
            <li
              key={s}
              className={
                i <= ['placed', 'processing', 'shipped', 'delivered'].indexOf(o.status)
                  ? 'complete'
                  : ''
              }
            >
              <span>{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
      <div className="checkout-layout">
        <div>
          {o.items.map((i) => (
            <div className="cart-item" key={`${i.productId}-${i.variant}`}>
              <img src={i.image} alt={i.name} />
              <div className="cart-item-info">
                <h3>{i.name}</h3>
                <p className="muted">
                  {i.variant} · Qty {i.quantity}
                </p>
                <p>{money(i.unitPrice * i.quantity, o.currency)}</p>
              </div>
            </div>
          ))}
          <Button asChild variant="outline">
            <Link to="/orders">All your orders</Link>
          </Button>
        </div>
        <aside className="order-summary">
          <h2>The details.</h2>
          <h3>Coming to</h3>
          <p className="address-text">
            {o.address.name}
            <br />
            {o.address.line1}
            <br />
            {o.address.line2 && (
              <>
                {o.address.line2}
                <br />
              </>
            )}
            {o.address.city}, {o.address.state} {o.address.postalCode}
            <br />
            India · {o.address.phone}
          </p>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{money(o.subtotal, o.currency)}</span>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <span>{o.shipping ? money(o.shipping, o.currency) : 'On us'}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{money(o.total, o.currency)}</span>
          </div>
          <p className="tax-note">Cash on delivery · {o.paymentStatus}</p>
        </aside>
      </div>
    </div>
  );
}
