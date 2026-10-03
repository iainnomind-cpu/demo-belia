/**
 * A promo price only counts when it is a real discount; a promo equal to or
 * above the public price (a common spreadsheet mistake) is ignored.
 * Must match the rule used by the create-payment-intent / confirm-order Edge Functions.
 */
export function getValidPromo(pricePublico: number, pricePromo: number | null | undefined): number | null {
  return pricePromo && pricePromo > 0 && pricePromo < pricePublico ? pricePromo : null;
}

export const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);
