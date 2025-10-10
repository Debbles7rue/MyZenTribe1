// components/NotificationListener.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import HolidayCelebrationPopup from "@/components/HolidayCelebrationPopup";
import { useRouter } from "next/navigation";

interface HolidayNotification {
  id: string;
  holiday_name: string;
  holiday_emoji: string;
  holiday_date: string;
  from_user_name: string;
  from_user_avatar?: string;
  event_id: string;
}

export default function NotificationListener() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<HolidayNotification | null>(null);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    // Subscribe to real-time notifications for this user
    const channel = supabase
      .channel(`user-notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        async (payload) => {
          const notification = payload.new;
          
          // Check if it's a holiday share notification
          if (notification.type === 'holiday_share' && notification.metadata) {
            const metadata = notification.metadata as any;
            
            // Show celebration popup
            setCelebrationData({
              id: notification.id,
              holiday_name: metadata.holiday_name || 'Holiday',
              holiday_emoji: metadata.holiday_emoji || '🎉',
              holiday_date: metadata.holiday_date || '',
              from_user_name: metadata.from_user_name || 'A friend',
              from_user_avatar: metadata.from_user_avatar,
              event_id: metadata.event_id
            });
            setShowCelebration(true);

            // Mark notification as read after showing
            setTimeout(async () => {
              await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('id', notification.id);
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleCelebrate = () => {
    if (celebrationData?.event_id) {
      // Navigate to event creator with pre-filled holiday data
      router.push(`/create-event?celebrate=${celebrationData.event_id}`);
    }
    setShowCelebration(false);
  };

  const handleClose = () => {
    setShowCelebration(false);
    setCelebrationData(null);
  };

  if (!celebrationData) return null;

  return (
    <HolidayCelebrationPopup
      isOpen={showCelebration}
      onClose={handleClose}
      holiday={{
        title: `${celebrationData.holiday_emoji} ${celebrationData.holiday_name}`,
        date: celebrationData.holiday_date,
        emoji: celebrationData.holiday_emoji
      }}
      fromFriend={{
        name: celebrationData.from_user_name,
        avatar: celebrationData.from_user_avatar
      }}
      onCelebrate={handleCelebrate}
    />
  );
}
