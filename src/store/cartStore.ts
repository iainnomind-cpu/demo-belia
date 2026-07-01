import { create } from 'zustand';
import type { Product } from '../data/products';

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  checkoutSuccess: boolean;
  setCheckoutSuccess: (status: boolean) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  isCartOpen: false,
  checkoutSuccess: false,
  
  addToCart: (product) => set((state) => {
    const existingItem = state.items.find(item => item.id === product.id);
    if (existingItem) {
      return {
        items: state.items.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ),
        isCartOpen: true,
        checkoutSuccess: false
      };
    }
    return { 
      items: [...state.items, { ...product, quantity: 1 }],
      isCartOpen: true,
      checkoutSuccess: false
    };
  }),

  removeFromCart: (productId) => set((state) => ({
    items: state.items.filter(item => item.id !== productId)
  })),

  updateQuantity: (productId, delta) => set((state) => ({
    items: state.items.map(item => {
      if (item.id === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    })
  })),

  clearCart: () => set({ items: [] }),
  
  setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
  setCheckoutSuccess: (status) => set({ checkoutSuccess: status })
}));
