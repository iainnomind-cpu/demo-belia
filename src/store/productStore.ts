import { create } from 'zustand';
import { products as initialProducts } from '../data/products';
import type { Product } from '../data/products';

interface ProductState {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  removeProduct: (id: string) => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: initialProducts,
  addProduct: (product) => set((state) => ({
    products: [...state.products, { ...product, id: `p${Date.now()}` }]
  })),
  removeProduct: (id) => set((state) => ({
    products: state.products.filter(p => p.id !== id)
  }))
}));
