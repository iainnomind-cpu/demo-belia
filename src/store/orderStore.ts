import { create } from 'zustand';
import type { CartItem } from './cartStore';

export interface Order {
  id: string;
  date: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shipping: {
    address: string;
    colony: string;
    zip: string;
    city: string;
  };
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  status: 'Procesando' | 'Enviado' | 'Entregado';
}

interface OrderState {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'date' | 'status'>) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  addOrder: (order) => set((state) => ({
    orders: [{
      ...order,
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      status: 'Procesando'
    }, ...state.orders]
  })),
  updateOrderStatus: (id, status) => set((state) => ({
    orders: state.orders.map(o => o.id === id ? { ...o, status } : o)
  }))
}));
