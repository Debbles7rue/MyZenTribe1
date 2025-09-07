// app/(protected)/calendar/components/PhotoMemories.tsx

import React, { useState, useEffect } from 'react';

interface PhotoMemoriesProps {
  date: Date;
  onClose: () => void;
  userId: string | null;
}

interface Memory {
  id: string;
  date: string;
  photoUrl: string;
  caption: string;
  eventTitle?: string;
}

export default function PhotoMemories({ date, onClose, userId }: PhotoMemoriesProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [view, setView] = useState<'year' | 'month'>('year');

  useEffect(() => {
    // Load memories from localStorage (in production, this would be from database)
    const loadMemories = () => {
      const savedMemories: Memory[] = [];
      const currentDate = new Date(date);
      
      // Get memories from same day in previous years
      for (let yearOffset = 1; yearOffset <= 5; yearOffset++) {
        const memoryDate = new Date(currentDate);
        memoryDate.setFullYear(currentDate.getFullYear() - yearOffset);
        
        const memoryKey = `memory-${memoryDate.toDateString()}`;
        const savedMemory = localStorage.getItem(memoryKey);
        
        if (savedMemory) {
          savedMemories.push(JSON.parse(savedMemory));
        }
      }
      
      // Mock data for demo
      if (savedMemories.length === 0) {
        savedMemories.push({
          id: '1',
          date: new Date(date.getFullYear() - 1, date.getMonth(), date.getDate()).toISOString(),
          photoUrl: `https://picsum.photos/400/300?random=${date.getDate()}`,
          caption: 'A wonderful memory from last year',
          eventTitle: 'Birthday Celebration'
        });
      }
      
      setMemories(savedMemories);
    };
    
    loadMemories();
  }, [date]);

  const getTimeAgo = (memoryDate: string) => {
    const memory = new Date(memoryDate);
    const years = date.getFullYear() - memory.getFullYear();
    
    if (years === 1) return '1 year ago';
    if (years > 1) return `${years} years ago`;
    
    const months = date.getMonth() - memory.getMonth();
    if (months === 1) return '1 month ago';
    if (months > 1) return `${months} months ago`;
    
    return 'Recently';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Photo Memories
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - Through the years
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {memories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No memories yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Start creating memories today! Photos from future events on this day will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  onClick={() => setSelectedMemory(memory)}
                  className="group cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                    <img
                      src={memory.photoUrl}
                      alt={memory.caption}
                      className="w-full h-48 object-cover transform group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent 
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform translate-y-full 
                                  group-hover:translate-y-0 transition-transform duration-300">
                      <div className="text-xs font-medium">{getTimeAgo(memory.date)}</div>
                      <div className="text-sm mt-1">{memory.caption}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Memory Detail Modal */}
        {selectedMemory && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/80" 
              onClick={() => setSelectedMemory(null)} 
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full">
              <button
                onClick={() => setSelectedMemory(null)}
                className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full 
                         hover:bg-white dark:hover:bg-gray-700 transition-colors z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <img
                src={selectedMemory.photoUrl}
                alt={selectedMemory.caption}
                className="w-full h-96 object-cover rounded-t-xl"
              />
              
              <div className="p-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {getTimeAgo(selectedMemory.date)} • {new Date(selectedMemory.date).toLocaleDateString()}
                </div>
                {selectedMemory.eventTitle && (
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedMemory.eventTitle}
                  </h3>
                )}
                <p className="text-gray-700 dark:text-gray-300">
                  {selectedMemory.caption}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
