import { create } from 'zustand';
import type { CartItem, Product } from '../types/database';

interface CartState {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, supplierPrice?: number | null) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  checkoutSuccess: boolean;
  setCheckoutSuccess: (status: boolean) => void;
}

/**
 * useCartStore — Manages the ephemeral cart UI state (sidebar open/close, optimistic updates).
 * Per FR-008, actual persistence happens in DB (cart_items table).
 * This store handles the local representation before/during sync.
 */
export const useCartStore = create<CartState>((set) => ({
  items: [],
  isCartOpen: false,
  checkoutSuccess: false,
  
  addToCart: (product, quantity = 1, supplierPrice = null) => set((state) => {
    const existingItem = state.items.find(item => item.product_id === product.id);
    if (existingItem) {
      return {
        items: state.items.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: Math.min(item.quantity + quantity, item.stock) } 
            : item
        ),
        isCartOpen: true,
        checkoutSuccess: false
      };
    }
    
    const newItem: CartItem = {
      product_id: product.id,
      name: product.name,
      brand: product.brand,
      price_publico: product.price_publico,
      price_promo: product.price_promo,
      price_proveedor: supplierPrice, // Only populated for proveedores via RPC
      image_url: product.image_url,
      quantity: Math.min(quantity, product.stock),
      stock: product.stock,
    };

    return { 
      items: [...state.items, newItem],
      isCartOpen: true,
      checkoutSuccess: false
    };
  }),

  removeFromCart: (productId) => set((state) => ({
    items: state.items.filter(item => item.product_id !== productId)
  })),

  updateQuantity: (productId, delta) => set((state) => ({
    items: state.items.map(item => {
      if (item.product_id === productId) {
        const newQuantity = Math.max(1, Math.min(item.quantity + delta, item.stock));
        return { ...item, quantity: newQuantity };
      }
      return item;
    })
  })),

  clearCart: () => set({ items: [] }),
  setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
  setCheckoutSuccess: (status) => set({ checkoutSuccess: status })
}));
