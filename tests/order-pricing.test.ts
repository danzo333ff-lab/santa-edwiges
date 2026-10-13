import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateOrderTotal,
  calculateUnitPrice,
} from "../lib/order-pricing.ts";

test("volume price activates at the threshold, not below it", () => {
  assert.equal(calculateUnitPrice(31.99, 6, 7, 29.99), 31.99);
  assert.equal(calculateUnitPrice(31.99, 7, 7, 29.99), 29.99);
  assert.equal(calculateUnitPrice(31.99, 10, 7, 29.99), 29.99);
});

test("cash discount is rounded to cents and deducted from subtotal", () => {
  assert.deepEqual(
    calculateOrderTotal(223.93, 12.5, "dinheiro", 1, 3),
    { adjustment: 2.24, adjustmentType: "discount", total: 234.19 },
  );
});

test("card fee is rounded to cents and added to delivery and subtotal", () => {
  assert.deepEqual(
    calculateOrderTotal(100, 12.5, "cartao", 1, 3),
    { adjustment: 3, adjustmentType: "fee", total: 115.5 },
  );
});

test("PIX, agreed payment and term payment do not add a payment adjustment", () => {
  for (const method of ["pix", "combinar", "prazo"] as const) {
    assert.deepEqual(
      calculateOrderTotal(100, 12.5, method, 1, 3),
      { adjustment: 0, adjustmentType: "none", total: 112.5 },
    );
  }
});
