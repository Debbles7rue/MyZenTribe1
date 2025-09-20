// components/business/BusinessTabs.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import BusinessBasicTab from './tabs/BusinessBasicTab';
import BusinessContactTab from './tabs/BusinessContactTab';
import BusinessHoursTab from './tabs/BusinessHoursTab';
import BusinessGalleryTab from './tabs/BusinessGalleryTab';
import BusinessSocialTab from './tabs/BusinessSocialTab';
import BusinessServicesTab from './tabs/BusinessServicesTab';
import BusinessSettingsTab from './tabs/BusinessSettingsTab';

// Default tab configuration
const allTabs = [
  { id: 'basic', label: 'Basic Info', icon: '📝', mobileLabel: 'Basic', required: true },
  { id: 'contact', label: 'Contact', icon: '📞', mobileLabel: 'Contact', required: true },
  { id: 'hours', label: 'Hours', icon: '🕐', mobileLabel: 'Hours', required: false },
  { id: 'services', label: 'Services', icon: '💼', mobileLabel: 'Services', required: false },
  { id: 'store', label: 'Store', icon: '🛍️', mobileLabel: 'Store', required: false },
  { id: 'gallery', label: 'Gallery', icon: '📸', mobileLabel: 'Gallery', required: false },
  { id: 'social', label: 'Social', icon: '🔗', mobileLabel: 'Social', required: false },
  { id: 'settings', label: 'Settings', icon: '⚙️', mobileLabel: 'Settings', required: true },
];

interface Props {
  businessId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface TabConfig {
  hours?: boolean;
  services?: boolean;
  store?: boolean;
  gallery?: boolean;
  social?: boolean;
}

export default function BusinessTabs({ businessId, activeTab, setActiveTab }: Props) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [enabledTabs, setEnabledTabs] = useState<TabConfig>({
    hours: true,
    services: true,
    store: false, // Default to false since it's not ready
    gallery: true,
    social: true,
  });
  const [loading, setLoading] = useState(true);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Load tab configuration from database
  useEffect(() => {
    async function loadTabConfig() {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('enabled_tabs')
        .eq('id', businessId)
        .single();

      if (data?.enabled_tabs) {
        setEnabledTabs(data.enabled_tabs);
      }
      setLoading(false);
    }

    loadTabConfig();
  }, [businessId]);

  // Filter tabs based on enabled configuration
  const visibleTabs = allTabs.filter(tab => {
    if (tab.required) return true; // Always show required tabs
    return enabledTabs[tab.id as keyof TabConfig] !== false;
  });

  // If active tab is hidden, switch to first available tab
  useEffect(() => {
    if (!loading && !visibleTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTab, visibleTabs, setActiveTab, loading]);

  // Check scroll position for desktop horizontal scroll
  const checkScrollPosition = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    window.addEventListener('resize', checkScrollPosition);
    return () => window.removeEventListener('resize', checkScrollPosition);
  }, []);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScrollPosition, 300);
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setShowMobileMenu(false);
  };

  const currentTab = visibleTabs.find(tab => tab.id === activeTab);

  // Update tab configuration (called from Settings tab)
  const updateTabConfig = async (newConfig: TabConfig) => {
    setEnabledTabs(newConfig);
    
    // Save to database
    await supabase
      .from('business_profiles')
      .update({ enabled_tabs: newConfig })
      .eq('id', businessId);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Desktop Tab Navigation */}
      <div className="hidden md:block border-b relative">
        <div className="flex items-center">
          {/* Left scroll button */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTabs('left')}
              className="absolute left-0 z-10 p-2 bg-white shadow-md rounded-r-lg hover:bg-gray-50"
              aria-label="Scroll left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Tabs container with horizontal scroll */}
          <div 
            ref={tabsContainerRef}
            className="flex overflow-x-auto px-2 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onScroll={checkScrollPosition}
          >
          >
            <nav className="flex space-x-1">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap
                    transition-all duration-200 min-w-fit
                    ${activeTab === tab.id 
                      ? 'bg-purple-100 text-purple-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                  `}
                  disabled={tab.id === 'store' && !enabledTabs.store} // Disable if store not ready
                  title={tab.id === 'store' && !enabledTabs.store ? 'Coming soon!' : ''}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.id === 'store' && !enabledTabs.store && (
                    <span className="ml-1 px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full text-xs">
                      Soon
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Right scroll button */}
          {canScrollRight && (
            <button
              onClick={() => scrollTabs('right')}
              className="absolute right-0 z-10 p-2 bg-white shadow-md rounded-l-lg hover:bg-gray-50"
              aria-label="Scroll right"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden border-b">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentTab?.icon}</span>
            <span className="font-medium">{currentTab?.label}</span>
          </div>
          <svg 
            className={`w-5 h-5 transition-transform ${showMobileMenu ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Mobile dropdown menu */}
        {showMobileMenu && (
          <div className="absolute z-50 left-0 right-0 bg-white shadow-lg rounded-b-lg border-t">
            <nav className="py-2">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  disabled={tab.id === 'store' && !enabledTabs.store}
                  className={`
                    w-full px-4 py-3 flex items-center gap-3
                    ${activeTab === tab.id 
                      ? 'bg-purple-50 text-purple-700' 
                      : 'text-gray-700 hover:bg-gray-50'}
                    ${tab.id === 'store' && !enabledTabs.store ? 'opacity-50' : ''}
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="flex-1 text-left">{tab.label}</span>
                  {tab.id === 'store' && !enabledTabs.store && (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full text-xs">
                      Coming Soon
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
      
      {/* Tab Content */}
      <div className="p-4 sm:p-6">
        {activeTab === 'basic' && <BusinessBasicTab businessId={businessId} />}
        {activeTab === 'contact' && <BusinessContactTab businessId={businessId} />}
        {activeTab === 'hours' && <BusinessHoursTab businessId={businessId} />}
        {activeTab === 'services' && <BusinessServicesTab businessId={businessId} />}
        {activeTab === 'store' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-xl font-semibold mb-2">Store Coming Soon!</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              We're working on bringing you an amazing store feature where you can showcase and sell your products. 
              Stay tuned!
            </p>
          </div>
        )}
        {activeTab === 'gallery' && <BusinessGalleryTab businessId={businessId} />}
        {activeTab === 'social' && <BusinessSocialTab businessId={businessId} />}
        {activeTab === 'settings' && (
          <BusinessSettingsTab 
            businessId={businessId} 
            enabledTabs={enabledTabs}
            onUpdateTabs={updateTabConfig}
          />
        )}
      </div>
    </div>
  );
}
