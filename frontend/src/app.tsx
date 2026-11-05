import { lazy, Suspense, Component, type ReactNode, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/layout';
import { ProtectedRoute, Skeleton, EmptyState } from './components/common';
const Admin = lazy(() => import('./pages/admin'));
const Help = lazy(() => import('./pages/help'));
const Checkout = lazy(() => import('./pages/checkout'));
const Orders = lazy(() => import('./pages/orders').then((m) => ({ default: m.OrdersPage })));
const OrderDetail = lazy(() => import('./pages/orders'));
const Product = lazy(() => import('./pages/product'));
const Cart = lazy(() => import('./pages/cart'));
const Shop = lazy(() => import('./pages/shop'));
const Home = lazy(() => import('./pages/home'));
const Auth = lazy(() => import('./pages/auth'));
const Account = lazy(() => import('./pages/account'));
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? (
      <div className="empty-state">
        <h1>Something went wrong.</h1>
        <p>Please reload to try again.</p>
        <button className="button button-primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="container section">
            <Skeleton />
          </div>
        }
      >
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="help" element={<Help />} />
            <Route element={<ProtectedRoute admin />}>
              <Route path="admin" element={<Admin />} />
            </Route>
            <Route path="product/:slug" element={<Product />} />
            <Route path="shop" element={<Shop />} />
            <Route path="sign-in" element={<Auth />} />
            <Route path="sign-up" element={<Auth signUp />} />
            <Route element={<ProtectedRoute />}>
              <Route path="checkout" element={<Checkout />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="orders/:id/confirmation" element={<OrderDetail confirmation />} />
              <Route path="cart" element={<Cart />} />
              <Route path="account" element={<Account />} />
            </Route>
            <Route
              path="*"
              element={
                <EmptyState
                  title="A little off the beaten path."
                  description="This page doesn’t exist. Let’s find you something good."
                  to="/"
                  action="Back home"
                />
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
