// components/TimeBlockScheduler.tsx
"use client";

import React, { useState } from 'react';

interface TimeBlock {
  id: number;
  title: string;
  color: string;
  duration: number;
}

interface TimeBlockSchedulerProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (blockData: {
    title: string;
    date: string;
    time: string;
    endTime: string;
    description: string;
    color: string;
  }) => void;
  isMobile?: boolean;
  showToast?: (toast: { type: string; message: string }) => void;
}

export default function TimeBlockScheduler({
  open,
  onClose,
  onSchedule,
  isMobile = false,
  showToast
}: TimeBlockSchedulerProps) {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([
    { id: 1, title: 'Deep Work', color: '#8B5CF6', duration: 90 },
    { id: 2, title: 'Email & Admin', color: '#3B82F6', duration: 30 },
    { id: 3, title: 'Break', color: '#10B981', duration: 15 },
    { id: 4, title: 'Meeting', color: '#F59E0B', duration: 60 },
  ]);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0]);
  const [blockTime, setBlockTime] = useState('09:00');

  if (!open) return null;

  const handleCreateTimeBlock = () => {
    if (!selectedBlock || !blockDate || !blockTime) {
      showToast?.({ type: 'error', message: 'Please select a time block and set date/time' });
      return;
    }

    const startDateTime = new Date(`${blockDate}T${blockTime}`);
    const endDateTime = new Date(startDateTime.getTime() + selectedBlock.duration * 60000);

    onSchedule({
      title: selectedBlock.title,
      date: blockDate,
      time: blockTime,
      endTime: `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`,
      description: `Time blocked for ${selectedBlock.title}`,
      color: selectedBlock.color
    });

    setSelectedBlock(null);
    onClose();
  };

  const handleAddCustomBlock = () => {
    const nameInput = document.getElementById('custom-block-name') as HTMLInputElement;
    const durationInput = document.getElementById('custom-block-duration') as HTMLInputElement;
    const colorInput = document.getElementById('custom-block-color') as HTMLInputElement;

    if (nameInput?.value && durationInput?.value) {
      const newBlock: TimeBlock = {
        id: Date.now(),
        title: nameInput.value,
        duration: parseInt(durationInput.value),
        color: colorInput.value
      };
      setTimeBlocks([...timeBlocks, newBlock]);
      nameInput.value = '';
      durationInput.value = '';
      showToast?.({ type: 'success', message: 'Custom time block added!' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${
          isMobile ? 'max-w-full' : 'max-w-2xl'
        }`}>
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Time Block Scheduler
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Quick Time Blocks */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Quick Time Blocks
              </h3>
              <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
                {timeBlocks.map((block) => (
                  <button
                    key={block.id}
                    onClick={() => setSelectedBlock(block)}
                    className={`p-3 rounded-lg text-white font-medium text-sm hover:scale-105 transition-transform ${
                      selectedBlock?.id === block.id ? 'ring-2 ring-white ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: block.color }}
                  >
                    <div>{block.title}</div>
                    <div className="text-xs opacity-90">{block.duration} min</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Block Scheduling */}
            {selectedBlock && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-800 dark:text-gray-200">
                  Schedule: {selectedBlock.title}
                </h4>
                <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-3'}`}>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={blockTime}
                      onChange={(e) => setBlockTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className={`${isMobile ? 'space-y-2' : 'flex gap-2'}`}>
                  <button
                    onClick={handleCreateTimeBlock}
                    className={`${isMobile ? 'w-full' : 'flex-1'} px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 transition-colors`}
                  >
                    Add to Calendar
                  </button>
                  <button
                    onClick={() => setSelectedBlock(null)}
                    className={`${isMobile ? 'w-full' : ''} px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Custom Time Block Creation */}
            <div className="border-t dark:border-gray-700 pt-4">
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">
                Create Custom Time Block
              </h4>
              <div className="space-y-3">
                <div>
                  <input
                    id="custom-block-name"
                    type="text"
                    placeholder="Block name (e.g., Deep Focus)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-3 gap-3'}`}>
                  <input
                    id="custom-block-duration"
                    type="number"
                    placeholder="Duration (min)"
                    min="5"
                    max="480"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    id="custom-block-color"
                    type="color"
                    className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                    defaultValue="#8B5CF6"
                  />
                  <button
                    onClick={handleAddCustomBlock}
                    className={`${isMobile ? 'w-full' : ''} px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors`}
                  >
                    Add Block
                  </button>
                </div>
              </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Pro tip:</strong> Time blocking helps you protect your most important work. Block out focus time before meetings fill up your calendar!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
