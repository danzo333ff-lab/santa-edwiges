export type PaymentMethod = "pix" | "dinheiro" | "cartao" | "combinar" | "prazo";

export function calculateUnitPrice(
  price: number,
  quantity: number,
  bulkMin?: number,
  bulkPrice?: number,
) {
  return bulkMin !== undefined &&
    bulkPrice !== undefined &&
    quantity >= bulkMin
    ? bulkPrice
    : price;
}

export function calculateOrderTotal(
  subtotal: number,
  deliveryFee: number,
  paymentMethod: PaymentMethod,
  cashDiscountPercent: number,
  cardFeePercent: number,
) {
  const rate =
    paymentMethod === "dinheiro"
      ? -cashDiscountPercent / 100
      : paymentMethod === "cartao"
        ? cardFeePercent / 100
        : 0;
  const adjustment = Math.round(subtotal * Math.abs(rate) * 100) / 100;
  return {
    adjustment,
    adjustmentType: rate < 0 ? "discount" : rate > 0 ? "fee" : "none",
    total:
      subtotal +
      deliveryFee +
      (rate < 0 ? -adjustment : adjustment),
  } as const;
}
