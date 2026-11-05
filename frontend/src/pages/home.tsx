import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Truck, Leaf, PackageCheck, HeartHandshake } from 'lucide-react';
import { env } from '../lib/env';
import { PageMeta, Skeleton, ErrorState } from '../components/common';
import { useProducts, useCategories, useConfig } from '../lib/queries';
import { ProductCard } from '../components/product-card';
import { money } from '../lib/utils';
export default function HomePage() {
  const products = useProducts('featured=true&limit=4');
  const arrivals = useProducts('sort=newest&limit=4');
  const categories = useCategories();
  const { data: config } = useConfig();
  return (
    <>
      <PageMeta title="Good design. Everyday living." />
      <div className="container">
        <section className="hero">
          <img
            src={env?.VITE_HERO_IMAGE_URL}
            alt="A thoughtfully furnished living room in warm, natural tones"
            fetchPriority="high"
          />
          <div className="hero-content">
            <span className="eyebrow">THOUGHTFULLY CHOSEN. BEAUTIFULLY EVERYDAY.</span>
            <h1>
              Good design.
              <br />
              <em>Everyday living.</em>
            </h1>
            <p>
              Considered pieces for your home, your rituals,
              <br className="desktop-only" /> and everything in between.
            </p>
            <Link className="button hero-button" to="/shop">
              Find your everyday <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="hero-caption">
            THE ART OF FEELING AT HOME <span>THE EVERYDAY EDIT</span>
          </div>
        </section>
        <div className="benefit-strip">
          <span>
            <Truck />
            {config
              ? `Free delivery over ${money(config.freeShippingThreshold, config.currency)}`
              : 'Thoughtfully delivered'}
          </span>
          <span>
            <Leaf />
            Made for a slower kind of living
          </span>
          <span>
            <PackageCheck />
            Considered from start to finish
          </span>
          <span>
            <HeartHandshake />
            Small details. A big difference.
          </span>
        </div>
        <section className="section category-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A PLACE FOR EVERYTHING</span>
              <h2>Find your kind of everyday.</h2>
            </div>
            <Link to="/shop" className="text-link">
              Explore all <ArrowUpRight size={16} />
            </Link>
          </div>
          {categories.isPending ? (
            <Skeleton cards={4} />
          ) : categories.error ? (
            <ErrorState error={categories.error} retry={() => void categories.refetch()} />
          ) : (
            <div className="category-grid">
              {categories.data?.map((category) => (
                <Link
                  to={`/shop?category=${category.slug}`}
                  key={category._id}
                  className="category-card"
                >
                  <div>
                    <img
                      src={category.image}
                      alt={category.name}
                      loading="lazy"
                      sizes="(max-width: 767px) 45vw, 23vw"
                    />
                  </div>
                  <h3>
                    {category.name}
                    <ArrowUpRight size={18} strokeWidth={1.5} />
                  </h3>
                  <p>{category.description}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="section favorites-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE ONES YOU’LL REACH FOR</span>
              <h2>Everyday favorites.</h2>
            </div>
            <Link to="/shop?featured=true" className="text-link">
              Shop the favorites <ArrowUpRight size={16} />
            </Link>
          </div>
          {products.isPending ? (
            <Skeleton />
          ) : products.error ? (
            <ErrorState error={products.error} retry={() => void products.refetch()} />
          ) : (
            <div className="product-grid">
              {products.data?.items.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </section>
        <section className="editorial-banner">
          <div className="editorial-photo">
            {categories.data?.[0] && (
              <img
                src={categories.data[0].image}
                alt="Natural textures and considered details for your home"
                loading="lazy"
              />
            )}
          </div>
          <div className="editorial-copy">
            <span className="eyebrow">THE GOOD FINDS</span>
            <h2>
              A little less.
              <br />
              <em>Just as lovely.</em>
            </h2>
            <p>
              Pieces to make your days feel a little better.
              <br />
              Now at prices that do, too.
            </p>
            <Link to="/shop?deal=true" className="text-link">
              Discover the good finds <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FRESH PERSPECTIVES</span>
              <h2>New to the neighborhood.</h2>
            </div>
            <Link to="/shop?sort=newest" className="text-link">
              Meet the new arrivals <ArrowUpRight size={16} />
            </Link>
          </div>
          {arrivals.isPending ? (
            <Skeleton />
          ) : arrivals.error ? (
            <ErrorState error={arrivals.error} retry={() => void arrivals.refetch()} />
          ) : (
            <div className="product-grid">
              {arrivals.data?.items.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </section>
        <section className="brand-note">
          <span className="eyebrow">OUR WAY OF SEEING THINGS</span>
          <h2>
            Not more things.
            <br />
            <em>More meaning in the everyday.</em>
          </h2>
          <p>
            We believe a good home is made slowly. With pieces you love,
            <br className="desktop-only" /> materials that feel good, and room to be yourself.
          </p>
          <span className="wordmark">
            forma<span>®</span>
          </span>
        </section>
      </div>
    </>
  );
}
