import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, authClient } from './api';
import { useConfig } from './queries';
import type { Cart, Product } from './types';
export function useCart() {
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ['cart', session?.user.id],
    enabled: Boolean(session),
    queryFn: () => api<Cart>('/cart'),
  });
}
export function useUpdateCart() {
  const qc = useQueryClient();
  const { data: session } = authClient.useSession();
  const { data: config } = useConfig();
  const key = ['cart', session?.user.id];
  return useMutation({
    scope: { id: 'cart-write' },
    mutationFn: (input: {
      productId: string;
      variant: string;
      quantity: number;
      product?: Product;
    }) =>
      api<Cart>('/cart/items', {
        method: 'PUT',
        body: JSON.stringify({
          productId: input.productId,
          variant: input.variant,
          quantity: input.quantity,
        }),
      }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Cart>(key);
      if (previous && config) {
        const items = previous.items.filter(
          (i) => !(i.productId === input.productId && i.variant === input.variant),
        );
        const old = previous.items.find(
          (i) => i.productId === input.productId && i.variant === input.variant,
        );
        if (input.quantity)
          items.push({
            productId: input.productId,
            variant: input.variant,
            quantity: input.quantity,
            product: input.product ?? old?.product ?? null,
          });
        const subtotal = items.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0);
        const shipping =
          subtotal && subtotal < config.freeShippingThreshold ? config.shippingFee : 0;
        qc.setQueryData(key, {
          ...previous,
          items,
          subtotal,
          shipping,
          total: subtotal + shipping,
        });
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
      toast.error(error.message);
    },
    onSuccess: (data) => {
      qc.setQueryData(key, data);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}
