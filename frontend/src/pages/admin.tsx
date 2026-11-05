import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Archive,
  X,
  ArrowUpRight,
  Package,
  ShoppingBag,
  IndianRupee,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { useCategories, useConfig } from '../lib/queries';
import type { Product, Category, Order, OrderStatus, Page } from '../lib/types';
import { money } from '../lib/utils';
import { PageMeta, Skeleton, ErrorState } from '../components/common';
import { Button } from '../components/ui/button';
const productSchema = z
  .object({
    name: z.string().min(2).max(120),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: z.string().min(1),
    price: z.number().int().min(1).max(100000000),
    compareAtPrice: z.number().int().min(0).max(100000000),
    stock: z.number().int().min(0).max(100000),
    description: z.string().min(20).max(5000),
    images: z
      .string()
      .min(1)
      .refine(
        (v) =>
          v
            .split('\n')
            .filter(Boolean)
            .every((url) => z.url().safeParse(url).success),
        'One valid image URL per line',
      ),
    variants: z.string().min(1),
    material: z.string().max(200),
    dimensions: z.string().max(200),
    featured: z.boolean(),
    active: z.boolean(),
  })
  .refine((v) => !v.compareAtPrice || v.compareAtPrice > v.price, {
    message: 'Must be higher than the selling price',
    path: ['compareAtPrice'],
  });
type ProductFormData = z.infer<typeof productSchema>;
function Pagination({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) {
  return pages > 1 ? (
    <div className="pagination">
      <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
        Previous
      </Button>
      <span>
        {page} / {pages}
      </span>
      <Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
        Next
      </Button>
    </div>
  ) : null;
}
function EditorDialog({
  title,
  open,
  close,
  children,
}: {
  title: string;
  open: boolean;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="admin-modal">
          <div className="row-between">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close editor">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted">
            Changes are saved to your store when you submit.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function ProductEditor({ product, close }: { product: Product | 'new'; close: () => void }) {
  const categories = useCategories();
  const qc = useQueryClient();
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues:
      product === 'new'
        ? {
            name: '',
            slug: '',
            category: categories.data?.[0]?.slug ?? '',
            price: 0,
            compareAtPrice: 0,
            stock: 0,
            description: '',
            images: '',
            variants: 'Natural',
            material: '',
            dimensions: '',
            featured: false,
            active: true,
          }
        : { ...product, images: product.images.join('\n'), variants: product.variants.join(', ') },
  });
  const save = useMutation({
    mutationFn: (v: ProductFormData) =>
      api(`/admin/products${product === 'new' ? '' : `/${product._id}`}`, {
        method: product === 'new' ? 'POST' : 'PUT',
        body: JSON.stringify({
          ...v,
          images: v.images
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          variants: v.variants
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      }),
    onSuccess: () => {
      toast.success('Product saved');
      void qc.invalidateQueries();
      close();
    },
    onError: (e) => toast.error(e.message),
  });
  const input = (
    name:
      | 'name'
      | 'slug'
      | 'price'
      | 'compareAtPrice'
      | 'stock'
      | 'material'
      | 'dimensions'
      | 'variants',
    label: string,
    numeric = false,
  ) => (
    <label>
      {label}
      <input
        type={numeric ? 'number' : 'text'}
        {...form.register(name, numeric ? { valueAsNumber: true } : {})}
      />
      {form.formState.errors[name] && (
        <small className="field-error">{form.formState.errors[name]?.message}</small>
      )}
    </label>
  );
  return (
    <EditorDialog
      title={product === 'new' ? 'A new good thing' : `Edit ${product.name}`}
      open
      close={close}
    >
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
        <div className="form-grid">
          {input('name', 'Product name')}
          {input('slug', 'URL slug')}
          <label>
            Category
            <select {...form.register('category')} value={form.watch('category')}>
              <option value="" disabled>
                Select a category
              </option>
              {categories.data?.map((c) => (
                <option value={c.slug} key={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {form.formState.errors.category && (
              <small className="field-error">{form.formState.errors.category.message}</small>
            )}
          </label>
          {input('stock', 'Stock', true)}
          {input('price', 'Price (paise)', true)}
          {input('compareAtPrice', 'Compare-at price (paise, 0 for none)', true)}
          {input('material', 'Material')}
          {input('dimensions', 'Dimensions')}
        </div>
        <label>
          Description
          <textarea {...form.register('description')} />
          {form.formState.errors.description && (
            <small className="field-error">{form.formState.errors.description.message}</small>
          )}
        </label>
        <label>
          Image URLs (one per line)
          <textarea {...form.register('images')} />
          {form.formState.errors.images && (
            <small className="field-error">{form.formState.errors.images.message}</small>
          )}
        </label>
        {input('variants', 'Finishes (comma-separated)')}
        <div className="checkbox-row">
          <label>
            <input type="checkbox" {...form.register('featured')} />
            Featured
          </label>
          <label>
            <input type="checkbox" {...form.register('active')} />
            Visible in store
          </label>
        </div>
        <Button disabled={save.isPending} type="submit">
          {save.isPending ? 'Saving…' : 'Save product'}
        </Button>
      </form>
    </EditorDialog>
  );
}
function ProductsAdmin() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [archive, setArchive] = useState<Product | null>(null);
  const qc = useQueryClient();
  const { data: config } = useConfig();
  const products = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () => api<Page<Product>>(`/admin/products?page=${page}`),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setArchive(null);
      toast.success('Product archived');
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <div className="section-heading">
        <h2>The collection</h2>
        <Button onClick={() => setEditing('new')}>
          <Plus size={16} />
          Add product
        </Button>
      </div>
      {products.isPending ? (
        <Skeleton />
      ) : products.error ? (
        <ErrorState error={products.error} retry={() => void products.refetch()} />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.data.items.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="table-product">
                        <img src={p.images[0]} alt="" />
                        <div>
                          <strong>{p.name}</strong>
                          <small>{p.category}</small>
                        </div>
                      </div>
                    </td>
                    <td>{money(p.price, config?.currency)}</td>
                    <td>{p.stock}</td>
                    <td>
                      <span className="status">{p.active ? 'Active' : 'Archived'}</span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEditing(p)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Archive ${p.name}`}
                        disabled={!p.active}
                        onClick={() => setArchive(p)}
                      >
                        <Archive size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={products.data.pages} setPage={setPage} />
        </>
      )}
      {editing && <ProductEditor product={editing} close={() => setEditing(null)} />}
      {archive && (
        <EditorDialog title="Archive this piece?" open close={() => setArchive(null)}>
          <p>
            {archive.name} will be hidden from the storefront. Existing orders keep their details.
          </p>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(archive._id)}
          >
            Archive product
          </Button>
        </EditorDialog>
      )}
    </>
  );
}
const categorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(250),
  image: z.url(),
});
function CategoryEditor({ category, close }: { category: Category | 'new'; close: () => void }) {
  const qc = useQueryClient();
  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues:
      category === 'new' ? { name: '', slug: '', description: '', image: '' } : category,
  });
  const save = useMutation({
    mutationFn: (values: z.infer<typeof categorySchema>) =>
      api(`/admin/categories${category === 'new' ? '' : `/${category._id}`}`, {
        method: category === 'new' ? 'POST' : 'PUT',
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      toast.success('Category saved');
      close();
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <EditorDialog
      title={category === 'new' ? 'Create a category' : 'Edit category'}
      open
      close={close}
    >
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
        {(['name', 'slug', 'description', 'image'] as const).map((key) => (
          <label key={key}>
            {key === 'image' ? 'Image URL' : key}
            <input {...form.register(key)} readOnly={key === 'slug' && category !== 'new'} />
            {form.formState.errors[key] && (
              <small className="field-error">{form.formState.errors[key]?.message}</small>
            )}
          </label>
        ))}
        <Button type="submit" disabled={save.isPending}>
          Save category
        </Button>
      </form>
    </EditorDialog>
  );
}
function CategoriesAdmin() {
  const query = useCategories();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Category removed');
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <div className="section-heading">
        <h2>Find your space</h2>
        <Button onClick={() => setEditing('new')}>
          <Plus size={16} />
          Add category
        </Button>
      </div>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <div className="category-grid">
          {query.data.map((c) => (
            <article className="category-card" key={c._id}>
              <div>
                <img src={c.image} alt={c.name} />
              </div>
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <div className="account-links">
                <Button variant="outline" onClick={() => setEditing(c)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => setDeleting(c)}>
                  Remove
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <CategoryEditor category={editing} close={() => setEditing(null)} />}
      {deleting && (
        <EditorDialog title={`Remove ${deleting.name}?`} open close={() => setDeleting(null)}>
          <p>
            A category can only be removed after its products have been moved to another category.
          </p>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(deleting._id)}
          >
            Remove category
          </Button>
        </EditorDialog>
      )}
    </>
  );
}
const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  placed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
function OrdersAdmin() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: () => api<Page<Order>>(`/admin/orders?page=${page}`),
  });
  const update = useMutation({
    mutationFn: (input: { id: string; status: OrderStatus }) =>
      api<Order>(`/admin/orders/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: (order) => {
      setSelected(order);
      toast.success('Order updated');
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <div className="section-heading">
        <h2>On their way home</h2>
      </div>
      {orders.isPending ? (
        <Skeleton cards={2} />
      ) : orders.error ? (
        <ErrorState error={orders.error} retry={() => void orders.refetch()} />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.items.map((o) => (
                  <tr key={o._id}>
                    <td>
                      #{o._id.slice(-8).toUpperCase()}
                      <small>{new Date(o.createdAt).toLocaleDateString()}</small>
                    </td>
                    <td>{o.address.name}</td>
                    <td>{money(o.total, o.currency)}</td>
                    <td>
                      <span className={`status status-${o.status}`}>{o.status}</span>
                    </td>
                    <td>
                      <Button variant="ghost" onClick={() => setSelected(o)}>
                        Manage
                        <ArrowUpRight size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.data.items.length === 0 && (
              <p className="muted">Your first order will appear here.</p>
            )}
          </div>
          <Pagination page={page} pages={orders.data.pages} setPage={setPage} />
        </>
      )}
      {selected && (
        <EditorDialog
          title={`Order #${selected._id.slice(-8).toUpperCase()}`}
          open
          close={() => setSelected(null)}
        >
          <p className="address-text">
            {selected.address.name} · {selected.address.phone}
            <br />
            {selected.address.line1}, {selected.address.line2}
            <br />
            {selected.address.city}, {selected.address.state} {selected.address.postalCode}
          </p>
          {selected.items.map((i) => (
            <div className="summary-row" key={`${i.productId}-${i.variant}`}>
              <span>
                {i.name} · {i.variant} × {i.quantity}
              </span>
              <span>{money(i.unitPrice * i.quantity, selected.currency)}</span>
            </div>
          ))}
          <div className="summary-row total">
            <span>Total (including delivery)</span>
            <strong>{money(selected.total, selected.currency)}</strong>
          </div>
          <p>Cash on delivery · {selected.paymentStatus}</p>
          <p className="muted">Current status: {selected.status}</p>
          <div className="account-links">
            {nextStatuses[selected.status].map((status) => (
              <Button
                key={status}
                variant={status === 'cancelled' ? 'destructive' : 'default'}
                disabled={update.isPending}
                onClick={() => update.mutate({ id: selected._id, status })}
              >
                {status === 'cancelled' ? 'Cancel & restore stock' : `Mark ${status}`}
              </Button>
            ))}
          </div>
        </EditorDialog>
      )}
    </>
  );
}
export default function AdminPage() {
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () =>
      api<{ products: number; orders: number; lowStock: number; revenue: number }>('/admin/stats'),
  });
  const { data: config } = useConfig();
  return (
    <div className="container section">
      <PageMeta title="Store dashboard" />
      <span className="eyebrow">BEHIND THE GOOD THINGS</span>
      <h1>The Forma studio.</h1>
      {stats.error ? (
        <ErrorState error={stats.error} retry={() => void stats.refetch()} />
      ) : (
        <div className="stats-grid">
          {[
            {
              title: 'Delivered revenue',
              value: money(stats.data?.revenue ?? 0, config?.currency),
              icon: IndianRupee,
            },
            { title: 'Orders', value: stats.data?.orders, icon: ShoppingBag },
            { title: 'Active pieces', value: stats.data?.products, icon: Package },
            { title: 'Running low', value: stats.data?.lowStock, icon: AlertCircle },
          ].map((s) => (
            <div className="stat-card" key={s.title}>
              <s.icon size={20} strokeWidth={1.4} />
              <span>{s.title}</span>
              {stats.isPending ? (
                <div className="skeleton skeleton-line" />
              ) : (
                <strong>{s.value}</strong>
              )}
            </div>
          ))}
        </div>
      )}
      <Tabs.Root defaultValue="products">
        <Tabs.List className="admin-tabs" aria-label="Store management">
          <Tabs.Trigger value="products">Products</Tabs.Trigger>
          <Tabs.Trigger value="orders">Orders</Tabs.Trigger>
          <Tabs.Trigger value="categories">Categories</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="products">
          <ProductsAdmin />
        </Tabs.Content>
        <Tabs.Content value="orders">
          <OrdersAdmin />
        </Tabs.Content>
        <Tabs.Content value="categories">
          <CategoriesAdmin />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
