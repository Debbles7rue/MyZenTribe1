// Replace the Quick Add Modal section in your CalendarModals.tsx with this version
// This maintains the Modal wrapper structure like your other modals

{/* Quick Add Modal (Reminder/Todo) */}
<Modal 
  isOpen={quickModalOpen} 
  onClose={() => {
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
  title={`Add ${quickModalType === 'reminder' ? 'Reminder' : 'To-do'}`}
>
  <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
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
        autoFocus
        onKeyDown={(e) => {
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
</Modal>
