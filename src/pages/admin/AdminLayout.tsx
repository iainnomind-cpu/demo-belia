import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin', icon: 'dashboard', label: 'Dashboard', end: true },
    { path: '/admin/orders', icon: 'receipt_long', label: 'Pedidos' },
    { path: '/admin/customers', icon: 'group', label: 'Clientes' },
    { path: '/admin/products', icon: 'inventory_2', label: 'Productos' },
    { path: '/admin/categories', icon: 'category', label: 'Categorías' },
    { path: '/admin/content', icon: 'web', label: 'Contenido / Banners' },
    { path: '/admin/suppliers', icon: 'business', label: 'Solicitudes B2B' },
    { path: '/admin/sync', icon: 'sync', label: 'Sync Catálogo' },
  ];

  return (
    <div className="min-h-screen bg-surface-bright flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-divider flex flex-col flex-shrink-0 z-10 shadow-sm md:shadow-none sticky md:fixed md:h-screen top-0">
        <div className="p-6 border-b border-divider flex items-center justify-between md:justify-center">
          <Link to="/" className="font-headline-md text-2xl font-bold text-belia-red">
            Belia Admin
          </Link>
          <div className="md:hidden">
            <span className="material-symbols-outlined text-text-meta text-sm">Ver Menú </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 hidden md:block">
          <ul className="space-y-1 px-4">
            {menuItems.map(item => (
              <li key={item.path}>
                <NavLink 
                  to={item.path} 
                  end={item.end}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-surface-container text-belia-red font-bold' 
                      : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                    }
                  `}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile quick nav (horizontal scroll) */}
        <nav className="md:hidden flex overflow-x-auto p-2 border-b border-divider gap-2">
          {menuItems.map(item => (
             <NavLink 
             key={item.path}
             to={item.path} 
             end={item.end}
             className={({ isActive }) => `
               flex items-center gap-1 px-3 py-2 rounded-lg text-sm whitespace-nowrap
               ${isActive 
                 ? 'bg-surface-container text-belia-red font-bold' 
                 : 'text-text-secondary bg-gray-50'
               }
             `}
           >
             <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
             {item.label}
           </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-divider hidden md:block">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-belia-red text-white flex items-center justify-center font-bold text-xs uppercase">
              {user?.email?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.email}</p>
              <p className="text-xs text-text-meta uppercase">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-divider rounded-lg text-sm font-medium text-text-secondary hover:text-error hover:border-error transition-colors bg-white"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
