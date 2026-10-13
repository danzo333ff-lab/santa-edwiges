"use client";

export default function PrintReceiptButton() {
  return (
    <button className="admin-primary admin-print-button" type="button" onClick={() => window.print()}>
      Imprimir / salvar em PDF
    </button>
  );
}
