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
  product: 'Buy Now',
  service: 'Book Now',
  booking: 'Schedule',
  course: 'Enroll',
  download: 'Get Now',
};

const ITEM_TYPES = [
  { value: 'product', label: 'Physical Product', icon: '📦' },
  { value: 'service', label: 'Service', icon: '✨' },
  { value: 'booking', label: 'Appointment', icon: '📅' },
  { value: 'course', label: 'Course/Class', icon: '🎓' },
  { value: 'download', label: 'Digital Download', icon: '💾' },
];

const PRICE_TYPES = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'starting', label: 'Starting At' },
  { value: 'range', label: 'Price Range' },
  { value: 'contact', label: 'Contact for Price' },
];

export default function BusinessStoreTab({ businessId }: { businessId: string }) {
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Store Settings
  const [storeSettings, setStoreSettings] = useState({
    store_enabled: false,
    store_title: 'Our Offerings',
    store_description: '',
    currency_symbol: '$',
    show_prices: true,
    external_checkout_message: 'You will be redirected to complete your purchase',
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
      // Extract unique categories
      const cats = [...new Set((biz.store_items as StoreItem[])
        .map(item => item.category)
        .filter(Boolean))] as string[];
      setCategories(cats);
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
      setMessage('Error: ' + error.message);
    } else {
      setMessage('✅ Store saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  function addOrUpdateItem(item: StoreItem) {
    if (editingItem) {
      // Update existing
      setStoreItems(storeItems.map(i => i.id === item.id ? item : i));
    } else {
      // Add new
      const newItem = { ...item, id: crypto.randomUUID(), order: storeItems.length };
      setStoreItems([...storeItems, newItem]);
    }
    setEditingItem(null);
    setShowAddForm(false);
  }

  function deleteItem(itemId: string) {
    if (confirm('Delete this item from your store?')) {
      setStoreItems(storeItems.filter(i => i.id !== itemId));
    }
  }

  function moveItem(itemId: string, direction: 'up' | 'down') {
    const index = storeItems.findIndex(i => i.id === itemId);
    if (index === -1) return;
    
    const newItems = [...storeItems];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < storeItems.length) {
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      // Update order values
      newItems.forEach((item, i) => item.order = i);
      setStoreItems(newItems);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading store...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Store & External Links</h2>
        <p className="text-gray-600 mt-1">
          Showcase your products and services with links to external checkout
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`
          p-4 rounded-xl flex items-center gap-2 animate-fade-in
          ${message.includes('Error') 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
          }
        `}>
          {message}
        </div>
      )}

      {/* Store Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Store Settings</h3>
        
        <div className="space-y-4">
          {/* Enable Store Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Store</label>
              <p className="text-xs text-gray-500">Show store section on your public profile</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={storeSettings.store_enabled}
                onChange={(e) => setStoreSettings({ ...storeSettings, store_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Store Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Section Title
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              value={storeSettings.store_title}
              onChange={(e) => setStoreSettings({ ...storeSettings, store_title: e.target.value })}
              placeholder="Our Offerings"
            />
          </div>

          {/* Store Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Description (Optional)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              rows={2}
              value={storeSettings.store_description}
              onChange={(e) => setStoreSettings({ ...storeSettings, store_description: e.target.value })}
              placeholder="Browse our products and services..."
            />
          </div>

          {/* Additional Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency Symbol
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                value={storeSettings.currency_symbol}
                onChange={(e) => setStoreSettings({ ...storeSettings, currency_symbol: e.target.value })}
                maxLength={3}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-prices"
                checked={storeSettings.show_prices}
                onChange={(e) => setStoreSettings({ ...storeSettings, show_prices: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <label htmlFor="show-prices" className="text-sm text-gray-700">
                Show prices on items
              </label>
            </div>
          </div>

          {/* External Checkout Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              External Checkout Message
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              value={storeSettings.external_checkout_message}
              onChange={(e) => setStoreSettings({ ...storeSettings, external_checkout_message: e.target.value })}
              placeholder="You will be redirected to complete your purchase"
            />
            <p className="text-xs text-gray-500 mt-1">
              This message appears when users click on product links
            </p>
          </div>
        </div>
      </div>

      {/* Add Item Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Store Items ({storeItems.length})</h3>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowAddForm(true);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
        >
          <span>➕</span> Add Item
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

      {/* Items List */}
      <div className="space-y-3">
        {storeItems.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">No items in your store yet</p>
            <p className="text-sm text-gray-500 mt-2">Add products or services to display them here</p>
          </div>
        ) : (
          storeItems
            .sort((a, b) => a.order - b.order)
            .map((item, index) => (
              <StoreItemCard
                key={item.id}
                item={item}
                index={index}
                total={storeItems.length}
                currencySymbol={storeSettings.currency_symbol}
                showPrices={storeSettings.show_prices}
                onEdit={() => setEditingItem(item)}
                onDelete={() => deleteItem(item.id)}
                onMoveUp={() => moveItem(item.id, 'up')}
                onMoveDown={() => moveItem(item.id, 'down')}
                onToggleFeatured={() => {
                  setStoreItems(storeItems.map(i => 
                    i.id === item.id ? { ...i, featured: !i.featured } : i
                  ));
                }}
                onToggleStock={() => {
                  setStoreItems(storeItems.map(i => 
                    i.id === item.id ? { ...i, in_stock: !i.in_stock } : i
                  ));
                }}
              />
            ))
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={saveStore}
          disabled={saving}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all
            ${saving
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 transform hover:scale-105'
            }
          `}
        >
          {saving ? 'Saving...' : 'Save Store'}
        </button>
      </div>
    </div>
  );
}

// Item Form Component
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h4 className="text-lg font-semibold mb-4">
        {item.id ? 'Edit Item' : 'Add New Item'}
      </h4>

      <div className="space-y-4">
        {/* Item Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  px-3 py-2 rounded-lg text-sm font-medium transition-all border
                  ${formData.type === type.value
                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <span className="mr-1">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sound Healing Session"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category (Optional)
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Sessions, Courses"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe this item..."
          />
        </div>

        {/* Price Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Display
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              value={formData.price_type}
              onChange={(e) => setFormData({ ...formData, price_type: e.target.value as any })}
            >
              {PRICE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder={formData.price_type === 'contact' ? 'N/A' : 'e.g., 75 or 50-100'}
              disabled={formData.price_type === 'contact'}
            />
          </div>
        </div>

        {/* External Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            External Link (Where to buy/book)
          </label>
          <input
            type="url"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            value={formData.external_url || ''}
            onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
            placeholder="https://your-booking-site.com/product"
          />
        </div>

        {/* Button Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Button Text
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            value={formData.button_text}
            onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
            placeholder="e.g., Book Now, Buy Now, Learn More"
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image URL (Optional)
          </label>
          <input
            type="url"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            value={formData.image_url || ''}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://your-image.jpg"
          />
        </div>

        {/* Options */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm text-gray-700">Featured Item</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.in_stock}
              onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm text-gray-700">In Stock/Available</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.name}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {item.id ? 'Update Item' : 'Add Item'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Store Item Card Component
function StoreItemCard({ 
  item, 
  index,
  total,
  currencySymbol,
  showPrices,
  onEdit, 
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleFeatured,
  onToggleStock
}: any) {
  return (
    <div className={`
      bg-white rounded-lg border p-4
      ${item.featured ? 'border-purple-300 bg-purple-50' : 'border-gray-200'}
      ${!item.in_stock ? 'opacity-60' : ''}
    `}>
      <div className="flex gap-4">
        {/* Image */}
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-24 h-24 object-cover rounded-lg"
          />
        )}
        
        {/* Content */}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-semibold text-gray-900">
                {item.name}
                {item.featured && <span className="ml-2 text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded">Featured</span>}
                {!item.in_stock && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Out of Stock</span>}
              </h4>
              {item.category && (
                <span className="text-xs text-gray-500">{item.category}</span>
              )}
            </div>
            
            {/* Price */}
            {showPrices && (
              <div className="text-right">
                {item.price_type === 'contact' ? (
                  <span className="text-sm text-gray-600">Contact for price</span>
                ) : (
                  <>
                    {item.price_type === 'starting' && <span className="text-xs text-gray-500">From </span>}
                    <span className="font-semibold text-lg">
                      {currencySymbol}{item.price}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
          
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Edit
              </button>
              <button
                onClick={onToggleFeatured}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                {item.featured ? 'Unfeature' : 'Feature'}
              </button>
              <button
                onClick={onToggleStock}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                {item.in_stock ? 'Out of Stock' : 'In Stock'}
              </button>
              <button
                onClick={onDelete}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
            
            {/* Order Controls */}
            <div className="flex gap-1">
              <button
                onClick={onMoveUp}
                disabled={index === 0}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={onMoveDown}
                disabled={index === total - 1}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </div>
          
          {/* External Link */}
          {item.external_url && (
            <a
              href={item.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
            >
              {item.button_text} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
