// components/business/BusinessTabs.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import BusinessBasicTab from './tabs/BusinessBasicTab';
import BusinessDetailsTab from './tabs/BusinessDetailsTab';
import BusinessGalleryTab from './tabs/BusinessGalleryTab';
import BusinessStoreTab from './tabs/BusinessStoreTab';
import BusinessSettingsTab from './tabs/BusinessSettingsTab';

const allTabs = [
  { id: 'basic', label: 'Basic Info', icon: '📝', color: 'purple', required: true },
  { id: 'details', label: 'Details', icon: '📋', color: 'blue', required: true },
  { id: 'store', label: 'Store', icon: '🛍️', color: 'rose' },
  { id: 'gallery', label: 'Gallery', icon: '📸', color: 'pink' },
  { id: 'settings', label: 'Settings', icon: '⚙️', color: 'gray', required: true },
];

interface Props {
  businessId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface TabConfig {
  details?: boolean;
  store?: boolean;
  gallery?: boolean;
}

export default function BusinessTabs({ businessId, activeTab, setActiveTab }: Props) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [enabledTabs, setEnabledTabs] = useState<TabConfig>({
    hours: true,
    services: true,
    store: true,
    gallery: true,
    social: true,
  });
  const [loading, setLoading] = useState(true);

  // Load tab configuration from database
  useEffect(() => {
    async function loadTabConfig() {
      try {
        const { data } = await supabase
          .from('business_profiles')
          .select('enabled_tabs')
          .eq('id', businessId)
          .single();

        if (data?.enabled_tabs) {
          setEnabledTabs(data.enabled_tabs);
        }
      } catch (error) {
        console.log('No tab config found, using defaults');
      }
      setLoading(false);
    }
    loadTabConfig();
  }, [businessId]);

  // Filter tabs based on enabled configuration
  const tabs = allTabs.filter(tab => {
    // Always show required tabs (Basic Info, Contact, Settings)
    if (tab.required) return true;
    
    // For optional tabs, check if they're enabled
    const isEnabled = enabledTabs[tab.id as keyof TabConfig];
    
    // Show tab if it's not explicitly disabled (default to showing)
    return isEnabled !== false;
  });

  // If the active tab is now hidden, switch to the first available tab
  useEffect(() => {
    if (!loading && !tabs.find(tab => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, tabs, setActiveTab, loading]);

  const activeTabData = tabs.find(t => t.id === activeTab);
  
  // Get color classes based on active tab
  const getColorClasses = (isActive: boolean, color: string) => {
    if (!isActive) return 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200';
    
    const colorMap: Record<string, string> = {
      purple: 'bg-purple-50 text-purple-700 border-purple-300',
      blue: 'bg-blue-50 text-blue-700 border-blue-300',
      green: 'bg-green-50 text-green-700 border-green-300',
      amber: 'bg-amber-50 text-amber-700 border-amber-300',
      rose: 'bg-rose-50 text-rose-700 border-rose-300',
      pink: 'bg-pink-50 text-pink-700 border-pink-300',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-300',
      gray: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    
    return colorMap[color] || colorMap.purple;
  };

  // Handle swipe gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      const currentIndex = tabs.findIndex(t => t.id === activeTab);
      if (diff > 0 && currentIndex < tabs.length - 1) {
        // Swipe left - next tab
        setActiveTab(tabs[currentIndex + 1].id);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous tab
        setActiveTab(tabs[currentIndex - 1].id);
      }
    }
    setTouchStart(null);
  };

  // Update tab configuration (called from Settings tab)
  const updateTabConfig = async (newConfig: TabConfig) => {
    setEnabledTabs(newConfig);
    
    // Save to database
    await supabase
      .from('business_profiles')
      .update({ enabled_tabs: newConfig })
      .eq('id', businessId);
  };

  // Don't show loading state - render with defaults immediately
  if (loading) {
    // Still render but with all default tabs while loading
    const defaultTabs = allTabs;
    const defaultActiveTab = defaultTabs.find(t => t.id === activeTab);
    
    return (
      <div className="bg-gray-50 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-white border-b border-gray-200">
          <div className="relative">
            <nav className="hidden sm:flex p-1 bg-gray-50">
              {defaultTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                    transition-all duration-200 flex-1 border
                    ${getColorClasses(activeTab === tab.id, tab.color)}
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className="sm:hidden overflow-x-auto scrollbar-hide">
              <nav className="flex p-2 gap-2 min-w-max">
                <button className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg font-medium text-xs min-w-[80px] transition-all border bg-purple-50 text-purple-700 border-purple-300 shadow-md scale-105">
                  <span className="text-xl">📝</span>
                  <span>Basic Info</span>
                </button>
                <button className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg font-medium text-xs min-w-[80px] transition-all border bg-white text-gray-600 hover:bg-gray-50 border-gray-200">
                  <span className="text-xl">📋</span>
                  <span>Details</span>
                </button>
                <button className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg font-medium text-xs min-w-[80px] transition-all border bg-white text-gray-600 hover:bg-gray-50 border-gray-200">
                  <span className="text-xl">🛍️</span>
                  <span>Store</span>
                </button>
                <button className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg font-medium text-xs min-w-[80px] transition-all border bg-white text-gray-600 hover:bg-gray-50 border-gray-200">
                  <span className="text-xl">📸</span>
                  <span>Gallery</span>
                </button>
                <button className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg font-medium text-xs min-w-[80px] transition-all border bg-white text-gray-600 hover:bg-gray-50 border-gray-200">
                  <span className="text-xl">⚙️</span>
                  <span>Settings</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
        <div className="bg-white p-6">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl shadow-sm overflow-hidden">
      {/* Tab Navigation - Mobile Scrollable */}
      <div className="bg-white border-b border-gray-200">
        <div className="relative">
          {/* Desktop Tab Navigation */}
          <nav className="hidden sm:flex p-1 bg-gray-50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                  transition-all duration-200 flex-1 border
                  ${getColorClasses(activeTab === tab.id, tab.color)}
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile Tab Navigation - Horizontal Scroll */}
          <div 
            className="sm:hidden overflow-x-auto scrollbar-hide"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <nav className="flex p-2 gap-2 min-w-max">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col items-center gap-1 px-4 py-3 rounded-lg
                    font-medium text-xs min-w-[80px] transition-all border
                    ${getColorClasses(activeTab === tab.id, tab.color)}
                    ${activeTab === tab.id ? 'shadow-md scale-105' : ''}
                  `}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile Tab Indicator */}
          <div className="sm:hidden h-1 bg-gray-100">
            <div 
              className="h-full bg-purple-600 transition-all duration-300"
              style={{
                width: `${100 / tabs.length}%`,
                marginLeft: `${(tabs.findIndex(t => t.id === activeTab) * 100) / tabs.length}%`
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Tab Content Area */}
      <div className="bg-white">
        {/* Tab Header */}
        {activeTabData && (
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeTabData.icon}</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {activeTabData.label}
                </h3>
                <p className="text-sm text-gray-500">
                  {activeTab === 'basic' && 'Manage your business profile information'}
                  {activeTab === 'details' && 'Contact, services, hours, and social links'}
                  {activeTab === 'store' && 'Showcase products with external purchase links'}
                  {activeTab === 'gallery' && 'Showcase your work and space'}
                  {activeTab === 'settings' && 'Privacy and visibility settings'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'basic' && <BusinessBasicTab businessId={businessId} />}
          {activeTab === 'details' && <BusinessDetailsTab businessId={businessId} />}
          {activeTab === 'store' && <BusinessStoreTab businessId={businessId} />}
          {activeTab === 'gallery' && <BusinessGalleryTab businessId={businessId} />}
          {activeTab === 'settings' && (
            <BusinessSettingsTab 
              businessId={businessId}
              enabledTabs={enabledTabs}
              onUpdateTabs={updateTabConfig}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Add this to your global CSS or Tailwind config if not already there
// .scrollbar-hide::-webkit-scrollbar { display: none; }
// .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
