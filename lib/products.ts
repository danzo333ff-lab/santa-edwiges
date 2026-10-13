export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  minStock: number;
  stockPhysical?: number;
  stockReserved?: number;
  active: boolean;
  image: string;
  imageUrl?: string;
  unitPriceDisplay?: number;
  bulkMin?: number;
  bulkPrice?: number;
};
