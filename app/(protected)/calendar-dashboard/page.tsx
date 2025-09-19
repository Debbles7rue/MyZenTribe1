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
  type: 'event' | 'todo' | 'reminder' | 'shopping'
  id: string
  title: string
  datetime?: string
  due_date?: string
  time?: string
  location?: string
  completed?: boolean
  priority?: string
  list_type?: 'todo' | 'reminder' | 'shopping'
}

interface Stats {
  events_today: number
  todos_pending: number
  reminders_upcoming: number
  shopping_items: number
  unread_notifications: number
}

export default function CalendarDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [todayAgenda, setTodayAgenda] = useState<AgendaItem[]>([])
  const [stats, setStats] = useState<Stats>({
    events_today: 0,
    todos_pending: 0,
    reminders_upcoming: 0,
    shopping_items: 0,
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

    // Subscribe to real-time updates for todos (which now includes reminders and shopping)
    const todosChannel = supabase
      .channel('dashboard-todos')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todos' },
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
      eventsChannel.unsubscribe()
    }
  }, [])

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserName(user.email?.split('@')[0] || 'there')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Load todos, reminders, and shopping items from unified todos table
    const { data: todosData } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })
      .order('time', { ascending: true })

    // Load events (if you have an events table)
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .eq('created_by', user.id)
      .order('start_time', { ascending: true })

    // Calculate stats based on list_type
    const todosOnly = todosData?.filter(item => item.list_type === 'todo' || !item.list_type) || []
    const remindersOnly = todosData?.filter(item => item.list_type === 'reminder') || []
    const shoppingOnly = todosData?.filter(item => item.list_type === 'shopping') || []

    // Build today's agenda
    const agenda: AgendaItem[] = []
    
    // Add today's events
    if (eventsData) {
      eventsData.forEach(event => {
        agenda.push({
          type: 'event',
          id: event.id,
          title: event.title,
          datetime: event.start_time,
          location: event.location,
          completed: false
        })
      })
    }

    // Add today's todos/reminders/shopping with due dates
    if (todosData) {
      todosData
        .filter(item => {
          if (!item.due_date) return false
          const itemDate = new Date(item.due_date)
          itemDate.setHours(0, 0, 0, 0)
          return itemDate.getTime() === today.getTime()
        })
        .forEach(item => {
          agenda.push({
            type: item.list_type || 'todo',
            id: item.id,
            title: item.title,
            due_date: item.due_date,
            time: item.time,
            completed: item.completed,
            priority: item.priority,
            list_type: item.list_type
          })
        })
    }

    // Sort agenda by time
    agenda.sort((a, b) => {
      const timeA = a.datetime || (a.due_date && a.time ? `${a.due_date}T${a.time}` : a.due_date) || ''
      const timeB = b.datetime || (b.due_date && b.time ? `${b.due_date}T${b.time}` : b.due_date) || ''
      return timeA.localeCompare(timeB)
    })

    setTodayAgenda(agenda)
    
    // Update stats
    setStats({
      events_today: eventsData?.length || 0,
      todos_pending: todosOnly.filter(t => !t.completed).length,
      reminders_upcoming: remindersOnly.filter(r => !r.completed).length,
      shopping_items: shoppingOnly.filter(s => !s.completed).length,
      unread_notifications: 0 // You can implement notifications separately
    })

    setLoading(false)
  }

  const getItemIcon = (item: AgendaItem) => {
    switch (item.type) {
      case 'event': return '📅'
      case 'reminder': return '🔔'
      case 'shopping': return '🛒'
      case 'todo': 
      default: return '✅'
    }
  }

  const getItemColor = (item: AgendaItem) => {
    switch (item.type) {
      case 'event': return 'text-purple-600'
      case 'reminder': return 'text-blue-600'
      case 'shopping': return 'text-purple-600'
      case 'todo': 
      default: return 'text-green-600'
    }
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
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
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getGreeting()}, {userName}!
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          
          <Link href="/todos" className="bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform">
            <div className="text-3xl mb-2">🔔</div>
            <div className="text-2xl font-bold text-blue-600">{stats.reminders_upcoming}</div>
            <div className="text-xs text-gray-600">Reminders</div>
          </Link>

          <Link href="/todos" className="bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform">
            <div className="text-3xl mb-2">🛒</div>
            <div className="text-2xl font-bold text-purple-600">{stats.shopping_items}</div>
            <div className="text-xs text-gray-600">Shopping Items</div>
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
                <div className="text-4xl mb-3">🌟</div>
                <p className="text-gray-600">Nothing scheduled for today</p>
                <p className="text-sm text-gray-400 mt-1">Enjoy your free day!</p>
              </div>
            ) : (
              todayAgenda.map((item) => (
                <Link 
                  key={item.id} 
                  href={item.type === 'event' ? `/events/${item.id}` : `/todos`}
                  className="flex items-center p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className={`text-2xl mr-4 ${item.completed ? 'opacity-50' : ''}`}>
                    {getItemIcon(item)}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.title}
                    </div>
                    {(item.time || item.datetime) && (
                      <div className="text-sm text-gray-500 mt-0.5">
                        {item.datetime ? 
                          new Date(item.datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) :
                          item.time
                        }
                      </div>
                    )}
                    {item.location && (
                      <div className="text-sm text-gray-500 mt-0.5">📍 {item.location}</div>
                    )}
                  </div>
                  {item.priority && item.priority !== 'medium' && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                      item.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {item.priority}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Week - Optional Enhancement */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">This Week</h3>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date()
            date.setDate(date.getDate() + i)
            const isToday = i === 0
            
            return (
              <Link
                key={i}
                href="/calendar"
                className={`p-3 rounded-lg text-center transition-all ${
                  isToday 
                    ? 'bg-purple-500 text-white shadow-lg' 
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="text-xs font-medium">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-lg font-bold mt-1">
                  {date.getDate()}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/todos?action=new" className="bg-green-500 text-white rounded-xl p-4 text-center active:scale-95 transition-transform">
            <div className="text-2xl mb-1">➕</div>
            <div className="text-sm font-medium">Add Todo</div>
          </Link>
          
          <Link href="/events?action=new" className="bg-purple-500 text-white rounded-xl p-4 text-center active:scale-95 transition-transform">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-sm font-medium">Create Event</div>
          </Link>
          
          <Link href="/todos?list=reminder&action=new" className="bg-blue-500 text-white rounded-xl p-4 text-center active:scale-95 transition-transform">
            <div className="text-2xl mb-1">⏰</div>
            <div className="text-sm font-medium">Set Reminder</div>
          </Link>
          
          <Link href="/todos?list=shopping&action=new" className="bg-purple-500 text-white rounded-xl p-4 text-center active:scale-95 transition-transform">
            <div className="text-2xl mb-1">🛒</div>
            <div className="text-sm font-medium">Shopping List</div>
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
            <span className="text-xs mt-1">Lists</span>
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
