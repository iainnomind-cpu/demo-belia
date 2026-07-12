import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function SupplierFormPage() {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    rfc: '',
    category_interest: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('suppliers')
        .insert({
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          email: formData.email,
          phone: formData.phone,
          rfc: formData.rfc,
          category_interest: formData.category_interest,
          status: 'pendiente'
        });

      if (insertError) throw insertError;
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar la solicitud. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] bg-surface-bright flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-divider text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success-container mb-6">
            <span className="material-symbols-outlined text-3xl text-success-green">check_circle</span>
          </div>
          <h2 className="text-3xl font-headline-lg font-bold text-text-primary mb-4">¡Solicitud Enviada!</h2>
          <p className="text-text-secondary mb-8 leading-relaxed">
            Hemos recibido tu información. Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo a través del correo <strong>{formData.email}</strong> en los próximos 2 días hábiles para habilitar tu cuenta con precios preferenciales.
          </p>
          <a href="/" className="inline-block bg-belia-red text-white font-bold py-3 px-8 rounded-lg hover:bg-belia-red-deep transition-colors">
            Volver a inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-bright py-16 px-margin">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-headline-lg text-4xl font-bold text-text-primary mb-4">
            Únete a la Red de Profesionales Belia
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Accede a precios preferenciales para mayoristas, atención personalizada y contenido exclusivo para potenciar tu salón de belleza.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-divider overflow-hidden">
          <div className="bg-surface-container p-6 border-b border-divider flex items-start gap-4">
            <span className="material-symbols-outlined text-belia-red text-3xl">info</span>
            <div>
              <h3 className="font-bold text-text-primary">Información Importante</h3>
              <p className="text-sm text-text-secondary mt-1">
                Todas las solicitudes están sujetas a validación por parte de nuestro equipo. Al enviar esta solicitud, aceptas que revisemos la información comercial proporcionada.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="bg-error/10 border border-error text-error p-4 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-1">Nombre del Salón o Empresa *</label>
                <input 
                  type="text" required
                  value={formData.company_name}
                  onChange={e => setFormData({...formData, company_name: e.target.value})}
                  className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Nombre del Contacto *</label>
                <input 
                  type="text" required
                  value={formData.contact_name}
                  onChange={e => setFormData({...formData, contact_name: e.target.value})}
                  className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">RFC (Opcional)</label>
                <input 
                  type="text" 
                  value={formData.rfc}
                  onChange={e => setFormData({...formData, rfc: e.target.value})}
                  className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red uppercase"
                  placeholder="ABCD123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Correo Electrónico *</label>
                <input 
                  type="email" required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Teléfono (WhatsApp) *</label>
                <input 
                  type="tel" required
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-1">¿Qué categorías de productos te interesan principalmente?</label>
                <textarea 
                  rows={3}
                  value={formData.category_interest}
                  onChange={e => setFormData({...formData, category_interest: e.target.value})}
                  className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                  placeholder="Ej. Mobiliario, Cuidado del Cabello, Herramientas..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-belia-red text-white font-bold py-3 px-8 rounded-lg hover:bg-belia-red-deep transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-t-2 border-white rounded-full"></div>
                    Enviando...
                  </>
                ) : (
                  'Enviar Solicitud'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
