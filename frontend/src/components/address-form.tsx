import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AddressInput } from '../lib/types';
import { Button } from './ui/button';
const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d ()-]{8,20}$/, 'Enter a valid phone number'),
  line1: z.string().trim().min(5, 'Enter your street address').max(160),
  line2: z.string().max(160),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  state: z.string().trim().min(2, 'Enter your state').max(80),
  postalCode: z.string().regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
  country: z.literal('IN'),
});
export function AddressForm({
  initial,
  onSubmit,
  busy,
  label = 'Save address',
  id,
}: {
  initial?: Partial<AddressInput>;
  onSubmit: (address: AddressInput) => void | Promise<void>;
  busy?: boolean;
  label?: string;
  id?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'IN',
      ...initial,
    },
  });
  const fields = [
    { name: 'name', label: 'Full name', auto: 'name' },
    { name: 'phone', label: 'Phone number', auto: 'tel' },
    { name: 'line1', label: 'Street address', auto: 'address-line1' },
    { name: 'line2', label: 'Apartment, suite, etc. (optional)', auto: 'address-line2' },
    { name: 'city', label: 'City', auto: 'address-level2' },
    { name: 'state', label: 'State', auto: 'address-level1' },
    { name: 'postalCode', label: 'PIN code', auto: 'postal-code' },
  ] as const;
  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} className="address-form" noValidate>
      <div className="form-grid">
        {fields.map((field) => (
          <label key={field.name} className={field.name.startsWith('line') ? 'full-width' : ''}>
            {field.label}
            <input
              autoComplete={field.auto}
              type={field.name === 'phone' ? 'tel' : 'text'}
              inputMode={field.name === 'postalCode' ? 'numeric' : undefined}
              {...register(field.name)}
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={
                errors[field.name] ? `${id ?? 'address'}-${field.name}-error` : undefined
              }
            />
            {errors[field.name] && (
              <small id={`${id ?? 'address'}-${field.name}-error`} className="field-error">
                {errors[field.name]?.message}
              </small>
            )}
          </label>
        ))}
        <label>
          Country
          <select {...register('country')}>
            <option value="IN">India</option>
          </select>
        </label>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? 'One moment…' : label}
      </Button>
    </form>
  );
}
