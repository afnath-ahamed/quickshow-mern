export function formatCurrency(amount: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

export function currencyFractionDigits(currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
}

export function formatMinorCurrency(amount: number, currency: string) {
  return formatCurrency(amount / 10 ** currencyFractionDigits(currency), currency, 'en-LK')
}
