import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Home,
  Search,
  ShoppingBag,
  UserRound,
  Moon,
  Sun,
  Grid2X2,
} from 'lucide-react';
import { useCart } from '../lib/cart';
export function Layout() {
  const cart = useCart();
  const count = cart.data?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    localStorage.setItem('forma-theme', next ? 'dark' : 'light');
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        Good things, thoughtfully chosen.{' '}
        <Link to="/shop">
          Find your everyday favorites <ArrowUpRight size={12} />
        </Link>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="wordmark" aria-label="Forma home">
            forma<span>®</span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <NavLink to="/shop">Shop all</NavLink>
            <NavLink to="/shop?sort=newest">New arrivals</NavLink>
            <NavLink to="/shop?category=living">Living</NavLink>
            <NavLink to="/shop?category=lighting">Lighting</NavLink>
            <NavLink to="/shop?deal=true" className="sale-link">
              The good finds
            </NavLink>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={dark ? 'Use light theme' : 'Use dark theme'}
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link className="icon-button account-link" to="/account" aria-label="My account">
              <UserRound size={21} />
            </Link>
            <Link className="icon-button cart-link" to="/cart" aria-label="Shopping bag">
              <ShoppingBag size={21} />
              <span className="cart-count">{count}</span>
            </Link>
          </div>
          <form
            className="header-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/shop?q=${encodeURIComponent(query)}`);
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search the collection"
              placeholder="Find something good…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="sr-only">
              Search
            </button>
          </form>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer>
        <div className="container footer-grid">
          <div>
            <Link to="/" className="wordmark">
              forma<span>®</span>
            </Link>
            <p>
              For the spaces we call home.
              <br />
              For the moments in between.
            </p>
          </div>
          <div>
            <h3>Find your forma</h3>
            <Link to="/shop">The collection</Link>
            <Link to="/shop?sort=newest">Just arrived</Link>
            <Link to="/shop?deal=true">The good finds</Link>
          </div>
          <div>
            <h3>Here for you</h3>
            <Link to="/orders">Track your order</Link>
            <Link to="/account">Your account</Link>
            <Link to="/help">Delivery & returns</Link>
          </div>
          <div className="footer-note">
            <span className="eyebrow">LESS, BUT BETTER.</span>
            <p>
              Considered design.
              <br />
              Everyday living.
            </p>
            <ArrowUpRight size={28} strokeWidth={1} />
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Forma. Made for everyday.</span>
          <span>Thoughtfully selected. Kindly delivered.</span>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end>
          <Home size={21} />
          Home
        </NavLink>
        <NavLink to="/shop">
          <Grid2X2 size={21} />
          Shop
        </NavLink>
        <NavLink to="/cart">
          <span className="mobile-bag-icon">
            <ShoppingBag size={21} />
            {count > 0 && <span className="cart-count">{count}</span>}
          </span>
          Bag
        </NavLink>
        <NavLink to="/account">
          <UserRound size={21} />
          Account
        </NavLink>
      </nav>
    </>
  );
}
