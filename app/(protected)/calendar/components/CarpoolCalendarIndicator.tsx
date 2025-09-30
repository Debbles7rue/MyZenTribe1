// app/(protected)/calendar/components/CarpoolCalendarIndicator.tsx

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Car, Users } from 'lucide-react';
import CarpoolManager from './CarpoolManager';
import type { DBEvent } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CarpoolCalendarIndicatorProps {
  event: DBEvent;
  userId: string | null;
  showToast?: (toast: { type: string; message: string }) => void;
  isMobile?: boolean;
  onOpenSettings?: () => void;
}

interface CarpoolSummary {
  totalGroups: number;
  activeGroups: number;
  totalParticipants: number;
  userIsParticipant: boolean;
}

const CarpoolCalendarIndicator: React.FC<CarpoolCalendarIndicatorProps> = ({
  event,
  userId,
  showToast,
  isMobile = false,
  onOpenSettings
}) => {
  const [carpoolSummary, setCarpoolSummary] = useState<CarpoolSummary | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCarpoolSummary();
  }, [event.id, userId]);

  const loadCarpoolSummary = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Get carpool groups for this event where user is a participant
      const { data: groups, error } = await supabase
        .from('carpool_groups')
        .select(`
          id,
          status,
          carpool_participants!inner (
            user_id
          )
        `)
        .eq('event_id', event.id);

      if (error) {
        console.error('Error loading carpool summary:', error);
        setLoading(false);
        return;
      }

      if (!groups || groups.length === 0) {
        setCarpoolSummary(null);
        setLoading(false);
        return;
      }

      // Filter groups where user is a participant
      const userGroups = groups.filter(group => 
        group.carpool_participants.some((p: any) => p.user_id === userId)
      );

      if (userGroups.length === 0) {
        setCarpoolSummary(null);
        setLoading(false);
        return;
      }

      // Calculate summary
      const totalGroups = userGroups.length;
      const activeGroups = userGroups.filter(g => g.status === 'active').length;
      const totalParticipants = userGroups.reduce(
        (sum, group) => sum + group.carpool_participants.length, 
        0
      );

      setCarpoolSummary({
        totalGroups,
        activeGroups,
        totalParticipants,
        userIsParticipant: true
      });
    } catch (error) {
      console.error('Error loading carpool summary:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if no carpools or still loading
  if (loading || !carpoolSummary) {
    return null;
  }

  return (
    <>
      {/* Calendar Indicator - Small overlay on event */}
      <div 
        onClick={(e) => {
          e.stopPropagation(); // Prevent event click
          setShowManager(true);
        }}
        className="absolute top-1 right-1 z-10 cursor-pointer"
        title={`${carpoolSummary.totalGroups} carpool group${carpoolSummary.totalGroups > 1 ? 's' : ''}`}
      >
        <div className="bg-blue-500 text-white rounded-full p-1 shadow-lg hover:bg-blue-600 transition-colors">
          <div className="flex items-center gap-1">
            <Car size={12} />
            {carpoolSummary.totalGroups > 1 && (
              <span className="text-xs font-bold leading-none">
                {carpoolSummary.totalGroups}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Carpool Manager Modal */}
      {showManager && (
        <CarpoolManager
          isOpen={showManager}
          onClose={() => setShowManager(false)}
          event={event}
          userId={userId}
          showToast={showToast}
          isMobile={isMobile}
          onOpenSettings={onOpenSettings}
        />
      )}
    </>
  );
};

export default CarpoolCalendarIndicator;
