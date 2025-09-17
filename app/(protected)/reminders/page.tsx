// app/(protected)/reminders/page.tsx
"use client"

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Clock, 
  Bell, 
  MapPin, 
  Calendar, 
  Repeat, 
  ChevronDown,
  ChevronRight,
  Zap,
  Droplets,
  Pill,
  Coffee,
  Heart,
  Home,
  Briefcase,
  Car,
  ShoppingBag,
  Dumbbell,
  Book,
  Phone,
  Mail,
  Users,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus
} from 'lucide-react'

// Create Supabase client directly in this file
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Reminder {
  id: string
  title: string
  description?: string
  reminder_time: string
  repeat_pattern?: string
  location?: string
  location_trigger?: 'arrival' | 'departure'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  tags?: string[]
  completed: boolean
  snoozed_until?: string
  notification_settings?: any
  created_at: string
  updated_at: string
}

// Quick templates for common reminders
const REMINDER_TEMPLATES = [
  { icon: Droplets, label: 'Drink Water', title: 'Drink water', repeat: 'every 2 hours', category: 'health', color: 'bg-blue-500' },
  { icon: Pill, label: 'Medication', title: 'Take medication', repeat: 'daily', category: 'health', color: 'bg-red-500' },
  { icon: Dumbbell, label: 'Exercise', title: 'Exercise time', repeat: 'daily', category: 'fitness', color: 'bg-green-500' },
  { icon: Coffee, label: 'Break', title: 'Take a break', repeat: 'every 4 hours', category: 'wellness', color: 'bg-yellow-500' },
  { icon: Heart, label: 'Call Family', title: 'Call family', repeat: 'weekly', category: 'personal', color: 'bg-pink-500' },
  { icon: Book, label: 'Reading', title: 'Reading time', repeat: 'daily', category: 'personal', color: 'bg-purple-500' },
]

// Time-based gradient colors
const getTimeGradient = (time: string) => {
  const hour = new Date(time).getHours()
  if (hour >= 5 && hour < 12) return 'from-orange-100 to-yellow-100' // Morning
  if (hour >= 12 && hour < 17) return 'from-blue-100 to-cyan-100' // Afternoon
  if (hour >= 17 && hour < 21) return 'from-purple-100 to-pink-100' // Evening
  return 'from-indigo-100 to-purple-100' // Night
}

// Icon mapping for categories
const getCategoryIcon = (category?: string) => {
  const iconMap: Record<string, any> = {
    health: Heart,
    fitness: Dumbbell,
    work: Briefcase,
    personal: Star,
    home: Home,
    shopping: ShoppingBag,
    travel: Car,
    social: Users,
    education: Book,
    communication: Phone,
  }
  return iconMap[category || ''] || Bell
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('today')
  const [groupBy, setGroupBy] = useState<'none' | 'time' | 'category' | 'priority'>('time')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const dragItem = useRef<Reminder | null>(null)
  const dragOverItem = useRef<Reminder | null>(null)
  
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    reminder_time: '',
    repeat_pattern: '',
    location: '',
    location_trigger: 'arrival' as 'arrival' | 'departure',
    priority: 'medium' as Reminder['priority'],
    category: '',
    tags: [] as string[],
  })

  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    upcoming: 0,
    completed: 0,
    snoozed: 0,
    overdue: 0,
  })

  // Animation states
  const [animatingReminder, setAnimatingReminder] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Load reminders
  useEffect(() => {
    loadReminders()
    
    // Subscribe to real-time changes
    const subscription = supabase
      .channel('reminders-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reminders' },
        () => loadReminders()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Check for due reminders every minute
  useEffect(() => {
    const interval = setInterval(() => {
      checkDueReminders()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [reminders])

  const loadReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('reminder_time', { ascending: true })

    if (!error && data) {
      setReminders(data)
      calculateStats(data)
    }
    setLoading(false)
  }

  const calculateStats = (remindersList: Reminder[]) => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    setStats({
      total: remindersList.length,
      today: remindersList.filter(r => {
        const time = new Date(r.reminder_time)
        return time >= today && time < tomorrow && !r.completed
      }).length,
      upcoming: remindersList.filter(r => {
        const time = new Date(r.reminder_time)
        return time >= tomorrow && !r.completed
      }).length,
      completed: remindersList.filter(r => r.completed).length,
      snoozed: remindersList.filter(r => r.snoozed_until && new Date(r.snoozed_until) > now).length,
      overdue: remindersList.filter(r => 
        !r.completed && new Date(r.reminder_time) < now && !r.snoozed_until
      ).length,
    })
  }

  const checkDueReminders = () => {
    const now = new Date()
    reminders.forEach(reminder => {
      const reminderTime = new Date(reminder.reminder_time)
      const timeDiff = Math.abs(reminderTime.getTime() - now.getTime())
      
      // If within 1 minute of reminder time
      if (timeDiff < 60000 && !reminder.completed && !reminder.snoozed_until) {
        showNotification(reminder)
      }
    })
  }

  const showNotification = (reminder: Reminder) => {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = getCategoryIcon(reminder.category)
      new Notification(`Reminder: ${reminder.title}`, {
        body: reminder.description || 'Time for your reminder!',
        icon: '/icon.png',
        tag: reminder.id,
      })
    }

    // Visual notification
    setAnimatingReminder(reminder.id)
    setTimeout(() => setAnimatingReminder(null), 3000)
  }

  const toggleComplete = async (reminder: Reminder) => {
    setAnimatingReminder(reminder.id)
    
    const { error } = await supabase
      .from('reminders')
      .update({ 
        completed: !reminder.completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', reminder.id)

    if (!error) {
      if (!reminder.completed) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2000)
      }
      await loadReminders()
    }
    
    setTimeout(() => setAnimatingReminder(null), 500)
  }

  const snoozeReminder = async (reminder: Reminder, minutes: number) => {
    const snoozeUntil = new Date()
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes)

    const { error } = await supabase
      .from('reminders')
      .update({ 
        snoozed_until: snoozeUntil.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', reminder.id)

    if (!error) {
      await loadReminders()
    }
  }

  const addReminder = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        ...newReminder,
        reminder_time: newReminder.reminder_time || new Date().toISOString(),
      })

    if (!error) {
      await loadReminders()
      setShowAddForm(false)
      resetForm()
      setSelectedTemplate(null)
    }
  }

  const deleteReminder = async (id: string) => {
    setAnimatingReminder(id)
    
    setTimeout(async () => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id)

      if (!error) {
        await loadReminders()
      }
    }, 300)
  }

  const applyTemplate = (template: any) => {
    setSelectedTemplate(template)
    setNewReminder({
      ...newReminder,
      title: template.title,
      repeat_pattern: template.repeat,
      category: template.category,
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setNewReminder({
      title: '',
      description: '',
      reminder_time: '',
      repeat_pattern: '',
      location: '',
      location_trigger: 'arrival',
      priority: 'medium',
      category: '',
      tags: [],
    })
  }

  const handleDragStart = (reminder: Reminder) => {
    dragItem.current = reminder
  }

  const handleDragEnter = (reminder: Reminder) => {
    dragOverItem.current = reminder
  }

  const handleDragEnd = async () => {
    if (dragItem.current && dragOverItem.current && dragItem.current.id !== dragOverItem.current.id) {
      const draggedReminder = dragItem.current
      const targetReminder = dragOverItem.current
      
      // Swap times
      await supabase
        .from('reminders')
        .update({ 
          reminder_time: targetReminder.reminder_time,
          updated_at: new Date().toISOString()
        })
        .eq('id', draggedReminder.id)

      await supabase
        .from('reminders')
        .update({ 
          reminder_time: draggedReminder.reminder_time,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetReminder.id)

      await loadReminders()
    }
    
    dragItem.current = null
    dragOverItem.current = null
  }

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName)
    } else {
      newExpanded.add(groupName)
    }
    setExpandedGroups(newExpanded)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-purple-600 bg-purple-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getFilteredReminders = () => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    switch (filter) {
      case 'today':
        return reminders.filter(r => {
          const time = new Date(r.reminder_time)
          return time >= today && time < tomorrow
        })
      case 'upcoming':
        return reminders.filter(r => {
          const time = new Date(r.reminder_time)
          return time >= tomorrow && !r.completed
        })
      case 'completed':
        return reminders.filter(r => r.completed)
      default:
        return reminders
    }
  }

  const getGroupedReminders = () => {
    const filtered = getFilteredReminders()
    
    if (groupBy === 'none') {
      return { 'All Reminders': filtered }
    }

    const groups: Record<string, Reminder[]> = {}
    
    filtered.forEach(reminder => {
      let groupName = ''
      
      switch (groupBy) {
        case 'time':
          const hour = new Date(reminder.reminder_time).getHours()
          if (hour >= 5 && hour < 12) groupName = 'Morning'
          else if (hour >= 12 && hour < 17) groupName = 'Afternoon'
          else if (hour >= 17 && hour < 21) groupName = 'Evening'
          else groupName = 'Night'
          break
        case 'category':
          groupName = reminder.category || 'Uncategorized'
          break
        case 'priority':
          groupName = reminder.priority.charAt(0).toUpperCase() + reminder.priority.slice(1)
          break
      }
      
      if (!groups[groupName]) groups[groupName] = []
      groups[groupName].push(reminder)
    })
    
    return groups
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const groupedReminders = getGroupedReminders()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-100 to-pink-50 p-4">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-6xl animate-bounce">🎉</div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                My Reminders
              </h1>
              <p className="text-gray-600 mt-1">Never forget what matters most</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Reminder
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
              <div className="text-sm text-blue-800">Today</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.upcoming}</div>
              <div className="text-sm text-purple-800">Upcoming</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-green-800">Completed</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.snoozed}</div>
              <div className="text-sm text-yellow-800">Snoozed</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-red-800">Overdue</div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
              <div className="text-sm text-indigo-800">Total</div>
            </div>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Templates</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {REMINDER_TEMPLATES.map((template, index) => (
              <button
                key={index}
                onClick={() => applyTemplate(template)}
                className="flex flex-col items-center p-3 rounded-lg hover:shadow-md transition-all transform hover:scale-105 bg-gradient-to-br from-white to-gray-50"
              >
                <div className={`w-10 h-10 rounded-full ${template.color} flex items-center justify-center mb-2`}>
                  <template.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-gray-700">{template.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 animate-slideDown">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              {selectedTemplate ? `New ${selectedTemplate.label}` : 'New Reminder'}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="What should I remind you about?"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="datetime-local"
                  value={newReminder.reminder_time}
                  onChange={(e) => setNewReminder({...newReminder, reminder_time: e.target.value})}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <textarea
                placeholder="Description (optional)"
                value={newReminder.description}
                onChange={(e) => setNewReminder({...newReminder, description: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
              />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={newReminder.priority}
                  onChange={(e) => setNewReminder({...newReminder, priority: e.target.value as Reminder['priority']})}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>

                <input
                  type="text"
                  placeholder="Repeat pattern (e.g., daily)"
                  value={newReminder.repeat_pattern}
                  onChange={(e) => setNewReminder({...newReminder, repeat_pattern: e.target.value})}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Category"
                  value={newReminder.category}
                  onChange={(e) => setNewReminder({...newReminder, category: e.target.value})}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                <button
                  onClick={addReminder}
                  disabled={!newReminder.title}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Add Reminder
                </button>
              </div>

              {/* Location-based reminder */}
              <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                <MapPin className="w-5 h-5 text-purple-600" />
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={newReminder.location}
                  onChange={(e) => setNewReminder({...newReminder, location: e.target.value})}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <select
                  value={newReminder.location_trigger}
                  onChange={(e) => setNewReminder({...newReminder, location_trigger: e.target.value as 'arrival' | 'departure'})}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="arrival">On Arrival</option>
                  <option value="departure">On Departure</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Controls Bar */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'today' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'
              }`}
            >
              Today ({stats.today})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'upcoming' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'
              }`}
            >
              Upcoming ({stats.upcoming})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'completed' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'
              }`}
            >
              Completed ({stats.completed})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'
              }`}
            >
              All ({stats.total})
            </button>
          </div>

          {/* Group By */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="none">No Grouping</option>
            <option value="time">Group by Time</option>
            <option value="category">Group by Category</option>
            <option value="priority">Group by Priority</option>
          </select>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {Object.entries(groupedReminders).map(([groupName, groupReminders]) => (
            <div key={groupName} className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {groupBy !== 'none' && (
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between hover:from-purple-100 hover:to-pink-100 transition-colors"
                >
                  <span className="font-semibold text-purple-700">{groupName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{groupReminders.length} reminders</span>
                    {expandedGroups.has(groupName) ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>
              )}
              
              {(groupBy === 'none' || expandedGroups.has(groupName)) && (
                <div className="p-4 space-y-3">
                  {groupReminders.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No reminders in this group</p>
                    </div>
                  ) : (
                    groupReminders.map(reminder => {
                      const Icon = getCategoryIcon(reminder.category)
                      const isAnimating = animatingReminder === reminder.id
                      const isSnoozed = reminder.snoozed_until && new Date(reminder.snoozed_until) > new Date()
                      
                      return (
                        <div
                          key={reminder.id}
                          draggable
                          onDragStart={() => handleDragStart(reminder)}
                          onDragEnter={() => handleDragEnter(reminder)}
                          onDragEnd={handleDragEnd}
                          className={`
                            bg-gradient-to-r ${getTimeGradient(reminder.reminder_time)} 
                            rounded-xl p-4 transition-all cursor-move
                            ${reminder.completed ? 'opacity-60' : ''}
                            ${isAnimating ? 'animate-pulse scale-105' : ''}
                            ${isSnoozed ? 'border-2 border-yellow-300' : ''}
                            hover:shadow-lg hover:scale-[1.02]
                          `}
                        >
                          <div className="flex items-start gap-4">
                            <button
                              onClick={() => toggleComplete(reminder)}
                              className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                reminder.completed
                                  ? 'bg-purple-500 border-purple-500 text-white'
                                  : 'border-gray-400 hover:border-purple-500'
                              }`}
                            >
                              {reminder.completed && <CheckCircle className="w-4 h-4" />}
                            </button>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Icon className="w-4 h-4 text-purple-600" />
                                    <h3 className={`font-semibold text-lg ${reminder.completed ? 'line-through text-gray-500' : ''}`}>
                                      {reminder.title}
                                    </h3>
                                  </div>
                                  
                                  {reminder.description && (
                                    <p className="text-gray-600 text-sm mb-2">{reminder.description}</p>
                                  )}
                                  
                                  <div className="flex flex-wrap gap-2">
                                    <span className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-full text-xs">
                                      <Clock className="w-3 h-3" />
                                      {new Date(reminder.reminder_time).toLocaleString()}
                                    </span>
                                    
                                    {reminder.repeat_pattern && (
                                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full text-xs text-blue-700">
                                        <Repeat className="w-3 h-3" />
                                        {reminder.repeat_pattern}
                                      </span>
                                    )}
                                    
                                    {reminder.location && (
                                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full text-xs text-green-700">
                                        <MapPin className="w-3 h-3" />
                                        {reminder.location} ({reminder.location_trigger})
                                      </span>
                                    )}
                                    
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(reminder.priority)}`}>
                                      {reminder.priority}
                                    </span>
                                    
                                    {isSnoozed && (
                                      <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-full text-xs text-yellow-700">
                                        <Clock className="w-3 h-3" />
                                        Snoozed
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 ml-4">
                                  {!reminder.completed && !isSnoozed && (
                                    <div className="relative group">
                                      <button className="text-yellow-500 hover:text-yellow-700">
                                        <Clock className="w-5 h-5" />
                                      </button>
                                      <div className="absolute right-0 top-8 hidden group-hover:flex flex-col bg-white shadow-lg rounded-lg p-1 z-10">
                                        <button
                                          onClick={() => snoozeReminder(reminder, 5)}
                                          className="px-3 py-1 text-xs hover:bg-gray-100 rounded"
                                        >
                                          5 min
                                        </button>
                                        <button
                                          onClick={() => snoozeReminder(reminder, 60)}
                                          className="px-3 py-1 text-xs hover:bg-gray-100 rounded"
                                        >
                                          1 hour
                                        </button>
                                        <button
                                          onClick={() => snoozeReminder(reminder, 1440)}
                                          className="px-3 py-1 text-xs hover:bg-gray-100 rounded"
                                        >
                                          Tomorrow
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <button
                                    onClick={() => deleteReminder(reminder.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {Object.keys(groupedReminders).length === 0 || 
         Object.values(groupedReminders).every(group => group.length === 0) ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-700">No reminders yet!</h3>
            <p className="text-gray-500 mt-2">
              Add your first reminder or use a quick template to get started
            </p>
          </div>
        ) : null}
      </div>

      {/* Add custom styles */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
