import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useProducts, useCategories } from '../lib/queries';
import { PageMeta, Skeleton, ErrorState, EmptyState } from '../components/common';
import { ProductCard } from '../components/product-card';
import { Sheet } from '../components/ui/sheet';
import { Button } from '../components/ui/button';
export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const categories = useCategories();
  const products = useProducts(params.toString());
  function setFilter(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('page');
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }
  const active = categories.data?.find((c) => c.slug === params.get('category'));
  const title = params.get('q')
    ? `Results for “${params.get('q')}”`
    : params.get('deal') === 'true'
      ? 'The good finds.'
      : params.get('featured') === 'true'
        ? 'Everyday favorites.'
        : active
          ? `${active.name}, thoughtfully chosen.`
          : 'Good things live here.';
  const filters = (group: string) => (
    <div className="filter-content">
      <fieldset>
        <legend>Find your space</legend>
        <label>
          <input
            type="radio"
            name={`category-${group}`}
            checked={!params.get('category')}
            onChange={() => setFilter('category', '')}
          />
          All the good things
        </label>
        {categories.data?.map((c) => (
          <label key={c.slug}>
            <input
              type="radio"
              name={`category-${group}`}
              checked={params.get('category') === c.slug}
              onChange={() => setFilter('category', c.slug)}
            />
            {c.name}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Your budget</legend>
        <label>
          Price range
          <select
            aria-label="Price range"
            value={params.get('maxPrice') || ''}
            onChange={(e) => setFilter('maxPrice', e.target.value)}
          >
            <option value="">Any price</option>
            <option value="200000">Under ₹2,000</option>
            <option value="500000">Under ₹5,000</option>
            <option value="1000000">Under ₹10,000</option>
            <option value="2500000">Under ₹25,000</option>
          </select>
        </label>
      </fieldset>
      <fieldset>
        <legend>A little more specific</legend>
        <label>
          <input
            type="checkbox"
            checked={params.get('inStock') === 'true'}
            onChange={(e) => setFilter('inStock', e.target.checked ? 'true' : '')}
          />
          Ready to come home
        </label>
        <label>
          <input
            type="checkbox"
            checked={params.get('deal') === 'true'}
            onChange={(e) => setFilter('deal', e.target.checked ? 'true' : '')}
          />
          The good finds
        </label>
      </fieldset>
      <Button variant="ghost" onClick={() => setParams({})}>
        Clear filters
        <X size={15} />
      </Button>
    </div>
  );
  return (
    <div className="container section">
      <PageMeta title={title} />
      <div className="shop-intro">
        <span className="eyebrow">THE FORMA COLLECTION</span>
        <h1>{title}</h1>
        <p className="muted">For your favorite spaces, and the everyday moments in between.</p>
      </div>
      <div className="shop-toolbar">
        <p>
          {products.data ? `${products.data.total} considered pieces` : 'Finding your favorites…'}
        </p>
        <div className="mobile-filters">
          <Sheet
            title="Make it your own"
            trigger={
              <Button variant="outline">
                <SlidersHorizontal size={16} />
                Filters
              </Button>
            }
          >
            {filters('mobile')}
          </Sheet>
        </div>
        <label className="sort-control">
          Sort by
          <select
            value={params.get('sort') || 'featured'}
            onChange={(e) => setFilter('sort', e.target.value)}
            aria-label="Sort products"
          >
            <option value="featured">Our favorites</option>
            <option value="newest">Newest arrivals</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rating">Top rated</option>
          </select>
        </label>
      </div>
      <div className="shop-layout">
        <aside className="shop-filters" aria-label="Product filters">
          {filters('desktop')}
        </aside>
        <div>
          {params.get('q') && (
            <button className="filter-chip" onClick={() => setFilter('q', '')}>
              {params.get('q')}
              <X size={14} />
            </button>
          )}
          {products.isPending ? (
            <Skeleton cards={6} />
          ) : products.error ? (
            <ErrorState error={products.error} retry={() => void products.refetch()} />
          ) : products.data.items.length ? (
            <>
              <div className="product-grid">
                {products.data.items.map((p) => (
                  <ProductCard product={p} key={p._id} />
                ))}
              </div>
              {products.data.pages > 1 && (
                <nav className="pagination" aria-label="Product pages">
                  <Button
                    variant="outline"
                    disabled={products.data.page === 1}
                    onClick={() =>
                      setParams((p) => {
                        const n = new URLSearchParams(p);
                        n.set('page', String(products.data.page - 1));
                        return n;
                      })
                    }
                  >
                    <ArrowLeft size={16} />
                    Previous
                  </Button>
                  <span>
                    {products.data.page} / {products.data.pages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={products.data.page >= products.data.pages}
                    onClick={() =>
                      setParams((p) => {
                        const n = new URLSearchParams(p);
                        n.set('page', String(products.data.page + 1));
                        return n;
                      })
                    }
                  >
                    Next
                    <ArrowRight size={16} />
                  </Button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              title="A little too particular?"
              description="Try a different search or clear a filter. Your next favorite is out there."
            />
          )}
        </div>
      </div>
    </div>
  );
}
