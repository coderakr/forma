import { Minus, Plus } from 'lucide-react';
export function Quantity({
  value,
  onChange,
  max = 20,
  min = 1,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <div className="quantity">
      <button
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </button>
      <output aria-label="Quantity" aria-live="polite">
        {value}
      </output>
      <button
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
