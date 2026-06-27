export const DEFAULT_CURRENCY = 'RWF';

export function formatCurrency(amount: number, currency = DEFAULT_CURRENCY): string {
  try {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/** Compact label for dashboards, e.g. RWF 15M or RWF 850k */
export function formatCurrencyCompact(amount: number, currency = DEFAULT_CURRENCY): string {
  if (amount >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (amount >= 1_000) {
    return `${currency} ${Math.round(amount / 1_000)}k`;
  }
  return formatCurrency(amount, currency);
}

/** Chart axis values in millions of RWF */
export function formatCurrencyMillions(amount: number, currency = DEFAULT_CURRENCY): string {
  return `${currency} ${amount}M`;
}
