// app/(protected)/calendar/components/TestMeetingCoordinator.tsx

'use client';

import { useState } from 'react';
import { MeetingAPI } from '../lib/meetingAPI';
import { useToast } from '@/components/ToastProvider';

export default function TestMeetingCoordinator({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [testing, setTesting] = useState(false);

  const testAPI = async () => {
    setTesting(true);
    
    try {
      // Test 1: Get templates
      console.log('Testing: Get templates...');
      const { data: templates, error: templateError } = await MeetingAPI.getTemplates();
      if (templateError) {
        console.error('Template error:', templateError);
        showToast('error', 'Failed to get templates');
        return;
      }
      console.log('Templates:', templates);
      showToast('success', `Found ${templates.length} templates`);

      // Test 2: Create a test meeting
      console.log('Testing: Create meeting...');
      const testMeeting = {
        title: 'Test AI Meeting',
        description: 'This is a test meeting created by AI Coordinator',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour
        created_by: userId,
        visibility: 'private',
        meeting_type: 'virtual',
        participants: [],
        ai_score: 95,
        ai_reasoning: 'Test meeting - perfect availability'
      };

      const { data: meeting, error: meetingError } = await MeetingAPI.createMeeting(testMeeting);
      if (meetingError) {
        console.error('Meeting error:', meetingError);
        showToast('error', 'Failed to create meeting');
        return;
      }
      console.log('Created meeting:', meeting);
      showToast('success', 'Test meeting created successfully!');

      // Test 3: Send a notification
      console.log('Testing: Send notification...');
      const { success, error: notifError } = await MeetingAPI.sendNotifications([
        {
          user_id: userId,
          type: 'meeting_invite',
          title: 'Test Notification',
          message: 'This is a test notification from AI Coordinator',
          metadata: { test: true }
        }
      ]);

      if (success) {
        showToast('success', 'All tests passed! 🎉');
      } else {
        console.error('Notification error:', notifError);
        showToast('warning', 'Meeting created but notification failed');
      }

    } catch (error) {
      console.error('Test failed:', error);
      showToast('error', 'Test failed - check console');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-3">Test AI Meeting Coordinator</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Click to test database connections
      </p>
      <button
        onClick={testAPI}
        disabled={testing}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Run Test'}
      </button>
    </div>
  );
}
