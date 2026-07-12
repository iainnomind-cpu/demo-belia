import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { CartSidebar } from '../cart/CartSidebar';

/**
 * StorefrontLayout — Wraps all public storefront pages.
 * Includes the dynamic Header with mega-menu and the CartSidebar.
 */
export function StorefrontLayout() {
  return (
    <div className="min-h-screen bg-surface-bright">
      <Header />
      <main>
        <Outlet />
      </main>
      <CartSidebar />
    </div>
  );
}
