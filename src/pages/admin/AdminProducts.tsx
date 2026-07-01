import { useState } from 'react';
import { useProductStore } from '../../store/productStore';

export function AdminProducts() {
  const { products, addProduct, removeProduct } = useProductStore();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addProduct({
      name: formData.get('name') as string,
      brand: formData.get('brand') as string,
      price: parseFloat(formData.get('price') as string),
      image: formData.get('image') as string,
      badge: formData.get('badge') as string || undefined,
    });
    setIsAdding(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Catálogo de Productos</h1>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-belia-red text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-belia-red-deep transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">{isAdding ? 'close' : 'add'}</span>
          {isAdding ? 'Cancelar' : 'Añadir Producto'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-divider shadow-sm mb-6">
          <h2 className="font-bold mb-4">Nuevo Producto</h2>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Nombre del producto</label>
              <input name="name" required type="text" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:border-belia-red outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Marca</label>
              <input name="brand" required type="text" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:border-belia-red outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Precio ($)</label>
              <input name="price" required type="number" step="0.01" min="0" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:border-belia-red outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">URL de Imagen</label>
              <input name="image" required type="url" placeholder="https://..." className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:border-belia-red outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Etiqueta (Opcional, ej. Envío Gratis)</label>
              <input name="badge" type="text" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:border-belia-red outline-none" />
            </div>
            <div className="md:col-span-2 flex justify-end mt-2">
              <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors">Guardar Producto</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(prod => (
          <div key={prod.id} className="bg-white rounded-xl border border-divider p-4 flex flex-col">
            <img src={prod.image} alt={prod.name} className="w-full aspect-square object-cover rounded-lg bg-gray-50 mb-3" />
            <span className="text-[10px] uppercase font-bold text-text-meta">{prod.brand}</span>
            <h3 className="font-medium text-sm line-clamp-2 mt-1 flex-1">{prod.name}</h3>
            <div className="flex justify-between items-end mt-3">
              <span className="font-bold text-belia-red">${prod.price.toFixed(2)}</span>
              <button 
                onClick={() => removeProduct(prod.id)}
                className="text-text-meta hover:text-belia-red transition-colors"
                title="Eliminar producto"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
