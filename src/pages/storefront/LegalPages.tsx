import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useBusinessInfo, useShippingSettings, whatsappUrl } from '../../hooks/useSiteContent';

const formatPesos = (amount: number) => `$${amount.toLocaleString('es-MX')} MXN`;
const LAST_UPDATE = 'octubre de 2026';

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-belia-cream min-h-screen py-10 md:py-16">
      <div className="container-belia max-w-3xl">
        <nav className="text-xs text-text-meta mb-4">
          <Link to="/" className="hover:text-belia-red">Inicio</Link> <span className="mx-1">›</span> {title}
        </nav>
        <article className="bg-white rounded-3xl border border-divider p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-belia-charcoal mb-2">{title}</h1>
          <p className="text-xs text-text-meta mb-8">Última actualización: {LAST_UPDATE}</p>
          <div className="legal-content space-y-4 text-sm leading-relaxed text-text-secondary [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-belia-charcoal [&_h2]:pt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-belia-charcoal">
            {children}
          </div>
        </article>
      </div>
    </div>
  );
}

/** Legal name, falling back to the commercial name */
function useOwner() {
  const info = useBusinessInfo();
  return { info, owner: info.razon_social || info.nombre_comercial };
}

function ContactLine() {
  const { info } = useOwner();
  return (
    <>
      {info.email && <>al correo <a href={`mailto:${info.email}`} className="text-belia-red font-semibold">{info.email}</a></>}
      {info.email && info.whatsapp && ' o '}
      {info.whatsapp && <>por <a href={whatsappUrl(info.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-belia-red font-semibold">WhatsApp</a></>}
      {!info.email && !info.whatsapp && <Link to="/contacto" className="text-belia-red font-semibold">a través de nuestra página de contacto</Link>}
    </>
  );
}

export function TermsPage() {
  const { info, owner } = useOwner();
  return (
    <LegalLayout title="Términos y condiciones">
      <p>
        Estos términos regulan el uso del sitio y las compras realizadas en la tienda en línea de <strong>{info.nombre_comercial}</strong>,
        operada por <strong>{owner}</strong>{info.rfc && <> (RFC {info.rfc})</>}{info.domicilio && <>, con domicilio en {info.domicilio}</>}.
        Al navegar o comprar en este sitio aceptas estos términos.
      </p>

      <h2>1. Productos y precios</h2>
      <ul>
        <li>Todos los precios están expresados en pesos mexicanos (MXN) e incluyen IVA.</li>
        <li>Las imágenes son ilustrativas; el empaque puede variar según el lote del fabricante.</li>
        <li>Los precios, promociones y disponibilidad pueden cambiar sin previo aviso. El precio válido es el que se muestra al momento de pagar.</li>
        <li>Los precios preferenciales para profesionales (B2B) solo están disponibles para cuentas de proveedor aprobadas.</li>
      </ul>

      <h2>2. Compras y pagos</h2>
      <ul>
        <li>Para comprar es necesario crear una cuenta con datos verídicos.</li>
        <li>Los pagos se procesan de forma segura a través de Stripe. {info.nombre_comercial} no almacena los datos de tu tarjeta.</li>
        <li>El pedido se confirma cuando el pago es aprobado; recibirás un número de pedido y un correo de confirmación.</li>
        <li>Nos reservamos el derecho de cancelar pedidos con errores evidentes de precio, sin existencia o con indicios de fraude; en ese caso se reembolsará el importe completo.</li>
      </ul>

      <h2>3. Envíos</h2>
      <p>
        Las condiciones de envío se describen en nuestra <Link to="/envios-y-devoluciones" className="text-belia-red font-semibold">política de envíos y devoluciones</Link>.
      </p>

      <h2>4. Devoluciones y garantías</h2>
      <p>
        Puedes solicitar cambios o devoluciones conforme a nuestra <Link to="/envios-y-devoluciones" className="text-belia-red font-semibold">política de envíos y devoluciones</Link>,
        sin perjuicio de los derechos que te otorga la Ley Federal de Protección al Consumidor.
      </p>

      <h2>5. Uso de los productos</h2>
      <p>
        Muchos de nuestros productos son de uso profesional. Sigue siempre las instrucciones del fabricante y realiza una prueba de sensibilidad
        cuando el producto lo indique. {info.nombre_comercial} no se hace responsable por el uso indebido de los productos.
      </p>

      <h2>6. Datos personales</h2>
      <p>
        El tratamiento de tus datos se rige por nuestro <Link to="/aviso-de-privacidad" className="text-belia-red font-semibold">aviso de privacidad</Link>.
      </p>

      <h2>7. Propiedad intelectual</h2>
      <p>
        Las marcas, logotipos e imágenes de los productos pertenecen a sus respectivos titulares. El contenido de este sitio no puede reproducirse sin autorización.
      </p>

      <h2>8. Cambios a estos términos</h2>
      <p>Podemos actualizar estos términos en cualquier momento; la versión vigente es la publicada en esta página.</p>

      <h2>9. Contacto y jurisdicción</h2>
      <p>
        Para cualquier duda o aclaración escríbenos <ContactLine />. Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.
        Como consumidor, también puedes acudir a la Procuraduría Federal del Consumidor (PROFECO).
      </p>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  const { info, owner } = useOwner();
  return (
    <LegalLayout title="Aviso de privacidad">
      <p>
        <strong>{owner}</strong>{info.domicilio && <>, con domicilio en {info.domicilio},</>} (en adelante, “{info.nombre_comercial}”) es responsable
        del tratamiento de tus datos personales, conforme a la legislación mexicana en materia de protección de datos personales en posesión de los particulares.
      </p>

      <h2>Datos que recabamos</h2>
      <ul>
        <li>Identificación y contacto: nombre, correo electrónico y teléfono.</li>
        <li>Envío: domicilio de entrega.</li>
        <li>Para cuentas de profesionales (B2B): nombre de la empresa o salón, RFC y giro.</li>
        <li>Historial de compras dentro del sitio.</li>
      </ul>
      <p>
        <strong>No almacenamos datos de tarjetas.</strong> Los pagos los procesa Stripe, que cuenta con sus propias medidas de seguridad certificadas.
        No recabamos datos personales sensibles.
      </p>

      <h2>Finalidades</h2>
      <p>Finalidades necesarias para la relación contigo:</p>
      <ul>
        <li>Crear y administrar tu cuenta.</li>
        <li>Procesar, enviar y dar seguimiento a tus pedidos, y emitir comprobantes cuando los solicites.</li>
        <li>Atender dudas, aclaraciones, cambios y devoluciones.</li>
        <li>Evaluar y administrar solicitudes de cuentas de profesionales.</li>
      </ul>
      <p>Finalidades adicionales (puedes oponerte en cualquier momento):</p>
      <ul>
        <li>Enviarte promociones, novedades y encuestas de satisfacción.</li>
      </ul>

      <h2>Transferencias</h2>
      <p>
        Compartimos los datos estrictamente necesarios con proveedores que nos ayudan a operar la tienda: procesamiento de pagos (Stripe),
        hospedaje y base de datos, envío de correos y empresas de paquetería para entregar tus pedidos. No vendemos tus datos a terceros.
      </p>

      <h2>Derechos ARCO</h2>
      <p>
        Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos (derechos ARCO), así como revocar tu consentimiento,
        enviando tu solicitud <ContactLine />. Incluye tu nombre, el correo de tu cuenta y la descripción de lo que solicitas.
        Te responderemos en un plazo máximo de 20 días hábiles.
      </p>

      <h2>Cookies y almacenamiento local</h2>
      <p>
        Usamos el almacenamiento de tu navegador para mantener tu sesión iniciada y guardar tu carrito. No usamos cookies publicitarias de terceros.
      </p>

      <h2>Cambios al aviso</h2>
      <p>Cualquier cambio a este aviso de privacidad se publicará en esta misma página.</p>
    </LegalLayout>
  );
}

export function ShippingReturnsPage() {
  const { info } = useOwner();
  const shipping = useShippingSettings();
  return (
    <LegalLayout title="Envíos y devoluciones">
      <h2>Envíos</h2>
      <ul>
        <li>Enviamos a toda la República Mexicana.</li>
        {shipping.cost === 0 || shipping.freeFrom === 0
          ? <li><strong>Envío gratis</strong> en todas las compras.</li>
          : <li><strong>Costo de envío: {formatPesos(shipping.cost)}.</strong> <strong>Envío gratis</strong> en compras desde {formatPesos(shipping.freeFrom)}.</li>}
        <li>Tiempo estimado de entrega: <strong>{info.tiempo_entrega}</strong> a partir de la confirmación del pago. Zonas extendidas pueden tardar más.</li>
        <li>Cuando tu pedido sea enviado te avisaremos por correo, con la paquetería y el número de guía cuando aplique.</li>
        <li>Revisa tu paquete al recibirlo. Si llega dañado o abierto, anótalo con el repartidor y contáctanos dentro de las 48 horas siguientes, con fotos del empaque.</li>
      </ul>

      <h2>Cambios y devoluciones</h2>
      <ul>
        <li>Puedes solicitar un cambio o devolución dentro de los <strong>{info.dias_devolucion} días naturales</strong> posteriores a recibir tu pedido.</li>
        <li>Por higiene y seguridad, solo aceptamos productos <strong>cerrados, sin usar, con sellos intactos</strong> y en su empaque original.</li>
        <li>No aplican devoluciones en productos abiertos o usados, salvo defecto de fábrica.</li>
        <li>Si el producto llegó equivocado, dañado o con defecto de fábrica, nosotros cubrimos el envío del cambio.</li>
        <li>En otros casos, el costo del envío de regreso corre por cuenta del cliente.</li>
      </ul>

      <h2>Reembolsos</h2>
      <p>
        Una vez que recibamos y revisemos el producto, el reembolso se hace al mismo método de pago en un plazo de 5 a 10 días hábiles,
        según los tiempos de tu banco. Los pagos en efectivo en OXXO no pueden devolverse por ese medio: esos reembolsos se hacen por transferencia bancaria.
        El costo de envío original no es reembolsable, salvo error de nuestra parte.
      </p>

      <h2>Cómo solicitarlo</h2>
      <p>
        Escríbenos <ContactLine /> con tu número de pedido, el producto y el motivo. Te indicaremos los pasos para el envío.
      </p>
    </LegalLayout>
  );
}

export function ContactPage() {
  const { info } = useOwner();
  const items = [
    info.whatsapp && { icon: 'chat', label: 'WhatsApp', value: `+${info.whatsapp.replace(/\D/g, '')}`, href: whatsappUrl(info.whatsapp, 'Hola, tengo una pregunta') },
    info.email && { icon: 'mail', label: 'Correo', value: info.email, href: `mailto:${info.email}` },
    info.telefono && { icon: 'call', label: 'Teléfono', value: info.telefono, href: `tel:${info.telefono.replace(/[^\d+]/g, '')}` },
    info.domicilio && { icon: 'location_on', label: 'Dirección', value: info.domicilio, href: `https://www.google.com/maps/search/${encodeURIComponent(info.domicilio)}` },
  ].filter(Boolean) as { icon: string; label: string; value: string; href: string }[];

  return (
    <LegalLayout title="Contacto">
      <p>¿Tienes dudas sobre un producto, tu pedido o quieres asesoría? Estamos para ayudarte.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose pt-2">
        {items.map(item => (
          <a
            key={item.label}
            href={item.href}
            target={item.href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 rounded-2xl border border-divider hover:border-belia-coral hover:bg-belia-blush transition-colors"
          >
            <span className="material-symbols-outlined text-belia-red">{item.icon}</span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-wider text-text-meta">{item.label}</span>
              <span className="block text-sm font-semibold text-belia-charcoal break-words">{item.value}</span>
            </span>
          </a>
        ))}
      </div>
      {info.horario && (
        <p className="pt-2"><strong>Horario de atención:</strong> {info.horario}</p>
      )}
      <p>
        Si tu duda es sobre un pedido, incluye tu <strong>número de pedido</strong>; lo encuentras en{' '}
        <Link to="/mis-pedidos" className="text-belia-red font-semibold">Mis pedidos</Link>.
      </p>
    </LegalLayout>
  );
}
