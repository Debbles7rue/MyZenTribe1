// components/business/tabs/BusinessServicesTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AvatarUploader from '@/components/AvatarUploader';

interface Service {
  id: string;
  title: string;
  description?: string;
  price?: string;
  duration?: string;
  image_url?: string;
}

export default function BusinessServicesTab({ businessId }: { businessId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('services')
        .eq('id', businessId)
        .single();
      
      if (biz?.services) {
        setServices(biz.services as Service[]);
      }
      setLoading(false);
    }
    load();
  }, [businessId]);

  async function save() {
    setSaving(true);
    setMessage('');
    
    const { error } = await supabase
      .from('business_profiles')
      .update({ services })
      .eq('id', businessId);
    
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Services saved!');
      setEditingId(null);
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  function addService() {
    const newService: Service = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      price: '',
      duration: '',
      image_url: '',
    };
    setServices([...services, newService]);
    setEditingId(newService.id);
  }

  function updateService(id: string, updates: Partial<Service>) {
    setServices(services.map(service =>
      service.id === id ? { ...service, ...updates } : service
    ));
  }

  function deleteService(id: string) {
    if (confirm('Delete this service?')) {
      setServices(services.filter(s => s.id !== id));
    }
  }

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Services & Offerings</h2>
        <p className="text-sm text-gray-600 mb-4">
          List the services you offer to help customers understand what you do
        </p>
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {services.map(service => (
          <div key={service.id} className="bg-gray-50 p-4 rounded-lg">
            {editingId === service.id ? (
              // Edit Mode
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="sm:w-32">
                    <AvatarUploader
                      userId={businessId}
                      value={service.image_url || ''}
                      onChange={(url) => updateService(service.id, { image_url: url })}
                      label="Service Image"
                      size={100}
                    />
                  </div>
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      value={service.title}
                      onChange={(e) => updateService(service.id, { title: e.target.value })}
                      placeholder="Service name (required)"
                      style={{ fontSize: '16px' }}
                    />
                    <textarea
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      value={service.description}
                      onChange={(e) => updateService(service.id, { description: e.target.value })}
                      placeholder="Describe this service..."
                      style={{ fontSize: '16px' }}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        className="px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={service.price}
                        onChange={(e) => updateService(service.id, { price: e.target.value })}
                        placeholder="Price (e.g., $50)"
                        style={{ fontSize: '16px' }}
                      />
                      <input
                        type="text"
                        className="px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={service.duration}
                        onChange={(e) => updateService(service.id, { duration: e.target.value })}
                        placeholder="Duration (e.g., 1 hour)"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => deleteService(service.id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div 
                className="flex flex-col sm:flex-row gap-4 cursor-pointer hover:bg-gray-100 -m-2 p-2 rounded transition-colors"
                onClick={() => setEditingId(service.id)}
              >
                {service.image_url && (
                  <img
                    src={service.image_url}
                    alt={service.title}
                    className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{service.title || 'Untitled Service'}</h3>
                  {service.description && (
                    <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm">
                    {service.price && (
                      <span className="text-purple-600 font-medium">{service.price}</span>
                    )}
                    {service.duration && (
                      <span className="text-gray-500">{service.duration}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Click to edit
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Service Button */}
      <button
        onClick={addService}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
      >
        + Add Service
      </button>

      {/* Save Button */}
      {(editingId || services.some(s => !s.title)) && (
        <div className="flex justify-center sm:justify-end pt-4 border-t">
          <button
            onClick={save}
            disabled={saving || services.some(s => !s.title)}
            className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-base touch-manipulation min-h-[48px]"
          >
            {saving ? 'Saving...' : 'Save Services'}
          </button>
        </div>
      )}
    </div>
  );
}
