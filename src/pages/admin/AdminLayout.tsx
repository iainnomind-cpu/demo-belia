import { Outlet, Link, useLocation } from 'react-router-dom';

export function AdminLayout() {
  const location = useLocation();

  const navLinks = [
    { name: 'Pedidos', path: '/admin/orders', icon: 'receipt_long' },
    { name: 'Clientes', path: '/admin/customers', icon: 'group' },
    { name: 'Productos', path: '/admin/products', icon: 'inventory_2' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Admin */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-800">
          <Link to="/" className="text-2xl font-bold text-belia-red tracking-tight flex items-center gap-2">
            Belia <span className="text-sm font-normal text-gray-400 bg-gray-800 px-2 py-0.5 rounded">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link 
                key={link.name} 
                to={link.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-belia-red text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-lg">{link.icon}</span>
                <span className="text-sm font-medium">{link.name}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <span className="material-symbols-outlined text-lg">storefront</span>
            Ver Tienda
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-divider h-16 flex items-center px-6 justify-between flex-shrink-0">
          <div className="font-bold text-lg md:hidden">Belia Admin</div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-500 text-sm">person</span>
            </div>
            <span className="text-sm font-medium">Administrador</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
