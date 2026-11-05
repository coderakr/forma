import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Star, Truck, ArrowRight, Check, ShoppingBag } from 'lucide-react';
import { api, authClient } from '../lib/api';
import type { Product, Review, Page } from '../lib/types';
import { useProducts, useConfig } from '../lib/queries';
import { useCart, useUpdateCart } from '../lib/cart';
import { money } from '../lib/utils';
import { PageMeta, Skeleton, ErrorState } from '../components/common';
import { Button } from '../components/ui/button';
import { ProductCard } from '../components/product-card';
import { Quantity } from '../components/quantity';
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3, 'Add a short title').max(100),
  body: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(2000),
});
function Reviews({ product }: { product: Product }) {
  const { data: session } = authClient.useSession();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const reviews = useQuery({
    queryKey: ['reviews', product._id, page],
    queryFn: () => api<Page<Review>>(`/products/${product._id}/reviews?page=${page}&limit=6`),
  });
  const form = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, title: '', body: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof reviewSchema>) =>
      api(`/products/${product._id}/reviews`, { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success('Thank you for sharing your thoughts');
      form.reset();
      void qc.invalidateQueries({ queryKey: ['reviews'] });
      void qc.invalidateQueries({ queryKey: ['product'] });
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <section className="section reviews-section" id="reviews">
      <div>
        <span className="eyebrow">FROM OUR COMMUNITY</span>
        <h2>At home with you.</h2>
        <p className="muted">
          {product.reviewCount
            ? `${product.rating.toFixed(1)} out of 5 · ${product.reviewCount} reviews`
            : 'A new favorite, waiting for its first story.'}
        </p>
        {reviews.isPending ? (
          <Skeleton cards={2} />
        ) : reviews.error ? (
          <ErrorState error={reviews.error} />
        ) : (
          <>
            {reviews.data.items.map((r) => (
              <article className="review" key={r._id}>
                <div className="review-stars" aria-label={`${r.rating} out of 5 stars`}>
                  {Array.from({ length: r.rating }, (_, i) => (
                    <Star size={13} fill="currentColor" key={i} />
                  ))}
                </div>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
                <small>
                  {r.author} · {new Date(r.createdAt).toLocaleDateString()}
                  {r.verified && ' · Verified purchase'}
                </small>
              </article>
            ))}
            {reviews.data.pages > 1 && (
              <div className="pagination">
                <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span>
                  {page}/{reviews.data.pages}
                </span>
                <Button disabled={page >= reviews.data.pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="review-form">
        <h3>A piece of your everyday?</h3>
        <p className="muted">Share your thoughts after your order arrives.</p>
        {session ? (
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
            <label>
              Your rating
              <select {...form.register('rating', { valueAsNumber: true })}>
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={v}>
                    {v} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              A few words
              <input {...form.register('title')} />
              {form.formState.errors.title && (
                <small className="field-error">{form.formState.errors.title.message}</small>
              )}
            </label>
            <label>
              Your experience
              <textarea {...form.register('body')} />
              {form.formState.errors.body && (
                <small className="field-error">{form.formState.errors.body.message}</small>
              )}
            </label>
            <Button type="submit" disabled={mutation.isPending}>
              Share your review
            </Button>
          </form>
        ) : (
          <Button variant="outline" asChild>
            <Link to={`/sign-in?next=${encodeURIComponent(`/product/${product.slug}`)}`}>
              Sign in to review
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
function ProductContent({ product }: { product: Product }) {
  const [selected, setSelected] = useState(0);
  const [variant, setVariant] = useState(product.variants[0] ?? '');
  const [quantity, setQuantity] = useState(1);
  const { data: config } = useConfig();
  const { data: session } = authClient.useSession();
  const cart = useCart();
  const update = useUpdateCart();
  const navigate = useNavigate();
  const related = useProducts(`category=${product.category}&limit=5`);
  function addToCart() {
    if (!session) {
      navigate(`/sign-in?next=${encodeURIComponent(`/product/${product.slug}`)}`);
      return;
    }
    if (!cart.data) return;
    const current =
      cart.data.items.find((i) => i.productId === product._id && i.variant === variant)?.quantity ??
      0;
    update.mutate(
      { productId: product._id, variant, quantity: current + quantity, product },
      {
        onSuccess: () =>
          toast.success('A good choice. Added to your bag.', {
            action: { label: 'View bag', onClick: () => navigate('/cart') },
          }),
      },
    );
  }
  return (
    <>
      <PageMeta title={product.name} description={product.description} image={product.images[0]} />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={`/shop?category=${product.category}`}>{product.category}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <div className="product-detail">
        <div className="product-gallery">
          <div className="gallery-main">
            <img
              src={product.images[selected]}
              alt={`${product.name}, view ${selected + 1}`}
              fetchPriority="high"
            />
          </div>
          {product.images.length > 1 && (
            <div className="gallery-thumbs">
              {product.images.map((src, i) => (
                <button
                  key={src}
                  className={i === selected ? 'selected' : ''}
                  onClick={() => setSelected(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={i === selected}
                >
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-info">
          <span className="eyebrow">A LITTLE MORE {product.category.toUpperCase()}</span>
          <h1>{product.name}</h1>
          {product.reviewCount > 0 && (
            <a href="#reviews" className="rating">
              <Star size={13} fill="currentColor" />
              {product.rating.toFixed(1)} · {product.reviewCount} reviews
            </a>
          )}
          <div className="detail-price">
            {money(product.price, config?.currency)}
            {product.compareAtPrice > product.price && (
              <s>{money(product.compareAtPrice, config?.currency)}</s>
            )}
          </div>
          <p className="tax-note">Inclusive of all taxes</p>
          <p className="product-description">{product.description}</p>
          <fieldset className="variant-select">
            <legend>
              Finish — <strong>{variant}</strong>
            </legend>
            <div>
              {product.variants.map((v) => (
                <button
                  key={v}
                  onClick={() => setVariant(v)}
                  className={v === variant ? 'selected' : ''}
                  aria-pressed={v === variant}
                >
                  {v}
                  {v === variant && <Check size={12} />}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="product-purchase">
            <Quantity value={quantity} onChange={setQuantity} max={Math.min(20, product.stock)} />
            <Button
              onClick={addToCart}
              disabled={!product.stock || update.isPending || Boolean(session && !cart.data)}
            >
              <ShoppingBag size={17} />
              {!product.stock
                ? 'Currently sold out'
                : update.isPending
                  ? 'Adding to your bag…'
                  : 'Add to bag'}
              <ArrowRight size={17} />
            </Button>
          </div>
          {cart.error && (
            <p className="field-error">
              Unable to load your bag.{' '}
              <button onClick={() => void cart.refetch()}>Try again</button>
            </p>
          )}
          <p className="stock-note">
            {product.stock > 0
              ? `${product.stock < 10 ? `Just ${product.stock} left. ` : ''}Ready to find a home.`
              : 'Good things take time. Check back soon.'}
          </p>
          <div className="delivery-note">
            <Truck size={20} strokeWidth={1.4} />
            <div>
              <strong>A little care, all the way to your door.</strong>
              <p>
                {config
                  ? `Free delivery over ${money(config.freeShippingThreshold, config.currency)}. `
                  : ''}
                Cash on delivery available.
              </p>
              <Link to="/help">Delivery details</Link>
            </div>
          </div>
          <details open>
            <summary>The details</summary>
            <dl>
              <dt>Material</dt>
              <dd>{product.material}</dd>
              <dt>Dimensions</dt>
              <dd>{product.dimensions}</dd>
              <dt>Care</dt>
              <dd>Wipe gently with a soft, dry cloth. Keep away from prolonged direct sunlight.</dd>
            </dl>
          </details>
        </div>
      </div>
      <Reviews product={product} />
      <section className="section">
        <div className="section-heading">
          <h2>Good company.</h2>
          <Link className="text-link" to={`/shop?category=${product.category}`}>
            Explore the collection
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="product-grid">
          {related.data?.items
            .filter((p) => p._id !== product._id)
            .slice(0, 4)
            .map((p) => (
              <ProductCard product={p} key={p._id} />
            ))}
        </div>
      </section>
    </>
  );
}
export default function ProductPage() {
  const { slug } = useParams();
  const query = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api<Product>(`/products/${slug}`),
  });
  return (
    <div className="container section product-page">
      {query.isPending ? (
        <Skeleton cards={2} />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <ProductContent key={query.data._id} product={query.data} />
      )}
    </div>
  );
}
