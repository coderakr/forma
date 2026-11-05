import { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, PackageOpen } from 'lucide-react';
import { authClient } from '../lib/api';
import { Button } from './ui/button';
export function PageMeta({
  title,
  description = 'Thoughtfully chosen furniture, lighting, and everyday objects. Make room for a life well lived.',
  image,
}: {
  title: string;
  description?: string;
  image?: string;
}) {
  useEffect(() => {
    document.title = `${title} — Forma`;
    const values: Record<string, string> = {
      description,
      'og:title': title,
      'og:description': description,
      'og:type': image ? 'product' : 'website',
      'og:url': window.location.href,
    };
    if (image) values['og:image'] = image;
    const created: HTMLMetaElement[] = [];
    for (const [name, content] of Object.entries(values)) {
      const property = name.startsWith('og:') ? 'property' : 'name';
      let el = document.querySelector<HTMLMetaElement>(`meta[${property}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(property, name);
        document.head.append(el);
        created.push(el);
      }
      el.content = content;
    }
    return () => {
      created.forEach((el) => el.remove());
    };
  }, [title, description, image]);
  return null;
}
export function Skeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading content" className="product-grid">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-image" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  to = '/shop',
  action = 'Explore the collection',
}: {
  title: string;
  description: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="empty-state">
      <PackageOpen size={40} strokeWidth={1} />
      <h2>{title}</h2>
      <p>{description}</p>
      <Button asChild>
        <Link to={to}>
          {action}
          <ArrowRight size={16} />
        </Link>
      </Button>
    </div>
  );
}
export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <h2>Let’s try that again.</h2>
      <p>{error.message}</p>
      {retry && <Button onClick={retry}>Try again</Button>}
    </div>
  );
}
export function ProtectedRoute({ admin = false }: { admin?: boolean }) {
  const { data, isPending, error, refetch } = authClient.useSession();
  const location = useLocation();
  if (isPending)
    return (
      <div className="container section">
        <Skeleton />
      </div>
    );
  if (error)
    return (
      <ErrorState
        error={new Error(error.message || 'Unable to verify your session')}
        retry={() => void refetch()}
      />
    );
  if (!data)
    return (
      <Navigate
        to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (admin && data.user.role !== 'admin')
    return (
      <EmptyState
        title="This space is for the store team"
        description="Visit your account to manage your own orders."
        to="/account"
        action="My account"
      />
    );
  return <Outlet />;
}
