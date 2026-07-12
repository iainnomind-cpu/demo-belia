import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StorefrontLayout } from './components/layout/StorefrontLayout';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminRoute } from './components/auth/AdminRoute';
import { HomePage } from './pages/storefront/HomePage';
import { CategoryPage } from './pages/storefront/CategoryPage';
import { ProductDetailPage } from './pages/storefront/ProductDetailPage';
import { CheckoutPage } from './pages/storefront/CheckoutPage';
import { SupplierFormPage } from './pages/storefront/SupplierFormPage';
import { LoginPage } from './pages/storefront/LoginPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminContentPage } from './pages/admin/AdminContentPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminSuppliersPage } from './pages/admin/AdminSuppliersPage';
import { AdminSyncPage } from './pages/admin/AdminSyncPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Storefront ─────────────────────────────── */}
        <Route element={<StorefrontLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          <Route path="/producto/:id" element={<ProductDetailPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/proveedores" element={<SupplierFormPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* ── Admin Panel (role-gated) ────────────────── */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/orders" replace />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="content" element={<AdminContentPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="suppliers" element={<AdminSuppliersPage />} />
          <Route path="sync" element={<AdminSyncPage />} />
        </Route>

        {/* ── Fallback ───────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
