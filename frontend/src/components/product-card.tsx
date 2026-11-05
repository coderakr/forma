import { Link } from 'react-router-dom';
import { ArrowUpRight, Star } from 'lucide-react';
import type { Product } from '../lib/types';
import { money } from '../lib/utils';
import { useConfig } from '../lib/queries';
export function ProductCard({ product }: { product: Product }) {
  const { data: config } = useConfig();
  return (
    <article className="product-card">
      <Link to={`/product/${product.slug}`} className="product-photo">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          sizes="(max-width: 767px) 45vw, (max-width: 1023px) 30vw, 24vw"
        />
        {product.compareAtPrice > product.price ? (
          <span className="product-tag">
            A good find · −{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
          </span>
        ) : product.featured ? (
          <span className="product-tag">Everyday favorite</span>
        ) : null}
        <span className="product-open">
          <ArrowUpRight size={19} />
        </span>
        {!product.stock && <span className="sold-out">Currently sold out</span>}
      </Link>
      <div className="product-category">{product.category.replaceAll('-', ' ')}</div>
      <Link to={`/product/${product.slug}`}>
        <h3>{product.name}</h3>
      </Link>
      <div className="row-between">
        <p className="product-price">
          {money(product.price, config?.currency)}{' '}
          {product.compareAtPrice > product.price && (
            <s>{money(product.compareAtPrice, config?.currency)}</s>
          )}
        </p>
        {product.reviewCount > 0 && (
          <span className="rating">
            <Star size={10} fill="currentColor" />
            {product.rating.toFixed(1)}
          </span>
        )}
      </div>
      <p className="product-options">
        {product.variants.length > 1
          ? `${product.variants.length} considered finishes`
          : product.material}
      </p>
    </article>
  );
}
