// components/business/BusinessTabs.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import BusinessBasicTab from './tabs/BusinessBasicTab';
import BusinessContactTab from './tabs/BusinessContactTab';
import BusinessHoursTab from './tabs/BusinessHoursTab';
import BusinessGalleryTab from './tabs/BusinessGalleryTab';
import BusinessSocialTab from './tabs/BusinessSocialTab';
import BusinessServicesTab from './tabs/BusinessServicesTab';
import BusinessStoreTab from './tabs/BusinessStoreTab';
import BusinessSettingsTab from './tabs/BusinessSettingsTab';

const tabs = [
  { id: 'basic', label: 'Basic Info', icon: '📝', color: 'purple', required: true },
  { id: 'contact', label: 'Contact', icon: '📞', color: 'blue', required: false },
  { id: 'hours', label: 'Hours', icon: '🕐', color: 'green', required: false },
  { id: 'services', label: 'Services', icon: '💼', color: 'amber', required: false },
  { id: 'store', label: 'Store', icon: '🛍️', color: 'rose', required: false },
  { id: 'gallery', label: 'Gallery', icon: '📸', color: 'pink', required: false },
  { id: 'social', label: 'Social', icon: '🔗', color: 'indigo', required: false },
  { id: 'settings', label: 'Settings', icon: '⚙️', color: 'gray', required: true },
];

interface Props {
  businessId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BusinessTabs({ businessId, activeTab, setActiveTab }: Props) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [enabledTabs, setEnabledTabs] = useState<Record<string, boolean>>({
    basic: true,
    contact: true,
    hours: false,
    services: false,
    store: false,
    gallery: true,
    social: true,
    settings: true,
  });
  
  useEffect(() => {
    // Load enabled tabs from database
    loadEnabledTabs();
  }, [businessId]);

  async function loadEnabledTabs() {
    const { data } = await supabase
      .from('business_profiles')
      .select('enabled_tabs')
      .eq('id', businessId)
      .single();
    
    if (data?.enabled_tabs) {
      setEnabledTabs(data.enabled_tabs);
    }
  }

  // Pass this to Settings tab to update
  const updateEnabledTabs = async (newEnabledTabs: Record<string, boolean>) => {
    setEnabledTabs(newEnabledTabs);
    
    await supabase
      .from('business_profiles')
      .update({ enabled_tabs: newEnabledTabs })
      .eq('id', businessId);
  };
  
  const visibleTabs = tabs.filter(tab => tab.required || enabledTabs[tab.id]);
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
      const currentIndex = visibleTabs.findIndex(t => t.id === activeTab);
      if (diff > 0 && currentIndex < visibleTabs.length - 1) {
        // Swipe left - next tab
        setActiveTab(visibleTabs[currentIndex + 1].id);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous tab
        setActiveTab(visibleTabs[currentIndex - 1].id);
      }
    }
    setTouchStart(null);
  };

  return (
    <div className="bg-gray-50 rounded-xl shadow-sm overflow-hidden">
      {/* Tab Navigation - Mobile Scrollable with Better Layout */}
      <div className="bg-white border-b border-gray-200">
        <div className="relative">
          {/* Desktop Tab Navigation */}
          <nav className="hidden sm:flex p-1 bg-gray-50 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                    transition-all duration-200 border whitespace-nowrap
                    ${getColorClasses(activeTab === tab.id, tab.color)}
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Mobile Tab Navigation - Horizontal Scroll */}
          <div 
            className="sm:hidden overflow-x-auto scrollbar-hide"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <nav className="flex p-2 gap-2 min-w-max bg-gray-50">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col items-center gap-1 px-4 py-3 rounded-lg
                    font-medium text-xs min-w-[75px] transition-all border
                    ${getColorClasses(activeTab === tab.id, tab.color)}
                    ${activeTab === tab.id ? 'shadow-md scale-105' : ''}
                  `}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile Tab Indicator */}
          <div className="sm:hidden h-1 bg-gray-100">
            <div 
              className="h-full bg-purple-600 transition-all duration-300"
              style={{
                width: `${100 / visibleTabs.length}%`,
                marginLeft: `${(visibleTabs.findIndex(t => t.id === activeTab) * 100) / visibleTabs.length}%`
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
                  {activeTab === 'contact' && 'Set up how customers can reach you'}
                  {activeTab === 'hours' && 'Configure your business hours'}
                  {activeTab === 'services' && 'List your services and offerings'}
                  {activeTab === 'store' && 'Showcase products with external purchase links'}
                  {activeTab === 'gallery' && 'Showcase your work and space'}
                  {activeTab === 'social' && 'Connect your social media accounts'}
                  {activeTab === 'settings' && 'Privacy, visibility, and tab settings'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'basic' && <BusinessBasicTab businessId={businessId} />}
          {activeTab === 'contact' && enabledTabs.contact && <BusinessContactTab businessId={businessId} />}
          {activeTab === 'hours' && enabledTabs.hours && <BusinessHoursTab businessId={businessId} />}
          {activeTab === 'services' && enabledTabs.services && <BusinessServicesTab businessId={businessId} />}
          {activeTab === 'store' && enabledTabs.store && <BusinessStoreTab businessId={businessId} />}
          {activeTab === 'gallery' && enabledTabs.gallery && <BusinessGalleryTab businessId={businessId} />}
          {activeTab === 'social' && enabledTabs.social && <BusinessSocialTab businessId={businessId} />}
          {activeTab === 'settings' && <BusinessSettingsTab businessId={businessId} enabledTabs={enabledTabs} onUpdateEnabledTabs={updateEnabledTabs} />}
        </div>
      </div>
    </div>
  );
}

// Add this to your global CSS or Tailwind config
// .scrollbar-hide::-webkit-scrollbar { display: none; }
// .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
