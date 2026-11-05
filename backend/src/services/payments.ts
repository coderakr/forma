// Prepare is deterministic and side-effect-free: MongoDB can retry a transaction.
// Online providers should persist an outbox intent, then create their payment session after commit.
export interface PaymentProvider {
  readonly id: string;
  prepare(input: { amount: number; currency: string }): {
    paymentMethod: string;
    paymentStatus: 'pending';
  };
}
export class CashOnDeliveryProvider implements PaymentProvider {
  readonly id = 'cod';
  prepare(_input: { amount: number; currency: string }) {
    return { paymentMethod: this.id, paymentStatus: 'pending' as const };
  }
}
export const paymentProvider: PaymentProvider = new CashOnDeliveryProvider();
