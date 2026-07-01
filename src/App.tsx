import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StorefrontPage } from './pages/StorefrontPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCustomers } from './pages/admin/AdminCustomers';
import { AdminProducts } from './pages/admin/AdminProducts';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Storefront Route */}
        <Route path="/" element={<StorefrontPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/orders" replace />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="products" element={<AdminProducts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
