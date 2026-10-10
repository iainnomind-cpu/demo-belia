import { Link } from 'react-router-dom';
import { useBusinessInfo, whatsappUrl } from '../../hooks/useSiteContent';
import { useCategories } from '../../hooks/useCategories';

export function Footer() {
  const info = useBusinessInfo();
  const { categoryTree } = useCategories();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-belia-charcoal text-white/80 mt-0">
      <div className="container-belia py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <img src="/logo.png" alt={info.nombre_comercial} className="h-12 w-auto mb-4" />
          <p className="text-white/60 text-xs leading-relaxed mb-4">
            Productos de belleza profesional 100% originales, para el hogar y para profesionales.
          </p>
          <div className="flex gap-3">
            {info.whatsapp && (
              <a href={whatsappUrl(info.whatsapp, 'Hola, tengo una pregunta')} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 hover:bg-belia-red flex items-center justify-center transition-colors" aria-label="WhatsApp">
                <span className="material-symbols-outlined text-[18px]">chat</span>
              </a>
            )}
            {info.instagram && (
              <a href={info.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 hover:bg-belia-red flex items-center justify-center transition-colors text-[11px] font-bold" aria-label="Instagram">IG</a>
            )}
            {info.facebook && (
              <a href={info.facebook} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 hover:bg-belia-red flex items-center justify-center transition-colors text-[11px] font-bold" aria-label="Facebook">FB</a>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-white font-bold mb-3">Tienda</h3>
          <ul className="space-y-2">
            <li><Link to="/categoria/todos" className="hover:text-white">Todos los productos</Link></li>
            {categoryTree.slice(0, 5).map(c => (
              <li key={c.id}><Link to={`/categoria/${c.slug}`} className="hover:text-white">{c.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-bold mb-3">Ayuda</h3>
          <ul className="space-y-2">
            <li><Link to="/mis-pedidos" className="hover:text-white">Mis pedidos</Link></li>
            <li><Link to="/envios-y-devoluciones" className="hover:text-white">Envíos y devoluciones</Link></li>
            <li><Link to="/contacto" className="hover:text-white">Contacto</Link></li>
            <li><Link to="/proveedores" className="hover:text-white">¿Eres profesional?</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-bold mb-3">Legal</h3>
          <ul className="space-y-2">
            <li><Link to="/terminos-y-condiciones" className="hover:text-white">Términos y condiciones</Link></li>
            <li><Link to="/aviso-de-privacidad" className="hover:text-white">Aviso de privacidad</Link></li>
          </ul>
          {(info.email || info.horario) && (
            <div className="mt-5 text-xs text-white/60 space-y-1">
              {info.email && <p><a href={`mailto:${info.email}`} className="hover:text-white">{info.email}</a></p>}
              {info.horario && <p>{info.horario}</p>}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-belia py-4 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-white/50">
          <p>© {year} {info.razon_social || info.nombre_comercial}. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Pagos seguros con Stripe
          </p>
        </div>
      </div>
    </footer>
  );
}
