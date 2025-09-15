// components/business/BusinessTabs.tsx
'use client';

import BusinessBasicTab from './tabs/BusinessBasicTab';
import BusinessContactTab from './tabs/BusinessContactTab';
import BusinessHoursTab from './tabs/BusinessHoursTab';
import BusinessGalleryTab from './tabs/BusinessGalleryTab';
import BusinessSocialTab from './tabs/BusinessSocialTab';
import BusinessServicesTab from './tabs/BusinessServicesTab';
import BusinessSettingsTab from './tabs/BusinessSettingsTab';

const tabs = [
  { id: 'basic', label: 'Basic Info', icon: '📝' },
  { id: 'contact', label: 'Contact', icon: '📞' },
  { id: 'hours', label: 'Hours', icon: '🕐' },
  { id: 'services', label: 'Services', icon: '💼' },
  { id: 'gallery', label: 'Gallery', icon: '📸' },
  { id: 'social', label: 'Social', icon: '🔗' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

interface Props {
  businessId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BusinessTabs({ businessId, activeTab, setActiveTab }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b">
        <nav className="flex space-x-1 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                ${activeTab === tab.id 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'text-gray-600 hover:bg-gray-100'}
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      
      <div className="p-6">
        {activeTab === 'basic' && <BusinessBasicTab businessId={businessId} />}
        {activeTab === 'contact' && <BusinessContactTab businessId={businessId} />}
        {activeTab === 'hours' && <BusinessHoursTab businessId={businessId} />}
        {activeTab === 'services' && <BusinessServicesTab businessId={businessId} />}
        {activeTab === 'gallery' && <BusinessGalleryTab businessId={businessId} />}
        {activeTab === 'social' && <BusinessSocialTab businessId={businessId} />}
        {activeTab === 'settings' && <BusinessSettingsTab businessId={businessId} />}
      </div>
    </div>
  );
}
