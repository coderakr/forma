import { Link } from 'react-router-dom';
import { Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart, useUpdateCart } from '../lib/cart';
import { useConfig } from '../lib/queries';
import { money } from '../lib/utils';
import { PageMeta, Skeleton, ErrorState, EmptyState } from '../components/common';
import { Button } from '../components/ui/button';
import { Quantity } from '../components/quantity';
export default function CartPage() {
  const cart = useCart();
  const update = useUpdateCart();
  const { data: config } = useConfig();
  if (cart.isPending)
    return (
      <div className="container section">
        <Skeleton cards={2} />
      </div>
    );
  if (cart.error) return <ErrorState error={cart.error} retry={() => void cart.refetch()} />;
  const unavailable = cart.data.items.some(
    (i) =>
      !i.product?.active ||
      i.quantity > (i.product?.stock ?? 0) ||
      !i.product?.variants.includes(i.variant),
  );
  return (
    <div className="container section">
      <PageMeta title="Your bag" />
      {!cart.data.items.length ? (
        <EmptyState
          title="Room for something good."
          description="Your bag is empty for now. Find a piece that feels like you."
        />
      ) : (
        <>
          <span className="eyebrow">YOUR EVERYDAY, COMING TOGETHER</span>
          <h1>A few good things.</h1>
          <div className="checkout-layout">
            <div>
              <p className="muted">
                {cart.data.items.reduce((n, i) => n + i.quantity, 0)} pieces in your bag
              </p>
              {cart.data.items.map((i) => (
                <article className="cart-item" key={`${i.productId}-${i.variant}`}>
                  <Link to={i.product ? `/product/${i.product.slug}` : '/shop'}>
                    <img
                      src={i.product?.images[0]}
                      alt={i.product?.name ?? 'Unavailable product'}
                    />
                  </Link>
                  <div className="cart-item-info">
                    <h3>{i.product?.name ?? 'This piece is no longer available'}</h3>
                    <p className="muted">{i.variant}</p>
                    <p>{money(i.product?.price ?? 0, cart.data.currency)}</p>
                    {(!i.product?.active ||
                      i.quantity > i.product.stock ||
                      !i.product.variants.includes(i.variant)) && (
                      <p className="field-error">
                        This selection is unavailable. Update or remove it to continue.
                      </p>
                    )}
                    <Quantity
                      value={i.quantity}
                      max={Math.min(20, i.product?.stock ?? 0)}
                      disabled={update.isPending}
                      onChange={(quantity) =>
                        update.mutate({ productId: i.productId, variant: i.variant, quantity })
                      }
                    />
                  </div>
                  <div className="cart-item-end">
                    <strong>
                      {money((i.product?.price ?? 0) * i.quantity, cart.data.currency)}
                    </strong>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${i.product?.name ?? 'product'}`}
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({ productId: i.productId, variant: i.variant, quantity: 0 })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
              <Link to="/shop" className="text-link">
                Keep exploring
                <ArrowRight size={15} />
              </Link>
            </div>
            <aside className="order-summary">
              <h2>The little details.</h2>
              {config && (
                <p className="shipping-message">
                  {cart.data.subtotal >= config.freeShippingThreshold
                    ? 'Your delivery is on us.'
                    : `You’re ${money(config.freeShippingThreshold - cart.data.subtotal, cart.data.currency)} away from free delivery.`}
                </p>
              )}
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
              <p className="tax-note">Inclusive of all taxes</p>
              {unavailable ? (
                <p className="field-error">Please update unavailable items before checkout.</p>
              ) : (
                <Button asChild>
                  <Link to="/checkout">
                    Make them yours
                    <ArrowRight size={17} />
                  </Link>
                </Button>
              )}
              <p className="secure-note">
                <ShieldCheck size={15} />
                Secure checkout. A little peace of mind.
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
