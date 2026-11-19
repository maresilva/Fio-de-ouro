import { PhysicalDenominations } from '../types';

export const DENOMINATION_VALUES: Record<keyof PhysicalDenominations, number> = {
  c200: 200,
  c100: 100,
  c50: 50,
  c20: 20,
  c10: 10,
  c5: 5,
  c2: 2,
  m1: 1,
  m050: 0.50,
  m025: 0.25,
  m010: 0.10,
  m005: 0.05,
};

export const DENOMINATION_LABELS: Record<keyof PhysicalDenominations, { label: string; isNote: boolean }> = {
  c200: { label: 'R$ 200,00', isNote: true },
  c100: { label: 'R$ 100,00', isNote: true },
  c50: { label: 'R$ 50,00', isNote: true },
  c20: { label: 'R$ 20,00', isNote: true },
  c10: { label: 'R$ 10,00', isNote: true },
  c5: { label: 'R$ 5,00', isNote: true },
  c2: { label: 'R$ 2,00', isNote: true },
  m1: { label: 'R$ 1,00', isNote: false },
  m050: { label: 'R$ 0,50', isNote: false },
  m025: { label: 'R$ 0,25', isNote: false },
  m010: { label: 'R$ 0,10', isNote: false },
  m005: { label: 'R$ 0,05', isNote: false },
};

export function formatBRL(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseBRL(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Clean string removing R$, spaces, non-digits except comma and dot
  const clean = value.replace(/[^\d,-]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function calculateDenominationTotal(denominations: PhysicalDenominations): number {
  let total = 0;
  for (const [key, count] of Object.entries(denominations)) {
    const val = DENOMINATION_VALUES[key as keyof PhysicalDenominations] || 0;
    total += val * (count || 0);
  }
  return Math.round(total * 100) / 100;
}

export function toCents(val: number | undefined | null): number {
  return Math.round((val || 0) * 100);
}

export function fromCents(cents: number | undefined | null): number {
  return (cents || 0) / 100;
}
