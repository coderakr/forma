import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Product, Category, Page, StoreConfig } from './types';
export function useProducts(params = '') {
  return useQuery({
    queryKey: ['products', params],
    queryFn: ({ signal }) =>
      api<Page<Product>>(`/products${params ? `?${params}` : ''}`, { signal }),
  });
}
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
    staleTime: 300_000,
  });
}
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api<StoreConfig>('/config'),
    staleTime: Infinity,
  });
}
