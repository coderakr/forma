import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, authClient } from '../lib/api';
import type { Address, AddressInput } from '../lib/types';
import { Button } from '../components/ui/button';
import { PageMeta, Skeleton, ErrorState } from '../components/common';
import { AddressForm } from '../components/address-form';
export default function AccountPage() {
  const { data } = authClient.useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const addresses = useQuery({
    queryKey: ['addresses', data?.user.id],
    queryFn: () => api<Address[]>('/addresses'),
  });
  const save = useMutation({
    mutationFn: (input: AddressInput) =>
      api(`/addresses${editing && editing !== 'new' ? `/${editing._id}` : ''}`, {
        method: editing === 'new' ? 'POST' : 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success('Address saved');
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleting(null);
      toast.success('Address removed');
      void qc.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="container section">
      <PageMeta title="My account" />
      <span className="eyebrow">YOUR LITTLE CORNER</span>
      <h1>Hello, {data?.user.name}.</h1>
      <p className="muted">{data?.user.email}</p>
      <div className="account-links">
        <Button asChild variant="outline">
          <Link to="/orders">Your orders</Link>
        </Button>
        {data?.user.role === 'admin' && (
          <Button asChild>
            <Link to="/admin">Store dashboard</Link>
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={async () => {
            const result = await authClient.signOut();
            if (result.error) {
              toast.error(result.error.message);
              return;
            }
            qc.clear();
            navigate('/');
          }}
        >
          Sign out
        </Button>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>Places you call home.</h2>
          <Button variant="outline" onClick={() => setEditing('new')}>
            <Plus size={16} />
            Add address
          </Button>
        </div>
        {editing && (
          <div className="account-address-form">
            <h3>{editing === 'new' ? 'A new place' : 'Edit your address'}</h3>
            <AddressForm
              key={editing === 'new' ? 'new' : editing._id}
              initial={editing === 'new' ? { name: data?.user.name } : editing}
              onSubmit={(input) => save.mutate(input)}
              busy={save.isPending}
            />
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        )}
        {addresses.isPending ? (
          <Skeleton cards={2} />
        ) : addresses.error ? (
          <ErrorState error={addresses.error} retry={() => void addresses.refetch()} />
        ) : addresses.data.length ? (
          <div className="address-grid">
            {addresses.data.map((a) => (
              <article className="address-card" key={a._id}>
                <h3>{a.name}</h3>
                <p>
                  {a.line1}
                  <br />
                  {a.line2 && (
                    <>
                      {a.line2}
                      <br />
                    </>
                  )}
                  {a.city}, {a.state} {a.postalCode}
                  <br />
                  India · {a.phone}
                </p>
                <Button variant="ghost" onClick={() => setEditing(a)}>
                  <Pencil size={14} />
                  Edit
                </Button>
                {deleting === a._id ? (
                  <span>
                    <Button
                      variant="destructive"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(a._id)}
                    >
                      Confirm removal
                    </Button>
                    <Button variant="ghost" onClick={() => setDeleting(null)}>
                      Keep
                    </Button>
                  </span>
                ) : (
                  <Button variant="ghost" onClick={() => setDeleting(a._id)}>
                    <Trash2 size={14} />
                    Remove
                  </Button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Save an address to make your next checkout a little easier.</p>
        )}
      </section>
    </div>
  );
}
