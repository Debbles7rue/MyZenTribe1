// components/business/tabs/BusinessHoursTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface Hours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const defaultHours: Hours = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '10:00', close: '14:00', closed: false },
  sunday: { open: '', close: '', closed: true },
};

const dayLabels = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function BusinessHoursTab({ businessId }: { businessId: string }) {
  const [hours, setHours] = useState<Hours>(defaultHours);
  const [specialDates, setSpecialDates] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('hours, special_hours')
        .eq('id', businessId)
        .single();
      
      if (biz?.hours) {
        setHours(biz.hours as Hours);
      }
      if (biz?.special_hours) {
        setSpecialDates(biz.special_hours);
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
      .update({ 
        hours,
        special_hours: specialDates 
      })
      .eq('id', businessId);
    
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Hours saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  function updateDay(day: keyof Hours, field: keyof DayHours | 'closed', value: string | boolean) {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  }

  function copyToAll(day: keyof Hours) {
    const dayHours = hours[day];
    const newHours = { ...hours };
    Object.keys(newHours).forEach(d => {
      newHours[d as keyof Hours] = { ...dayHours };
    });
    setHours(newHours);
  }

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Business Hours</h2>
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <p className="text-sm text-purple-700 mb-3">Quick Set:</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const newHours = { ...defaultHours };
              Object.keys(newHours).forEach(day => {
                if (day !== 'sunday') {
                  newHours[day as keyof Hours] = { open: '09:00', close: '17:00', closed: false };
                }
              });
              setHours(newHours);
            }}
            className="px-3 py-2 bg-white text-purple-600 border border-purple-300 rounded-lg text-sm hover:bg-purple-50 min-h-[40px]"
          >
            Mon-Fri 9-5
          </button>
          <button
            type="button"
            onClick={() => {
              const newHours = { ...hours };
              Object.keys(newHours).forEach(day => {
                newHours[day as keyof Hours] = { open: '', close: '', closed: false };
              });
              setHours(newHours);
            }}
            className="px-3 py-2 bg-white text-purple-600 border border-purple-300 rounded-lg text-sm hover:bg-purple-50 min-h-[40px]"
          >
            24/7
          </button>
        </div>
      </div>

      {/* Hours Grid - Mobile Optimized */}
      <div className="space-y-3">
        {(Object.keys(hours) as Array<keyof Hours>).map(day => (
          <div key={day} className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Day Label & Closed Toggle */}
              <div className="flex items-center justify-between sm:justify-start sm:w-32">
                <span className="font-medium text-gray-700">{dayLabels[day]}</span>
                <label className="flex items-center gap-2 sm:hidden">
                  <input
                    type="checkbox"
                    checked={hours[day].closed}
                    onChange={(e) => updateDay(day, 'closed', e.target.checked)}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span className="text-sm text-gray-600">Closed</span>
                </label>
              </div>

              {/* Time Inputs */}
              {!hours[day].closed ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={hours[day].open}
                    onChange={(e) => updateDay(day, 'open', e.target.value)}
                    className="flex-1 px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    style={{ fontSize: '16px' }}
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={hours[day].close}
                    onChange={(e) => updateDay(day, 'close', e.target.value)}
                    className="flex-1 px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              ) : (
                <div className="flex-1 text-gray-500 italic">Closed</div>
              )}

              {/* Desktop Closed Toggle & Copy */}
              <div className="hidden sm:flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hours[day].closed}
                    onChange={(e) => updateDay(day, 'closed', e.target.checked)}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span className="text-sm text-gray-600">Closed</span>
                </label>
                <button
                  type="button"
                  onClick={() => copyToAll(day)}
                  className="text-xs text-purple-600 hover:underline"
                  title="Copy to all days"
                >
                  Copy to all
                </button>
              </div>

              {/* Mobile Copy Button */}
              <button
                type="button"
                onClick={() => copyToAll(day)}
                className="sm:hidden text-sm text-purple-600 hover:underline self-end"
              >
                Copy to all days
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Special Hours/Dates */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Special Hours / Holidays
        </label>
        <textarea
          className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          rows={3}
          value={specialDates}
          onChange={(e) => setSpecialDates(e.target.value)}
          placeholder="e.g., Closed Dec 25-26 for holidays&#10;Extended hours Dec 23: 9am-8pm"
          style={{ fontSize: '16px' }}
        />
        <p className="text-xs text-gray-500 mt-1">List any special hours or closures</p>
      </div>

      {/* Save Button */}
      <div className="flex justify-center sm:justify-end pt-4 border-t">
        <button
          onClick={save}
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-base touch-manipulation min-h-[48px]"
        >
          {saving ? 'Saving...' : 'Save Hours'}
        </button>
      </div>
    </div>
  );
}
