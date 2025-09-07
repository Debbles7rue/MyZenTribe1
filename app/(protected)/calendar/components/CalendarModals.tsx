// Replace the Quick Add Modal section in your CalendarModals.tsx file with this:

{/* Quick Add Modal (Reminder/Todo) */}
{quickModalOpen && (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => {
          setQuickModalOpen(false);
          setQuickModalForm({
            title: '',
            description: '',
            date: '',
            time: '',
            enableNotification: true,
            notificationMinutes: 10
          });
        }} 
      />
      <div 
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add {quickModalType === 'reminder' ? 'Reminder' : 'To-do'}
          </h2>
          <button
            onClick={() => {
              setQuickModalOpen(false);
              setQuickModalForm({
                title: '',
                description: '',
                date: '',
                time: '',
                enableNotification: true,
                notificationMinutes: 10
              });
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={quickModalForm.title}
                onChange={(e) => setQuickModalForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder={`${quickModalType === 'reminder' ? 'Reminder' : 'To-do'} title`}
                autoFocus // Add autofocus for better UX
                onKeyDown={(e) => {
                  // Prevent Enter from submitting/closing unless field is empty
                  if (e.key === 'Enter' && quickModalForm.title.trim() === '') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={quickModalForm.description}
                onChange={(e) => setQuickModalForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                rows={2}
                placeholder="Optional description"
                onKeyDown={(e) => {
                  // Allow Enter in textarea for line breaks
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                  }
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={quickModalForm.date}
                  onChange={(e) => setQuickModalForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={quickModalForm.time}
                  onChange={(e) => setQuickModalForm(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              </div>
            </div>
            
            {quickModalType === 'reminder' && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enable-notification"
                  checked={quickModalForm.enableNotification}
                  onChange={(e) => setQuickModalForm(prev => ({ ...prev, enableNotification: e.target.checked }))}
                  className="cursor-pointer"
                />
                <label htmlFor="enable-notification" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  Send notification {quickModalForm.notificationMinutes} minutes before
                </label>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={createQuickItem}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Create {quickModalType === 'reminder' ? 'Reminder' : 'To-do'}
              </button>
              <button
                onClick={() => {
                  setQuickModalOpen(false);
                  setQuickModalForm({
                    title: '',
                    description: '',
                    date: '',
                    time: '',
                    enableNotification: true,
                    notificationMinutes: 10
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
