// app/(protected)/calendar-dashboard/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AgendaItem {
  type: 'event' | 'todo' | 'reminder'
  id: string
  title: string
  datetime: string
  location?: string
  completed?: boolean
  priority?: string
}

interface Stats {
  events_today: number
  todos_pending: number
  reminders_upcoming: number
  unread_notifications: number
}

export default function CalendarDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [todayAgenda, setTodayAgenda] = useState<AgendaItem[]>([])
  const [stats, setStats] = useState<Stats>({
    events_today: 0,
    todos_pending: 0,
    reminders_upcoming: 0,
    unread_notifications: 0
  })
  const [userName, setUserName] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadDashboard()
    
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    // Subscribe to real-time updates
    const todosChannel = supabase
      .channel('dashboard-todos')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todos' },
        () => loadDashboard()
      )
      .subscribe()

    const remindersChannel = supabase
      .channel('dashboard-reminders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reminders' },
        () => loadDashboard()
      )
      .subscribe()

    const eventsChannel = supabase
      .channel('dashboard-events')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' },
        () => loadDashboard()
      )
      .subscribe()

    return () => {
      clearInterval(timer)
      todosChannel.unsubscribe()
      remindersChannel.unsubscribe()
      eventsChannel.unsubscribe()
    }
  }, [])

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      setUserName(profile.display_name || 'there')
    }

    // Load today's agenda
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get events
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('created_by', user.id)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .neq('status', 'cancelled')
      .order('start_time')

    // Get todos
    const { data: todos } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString())
      .order('due_date')

    // Get reminders
    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .gte('reminder_time', today.toISOString())
      .lt('reminder_time', tomorrow.toISOString())
      .order('reminder_time')

    // Combine into agenda
    const agenda: AgendaItem[] = []
    
    events?.forEach(event => {
      agenda.push({
        type: 'event',
        id: event.id,
        title: event.title,
        datetime: event.start_time,
        location: event.location
      })
    })

    todos?.forEach(todo => {
      agenda.push({
        type: 'todo',
        id: todo.id,
        title: todo.title,
        datetime: todo.due_date,
        completed: todo.completed,
        priority: todo.priority
      })
    })

    reminders?.forEach(reminder => {
      agenda.push({
        type: 'reminder',
        id: reminder.id,
        title: reminder.title,
        datetime: reminder.reminder_time,
        completed: reminder.completed
      })
    })

    // Sort by time
    agenda.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    setTodayAgenda(agenda)

    // Calculate stats
    const { data: allTodos } = await supabase
      .from('todos')
      .select('id')
      .eq('user_id', user.id)
      .eq('completed', false)

    const { data: upcomingReminders } = await supabase
      .from('reminders')
      .select('id')
      .eq('user_id', user.id)
      .eq('completed', false)
      .gte('reminder_time', new Date().toISOString())
      .lte('reminder_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())

    const { data: notifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_read', false)

    setStats({
      events_today: events?.length || 0,
      todos_pending: allTodos?.length || 0,
      reminders_upcoming: upcomingReminders?.length || 0,
      unread_notifications: notifications?.length || 0
    })

    setLoading(false)
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'event': return '📅'
      case 'todo': return '✅'
      case 'reminder': return '🔔'
      default: return '📌'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const formatTime = (datetime: string) => {
    const date = new Date(datetime)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getGreeting()}, {userName}
              </h1>
              <p className="text-gray-600 text-sm">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <Link href="/notifications" className="relative p-2">
              <span className="text-2xl">🔔</span>
              {stats.unread_notifications > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {stats.unread_notifications}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <Link href="/events" className="bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-2xl font-bold text-purple-600">{stats.events_today}</div>
            <div className="text-xs text-gray-600">Events Today</div>
          </Link>
          
          <Link href="/todos" className="bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-green-600">{stats.todos_pending}</div>
            <div className="text-xs text-gray-600">Pending Todos</div>
          </Link>
          
          <Link href="/reminders" className="bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform">
            <div className="text-3xl mb-2">🔔</div>
            <div className="text-2xl font-bold text-orange-600">{stats.reminders_upcoming}</div>
            <div className="text-xs text-gray-600">Reminders</div>
          </Link>
        </div>
      </div>

      {/* Today's Agenda */}
      <div className="px-4">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Today's Agenda</h2>
          </div>
          
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {todayAgenda.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🌟</div>
                <p className="text-gray-600">Your day is clear!</p>
                <p className="text-gray-500 text-sm mt-1">No scheduled items for today</p>
              </div>
            ) : (
              todayAgenda.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={`/${item.type}s`}
                  className="flex items-center p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="text-2xl mr-3">{getItemIcon(item.type)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.title}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">
                        {formatTime(item.datetime)}
                      </span>
                      {item.location && (
                        <span className="text-sm text-gray-500">
                          📍 {item.location}
                        </span>
                      )}
                      {item.priority && (
                        <span className={`text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-gray-400">
                    →
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 mt-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/todos?action=new" className="bg-green-500 text-white rounded-xl p-4 text-center active:scale-95 transition-transform">
            <div className="text-2xl mb-1">➕</div>
            <div className="text-sm font-medium">Add Todo</div>
          </Link>
          
          <Link href="/events?action=new" className="bg-purple-500 text-white rounded-xl p-4 text-center active:scale-95 transition-transform">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-sm font-medium">Create Event</div>
          </Link>
          
          <Link href="/reminders?action=new" className="bg-orange-500 text-white rounded-xl p-4 text-center active:scale-95 transition-transform">
            <div className="text-2xl mb-1">⏰</div>
            <div className="text-sm font-medium">Set Reminder</div>
          </Link>
          
          <Link href="/feed" className="bg-pink-500 text-white rounded-xl p-4 text-center active:scale-95 transition-transform">
            <div className="text-2xl mb-1">🌟</div>
            <div className="text-sm font-medium">What's Happening</div>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 py-2">
          <Link href="/calendar-dashboard" className="flex flex-col items-center py-2 text-purple-600">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">Hub</span>
          </Link>
          <Link href="/calendar" className="flex flex-col items-center py-2 text-gray-600">
            <span className="text-xl">📅</span>
            <span className="text-xs mt-1">Calendar</span>
          </Link>
          <Link href="/todos" className="flex flex-col items-center py-2 text-gray-600">
            <span className="text-xl">✅</span>
            <span className="text-xs mt-1">Todos</span>
          </Link>
          <Link href="/feed" className="flex flex-col items-center py-2 text-gray-600">
            <span className="text-xl">🌟</span>
            <span className="text-xs mt-1">Feed</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center py-2 text-gray-600">
            <span className="text-xl">👤</span>
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
