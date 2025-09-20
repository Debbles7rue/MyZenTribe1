// components/business/tabs/BusinessStoreTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface StoreItem {
  id: string;
  type: 'product' | 'service' | 'booking' | 'course' | 'download';
  name: string;
  description: string;
  price: string;
  price_type: 'fixed' | 'starting' | 'range' | 'contact';
  image_url?: string;
  external_url?: string;
  button_text: string;
  category?: string;
  in_stock: boolean;
  featured: boolean;
  order: number;
}

const DEFAULT_BUTTON_TEXTS = {
  product: 'Shop Now',
  service: 'Learn More',
  booking: 'Book Now',
  course: 'View Course',
  download: 'Download',
};

const ITEM_TYPES = [
  { value: 'product', label: 'Product', icon: '🛍️', color: 'purple' },
  { value: 'service', label: 'Service', icon: '✨', color: 'blue' },
  { value: 'booking', label: 'Booking', icon: '📅', color: 'green' },
  { value: 'course', label: 'Course', icon: '🎓', color: 'amber' },
  { value: 'download', label: 'Digital', icon: '💾', color: 'pink' },
];

const EXTERNAL_PLATFORMS = [
  'Etsy', 'Amazon', 'eBay', 'Shopify', 'Square', 'PayPal', 
  'Gumroad', 'Teachable', 'Calendly', 'Custom Website'
];

export default function BusinessStoreTab({ businessId }: { businessId: string }) {
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Showcase Settings
  const [storeSettings, setStoreSettings] = useState({
    store_enabled: false,
    store_title: 'Product Showcase',
    store_description: 'Browse our products and services available on various platforms',
    currency_symbol: '

  useEffect(() => {
    loadStoreData();
  }, [businessId]);

  async function loadStoreData() {
    try {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('store_items, store_settings')
        .eq('id', businessId)
        .single();
      
      if (biz?.store_items) {
        setStoreItems(biz.store_items as StoreItem[]);
      }
      
      if (biz?.store_settings) {
        setStoreSettings({ ...storeSettings, ...biz.store_settings });
      }
    } catch (error) {
      console.error('Error loading store data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveStore() {
    setSaving(true);
    setMessage('');
    
    const { error } = await supabase
      .from('business_profiles')
      .update({ 
        store_items: storeItems,
        store_settings: storeSettings 
      })
      .eq('id', businessId);
    
    if (error) {
      setMessage('❌ Error: ' + error.message);
    } else {
      setMessage('✅ Showcase saved!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  function addOrUpdateItem(item: StoreItem) {
    if (editingItem) {
      setStoreItems(storeItems.map(i => i.id === item.id ? item : i));
    } else {
      const newItem = { ...item, id: crypto.randomUUID(), order: storeItems.length };
      setStoreItems([...storeItems, newItem]);
    }
    setEditingItem(null);
    setShowAddForm(false);
  }

  function deleteItem(itemId: string) {
    if (confirm('Remove this item from your showcase?')) {
      setStoreItems(storeItems.filter(i => i.id !== itemId));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-3 text-purple-600 font-medium">Loading showcase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto -mt-6 -mx-6">
      {/* Colorful Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
        <h2 className="text-3xl font-bold">🛍️ Product Showcase</h2>
        <p className="mt-2 text-purple-100">
          Display your products & services with links to external platforms
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Message Alert */}
        {message && (
          <div className={`
            p-4 rounded-xl flex items-center gap-2 animate-fade-in shadow-lg
            ${message.includes('Error') 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            }
          `}>
            {message}
          </div>
        )}

        {/* Showcase Settings Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-md">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">⚙️</span> Showcase Settings
          </h3>
          
          <div className="space-y-4">
            {/* Enable Showcase Toggle */}
            <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
              <div>
                <label className="text-sm font-semibold text-gray-800">Enable Product Showcase</label>
                <p className="text-xs text-gray-500">Display showcase on your public profile</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeSettings.store_enabled}
                  onChange={(e) => setStoreSettings({ ...storeSettings, store_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Showcase Title */}
              <div>
                <label className="block text-sm font-semibold text-blue-800 mb-2">
                  Showcase Title
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500"
                  value={storeSettings.store_title}
                  onChange={(e) => setStoreSettings({ ...storeSettings, store_title: e.target.value })}
                  placeholder="Product Showcase"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-semibold text-blue-800 mb-2">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500"
                  value={storeSettings.currency_symbol}
                  onChange={(e) => setStoreSettings({ ...storeSettings, currency_symbol: e.target.value.slice(0, 3) })}
                  maxLength={3}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-2">
                Showcase Description
              </label>
              <textarea
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500"
                rows={2}
                value={storeSettings.store_description}
                onChange={(e) => setStoreSettings({ ...storeSettings, store_description: e.target.value })}
                placeholder="Browse our curated collection available on various platforms..."
              />
            </div>

            {/* Show Prices Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={storeSettings.show_prices}
                onChange={(e) => setStoreSettings({ ...storeSettings, show_prices: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Display prices on items</span>
            </label>
          </div>
        </div>

        {/* Add Item Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">
            Your Items ({storeItems.length})
          </h3>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowAddForm(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2 font-semibold shadow-lg"
          >
            <span className="text-xl">➕</span> Add Item
          </button>
        </div>

        {/* Add/Edit Item Form */}
        {(showAddForm || editingItem) && (
          <ItemForm
            item={editingItem || {
              id: '',
              type: 'product',
              name: '',
              description: '',
              price: '',
              price_type: 'fixed',
              button_text: DEFAULT_BUTTON_TEXTS.product,
              in_stock: true,
              featured: false,
              order: storeItems.length,
            }}
            onSave={addOrUpdateItem}
            onCancel={() => {
              setShowAddForm(false);
              setEditingItem(null);
            }}
          />
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storeItems.length === 0 ? (
            <div className="col-span-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
              <div className="text-5xl mb-4">🛍️</div>
              <p className="text-gray-600 font-medium text-lg">No items in your showcase yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Add products from Etsy, Amazon, your website, or any platform!
              </p>
            </div>
          ) : (
            storeItems
              .sort((a, b) => a.order - b.order)
              .map((item, index) => (
                <ShowcaseItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  currencySymbol={storeSettings.currency_symbol}
                  showPrices={storeSettings.show_prices}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))
          )}
        </div>

        {/* Save Button */}
        {storeItems.length > 0 && (
          <div className="flex justify-end pt-4">
            <button
              onClick={saveStore}
              disabled={saving}
              className={`
                px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg
                ${saving
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transform hover:scale-105'
                }
              `}
            >
              {saving ? '✨ Saving...' : '💫 Save Showcase'}
            </button>
          </div>
        )}

        {/* Platform Examples */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <h4 className="text-sm font-semibold text-purple-900 mb-3">
            🌟 Supported Platforms
          </h4>
          <div className="flex flex-wrap gap-2">
            {EXTERNAL_PLATFORMS.map(platform => (
              <span
                key={platform}
                className="px-3 py-1 bg-white text-purple-700 rounded-full text-xs font-medium shadow-sm"
              >
                {platform}
              </span>
            ))}
          </div>
          <p className="text-xs text-purple-600 mt-3">
            Link to any external platform where you sell products or services
          </p>
        </div>
      </div>
    </div>
  );
}

// Item Form Component - Colorful
function ItemForm({ 
  item, 
  onSave, 
  onCancel 
}: { 
  item: StoreItem; 
  onSave: (item: StoreItem) => void; 
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(item);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 shadow-md">
      <h4 className="text-lg font-bold text-amber-900 mb-4">
        {item.id ? '✏️ Edit Item' : '➕ Add New Item'}
      </h4>

      <div className="space-y-4">
        {/* Item Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-amber-800 mb-2">
            Item Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ITEM_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ 
                  ...formData, 
                  type: type.value as any,
                  button_text: DEFAULT_BUTTON_TEXTS[type.value as keyof typeof DEFAULT_BUTTON_TEXTS]
                })}
                className={`
                  px-3 py-3 rounded-xl text-sm font-medium transition-all border-2
                  ${formData.type === type.value
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white border-amber-400 shadow-md'
                    : 'bg-white text-gray-700 border-amber-200 hover:border-amber-400'
                  }
                `}
              >
                <span className="text-lg mr-1">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-2">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Handmade Bracelet"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-2">
              Price Display
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="e.g., 29.99 or 25-50"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-amber-800 mb-2">
            Description
          </label>
          <textarea
            className="w-full px-4 py-2 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this item..."
          />
        </div>

        {/* External Link - Highlighted */}
        <div className="bg-white rounded-xl p-4 border-2 border-orange-300">
          <label className="block text-sm font-semibold text-orange-800 mb-2">
            🔗 External Platform Link <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            className="w-full px-4 py-2 border-2 border-orange-300 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500"
            value={formData.external_url || ''}
            onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
            placeholder="https://etsy.com/listing/... or amazon.com/..."
          />
          <p className="text-xs text-orange-600 mt-1">
            Where customers will be directed to purchase
          </p>
        </div>

        {/* Button Text */}
        <div>
          <label className="block text-sm font-semibold text-amber-800 mb-2">
            Button Text
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500"
            value={formData.button_text}
            onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
            placeholder="e.g., Shop on Etsy, View on Amazon"
          />
        </div>

        {/* Options */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">⭐ Featured Item</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.in_stock}
              onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">✅ Available</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-amber-200">
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.name || !formData.external_url}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 font-semibold shadow-md"
          >
            {item.id ? 'Update Item' : 'Add to Showcase'}
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Showcase Item Card - Beautiful Design
function ShowcaseItemCard({ 
  item, 
  index,
  currencySymbol,
  showPrices,
  onEdit, 
  onDelete
}: any) {
  return (
    <div className={`
      bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden
      ${item.featured ? 'ring-2 ring-purple-400' : ''}
      ${!item.in_stock ? 'opacity-75' : ''}
    `}>
      {/* Featured Badge */}
      {item.featured && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 text-center">
          ⭐ FEATURED
        </div>
      )}
      
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 text-lg">{item.name}</h4>
            {!item.in_stock && (
              <span className="inline-block mt-1 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                Currently Unavailable
              </span>
            )}
          </div>
          
          {/* Price */}
          {showPrices && item.price && (
            <div className="text-right ml-3">
              <span className="text-2xl font-bold text-purple-600">
                {currencySymbol}{item.price}
              </span>
            </div>
          )}
        </div>
        
        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
        )}
        
        {/* External Link Button */}
        {item.external_url && (
          <a
            href={item.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold transition-all mb-3"
          >
            {item.button_text} →
          </a>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 text-sm">
          <button
            onClick={onEdit}
            className="flex-1 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
},
    show_prices: true,
    external_checkout_message: 'Click to shop on external platform',
  });

  useEffect(() => {
    loadStoreData();
  }, [businessId]);

  async function loadStoreData() {
    const { data: biz } = await supabase
      .from('business_profiles')
      .select('store_items, store_settings')
      .eq('id', businessId)
      .single();
    
    if (biz?.store_items) {
      setStoreItems(biz.store_items as StoreItem[]);
    }
    
    if (biz?.store_settings) {
      setStoreSettings({ ...storeSettings, ...biz.store_settings });
    }
    
    setLoading(false);
  }

  async function saveStore() {
    setSaving(true);
    setMessage('');
    
    const { error } = await supabase
      .from('business_profiles')
      .update({ 
        store_items: storeItems,
        store_settings: storeSettings 
      })
      .eq('id', businessId);
    
    if (error) {
      setMessage('❌ Error: ' + error.message);
    } else {
      setMessage('✅ Showcase saved!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  function addOrUpdateItem(item: StoreItem) {
    if (editingItem) {
      setStoreItems(storeItems.map(i => i.id === item.id ? item : i));
    } else {
      const newItem = { ...item, id: crypto.randomUUID(), order: storeItems.length };
      setStoreItems([...storeItems, newItem]);
    }
    setEditingItem(null);
    setShowAddForm(false);
  }

  function deleteItem(itemId: string) {
    if (confirm('Remove this item from your showcase?')) {
      setStoreItems(storeItems.filter(i => i.id !== itemId));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-3 text-purple-600 font-medium">Loading showcase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto -mt-6 -mx-6">
      {/* Colorful Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
        <h2 className="text-3xl font-bold">🛍️ Product Showcase</h2>
        <p className="mt-2 text-purple-100">
          Display your products & services with links to external platforms
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Message Alert */}
        {message && (
          <div className={`
            p-4 rounded-xl flex items-center gap-2 animate-fade-in shadow-lg
            ${message.includes('Error') 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            }
          `}>
            {message}
          </div>
        )}

        {/* Showcase Settings Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-md">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">⚙️</span> Showcase Settings
          </h3>
          
          <div className="space-y-4">
            {/* Enable Showcase Toggle */}
            <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
              <div>
                <label className="text-sm font-semibold text-gray-800">Enable Product Showcase</label>
                <p className="text-xs text-gray-500">Display showcase on your public profile</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeSettings.store_enabled}
                  onChange={(e) => setStoreSettings({ ...storeSettings, store_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Showcase Title */}
              <div>
                <label className="block text-sm font-semibold text-blue-800 mb-2">
                  Showcase Title
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500"
                  value={storeSettings.store_title}
                  onChange={(e) => setStoreSettings({ ...storeSettings, store_title: e.target.value })}
                  placeholder="Product Showcase"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-semibold text-blue-800 mb-2">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500"
                  value={storeSettings.currency_symbol}
                  onChange={(e) => setStoreSettings({ ...storeSettings, currency_symbol: e.target.value.slice(0, 3) })}
                  maxLength={3}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-2">
                Showcase Description
              </label>
              <textarea
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500"
                rows={2}
                value={storeSettings.store_description}
                onChange={(e) => setStoreSettings({ ...storeSettings, store_description: e.target.value })}
                placeholder="Browse our curated collection available on various platforms..."
              />
            </div>

            {/* Show Prices Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={storeSettings.show_prices}
                onChange={(e) => setStoreSettings({ ...storeSettings, show_prices: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Display prices on items</span>
            </label>
          </div>
        </div>

        {/* Add Item Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">
            Your Items ({storeItems.length})
          </h3>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowAddForm(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2 font-semibold shadow-lg"
          >
            <span className="text-xl">➕</span> Add Item
          </button>
        </div>

        {/* Add/Edit Item Form */}
        {(showAddForm || editingItem) && (
          <ItemForm
            item={editingItem || {
              id: '',
              type: 'product',
              name: '',
              description: '',
              price: '',
              price_type: 'fixed',
              button_text: DEFAULT_BUTTON_TEXTS.product,
              in_stock: true,
              featured: false,
              order: storeItems.length,
            }}
            onSave={addOrUpdateItem}
            onCancel={() => {
              setShowAddForm(false);
              setEditingItem(null);
            }}
          />
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storeItems.length === 0 ? (
            <div className="col-span-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
              <div className="text-5xl mb-4">🛍️</div>
              <p className="text-gray-600 font-medium text-lg">No items in your showcase yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Add products from Etsy, Amazon, your website, or any platform!
              </p>
            </div>
          ) : (
            storeItems
              .sort((a, b) => a.order - b.order)
              .map((item, index) => (
                <ShowcaseItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  currencySymbol={storeSettings.currency_symbol}
                  showPrices={storeSettings.show_prices}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))
          )}
        </div>

        {/* Save Button */}
        {storeItems.length > 0 && (
          <div className="flex justify-end pt-4">
            <button
              onClick={saveStore}
              disabled={saving}
              className={`
                px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg
                ${saving
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transform hover:scale-105'
                }
              `}
            >
              {saving ? '✨ Saving...' : '💫 Save Showcase'}
            </button>
          </div>
        )}

        {/* Platform Examples */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <h4 className="text-sm font-semibold text-purple-900 mb-3">
            🌟 Supported Platforms
          </h4>
          <div className="flex flex-wrap gap-2">
            {EXTERNAL_PLATFORMS.map(platform => (
              <span
                key={platform}
                className="px-3 py-1 bg-white text-purple-700 rounded-full text-xs font-medium shadow-sm"
              >
                {platform}
              </span>
            ))}
          </div>
          <p className="text-xs text-purple-600 mt-3">
            Link to any external platform where you sell products or services
          </p>
        </div>
      </div>
    </div>
  );
}

// Item Form Component - Colorful
function ItemForm({ 
  item, 
  onSave, 
  onCancel 
}: { 
  item: StoreItem; 
  onSave: (item: StoreItem) => void; 
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(item);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 shadow-md">
      <h4 className="text-lg font-bold text-amber-900 mb-4">
        {item.id ? '✏️ Edit Item' : '➕ Add New Item'}
      </h4>

      <div className="space-y-4">
        {/* Item Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-amber-800 mb-2">
            Item Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ITEM_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ 
                  ...formData, 
                  type: type.value as any,
                  button_text: DEFAULT_BUTTON_TEXTS[type.value as keyof typeof DEFAULT_BUTTON_TEXTS]
                })}
                className={`
                  px-3 py-3 rounded-xl text-sm font-medium transition-all border-2
                  ${formData.type === type.value
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white border-amber-400 shadow-md'
                    : 'bg-white text-gray-700 border-amber-200 hover:border-amber-400'
                  }
                `}
              >
                <span className="text-lg mr-1">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-2">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Handmade Bracelet"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-2">
              Price Display
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="e.g., 29.99 or 25-50"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-amber-800 mb-2">
            Description
          </label>
          <textarea
            className="w-full px-4 py-2 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this item..."
          />
        </div>

        {/* External Link - Highlighted */}
        <div className="bg-white rounded-xl p-4 border-2 border-orange-300">
          <label className="block text-sm font-semibold text-orange-800 mb-2">
            🔗 External Platform Link <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            className="w-full px-4 py-2 border-2 border-orange-300 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500"
            value={formData.external_url || ''}
            onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
            placeholder="https://etsy.com/listing/... or amazon.com/..."
          />
          <p className="text-xs text-orange-600 mt-1">
            Where customers will be directed to purchase
          </p>
        </div>

        {/* Button Text */}
        <div>
          <label className="block text-sm font-semibold text-amber-800 mb-2">
            Button Text
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500"
            value={formData.button_text}
            onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
            placeholder="e.g., Shop on Etsy, View on Amazon"
          />
        </div>

        {/* Options */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">⭐ Featured Item</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.in_stock}
              onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">✅ Available</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-amber-200">
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.name || !formData.external_url}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 font-semibold shadow-md"
          >
            {item.id ? 'Update Item' : 'Add to Showcase'}
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Showcase Item Card - Beautiful Design
function ShowcaseItemCard({ 
  item, 
  index,
  currencySymbol,
  showPrices,
  onEdit, 
  onDelete
}: any) {
  return (
    <div className={`
      bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden
      ${item.featured ? 'ring-2 ring-purple-400' : ''}
      ${!item.in_stock ? 'opacity-75' : ''}
    `}>
      {/* Featured Badge */}
      {item.featured && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 text-center">
          ⭐ FEATURED
        </div>
      )}
      
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 text-lg">{item.name}</h4>
            {!item.in_stock && (
              <span className="inline-block mt-1 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                Currently Unavailable
              </span>
            )}
          </div>
          
          {/* Price */}
          {showPrices && item.price && (
            <div className="text-right ml-3">
              <span className="text-2xl font-bold text-purple-600">
                {currencySymbol}{item.price}
              </span>
            </div>
          )}
        </div>
        
        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
        )}
        
        {/* External Link Button */}
        {item.external_url && (
          <a
            href={item.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold transition-all mb-3"
          >
            {item.button_text} →
          </a>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 text-sm">
          <button
            onClick={onEdit}
            className="flex-1 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
