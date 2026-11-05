import { Link } from 'react-router-dom';
import { useConfig } from '../lib/queries';
import { money } from '../lib/utils';
import { PageMeta } from '../components/common';
export default function HelpPage() {
  const { data: config } = useConfig();
  return (
    <div className="container section help-page">
      <PageMeta title="Delivery & care" />
      <span className="eyebrow">A LITTLE PEACE OF MIND</span>
      <h1>Here for the everyday.</h1>
      <section>
        <h2>Coming to your door</h2>
        <p>
          We currently deliver within India.{' '}
          {config &&
            `Delivery is ${money(config.shippingFee, config.currency)}, and on us for orders of ${money(config.freeShippingThreshold, config.currency)} or more.`}{' '}
          Your final delivery charge is always shown before you place your order.
        </p>
        <p>
          Follow every step, from processing to delivery, in <Link to="/orders">your orders</Link>.
          Delivery times vary by destination and item.
        </p>
      </section>
      <section>
        <h2>Simple, considered payments</h2>
        <p>
          Cash on delivery is available for every order. No advance payment is taken. Your payment
          is recorded when your order is marked delivered.
        </p>
      </section>
      <section>
        <h2>Changing an order</h2>
        <p>
          Orders can be cancelled by the store team before shipment. Once shipped, an order cannot
          be cancelled in your account. Keep your order number handy when contacting the store.
        </p>
      </section>
      <section>
        <h2>Returns & care</h2>
        <p>
          Inspect your pieces when they arrive and keep the original packaging. Return eligibility
          and arrangements are confirmed by the store team before anything is sent back.
          Self-service returns are not currently available.
        </p>
        <p>For care instructions and materials, visit the details on each product page.</p>
      </section>
    </div>
  );
}
