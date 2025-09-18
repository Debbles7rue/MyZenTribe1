// app/(protected)/todos/page.tsx
"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================
// TYPES - Exported for other pages to use
// ============================================

export interface Todo {
  id: string
  user_id?: string
  created_by?: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  completed: boolean
  completed_at?: string
  category?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

// ============================================
// SHARED FUNCTIONS - Export these for other pages
// ============================================

// Load todos - can be called from anywhere
export async function loadTodosForUser(userId: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .or(`user_id.eq.${userId},created_by.eq.${userId}`)
    .order('completed', { ascending: true })
    .order('due_date', { ascending: true })

  if (!error && data) {
    return data
  }
  return []
}

// Toggle todo - can be called from anywhere
export async function toggleTodoCompletion(todoId: string, currentStatus: boolean, userId: string) {
  const { error } = await supabase
    .from('todos')
    .update({ 
      completed: !currentStatus,
      completed_at: !currentStatus ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', todoId)
    .or(`user_id.eq.${userId},created_by.eq.${userId}`)

  return !error
}

// Delete todo - can be called from anywhere
export async function deleteTodoById(todoId: string, userId: string) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todoId)
    .or(`user_id.eq.${userId},created_by.eq.${userId}`)

  return !error
}

// Get today's todos - for dashboard
export async function getTodaysTodos(userId: string): Promise<Todo[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data } = await supabase
    .from('todos')
    .select('*')
    .or(`user_id.eq.${userId},created_by.eq.${userId}`)
    .gte('due_date', today.toISOString())
    .lt('due_date', tomorrow.toISOString())
    .order('due_date')

  return data || []
}

// Calculate stats - for dashboard
export function calculateTodoStats(todos: Todo[]) {
  const now = new Date()
  return {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    pending: todos.filter(t => !t.completed).length,
    overdue: todos.filter(t => 
      !t.completed && t.due_date && new Date(t.due_date) < now
    ).length
  }
}

// Priority color helper - shared
export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'low': return 'text-green-600 bg-green-50 border-green-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

// ============================================
// REUSABLE COMPONENTS - Export for other pages
// ============================================

// TodoSidebar - For calendar page
export function TodoSidebar({ 
  userId,
  onDragStart,
  className = ""
}: { 
  userId: string
  onDragStart?: (todo: Todo) => void
  className?: string
}) {
  const [todos, setTodos] = useState<Todo[]>([])
  
  useEffect(() => {
    loadTodosForUser(userId).then(setTodos)
    
    const subscription = supabase
      .channel('sidebar-todos')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todos' },
        () => loadTodosForUser(userId).then(setTodos)
      )
      .subscribe()

    return () => { subscription.unsubscribe() }
  }, [userId])

  const pendingTodos = todos.filter(t => !t.completed).slice(0, 5)
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700">To-Dos</h3>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
          {pendingTodos.length}
        </span>
      </div>
      <div className="space-y-2">
        {pendingTodos.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No todos</p>
        ) : (
          pendingTodos.map((todo) => (
            <div
              key={todo.id}
              draggable={!todo.completed}
              onDragStart={() => onDragStart?.(todo)}
              className="group p-2 bg-green-50 border border-green-200 rounded-lg
                       hover:shadow-md transition-all text-sm relative cursor-move"
            >
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={todo.completed}
                  onChange={() => {
                    toggleTodoCompletion(todo.id, todo.completed, userId)
                      .then(() => loadTodosForUser(userId).then(setTodos))
                  }}
                  className="w-3 h-3"
                />
                <span className={`truncate flex-1 ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                  {todo.title}
                </span>
                <button
                  onClick={() => {
                    deleteTodoById(todo.id, userId)
                      .then(() => loadTodosForUser(userId).then(setTodos))
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2 italic">
        Drag to calendar to schedule
      </p>
    </div>
  )
}

// TodoQuickStats - For dashboard
export function TodoQuickStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState({ pending: 0, todayCount: 0 })
  
  useEffect(() => {
    loadTodosForUser(userId).then(todos => {
      const calculated = calculateTodoStats(todos)
      const todayTodos = todos.filter(t => {
        if (!t.due_date) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const due = new Date(t.due_date)
        return due >= today && due < tomorrow
      })
      
      setStats({
        pending: calculated.pending,
        todayCount: todayTodos.length
      })
    })
  }, [userId])
  
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="text-3xl mb-2">✅</div>
      <div className="text-2xl font-bold text-green-600">{stats.pending}</div>
      <div className="text-xs text-gray-600">Pending Todos</div>
      {stats.todayCount > 0 && (
        <div className="text-xs text-orange-600 mt-1">
          {stats.todayCount} due today
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [swipeDelete, setSwipeDelete] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as Todo['priority'],
    due_date: '',
    category: ''
  })
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  })

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Get user and load todos
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      }
    })
  }, [])

  // Load todos when userId is available
  useEffect(() => {
    if (!userId) return
    
    loadTodos()
    
    const subscription = supabase
      .channel('todos-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todos' },
        () => loadTodos()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const loadTodos = async () => {
    if (!userId) return
    
    const todos = await loadTodosForUser(userId)
    setTodos(todos)
    setStats(calculateTodoStats(todos))
    setLoading(false)
  }

  const toggleTodo = async (todo: Todo) => {
    if (!userId) return
    
    const success = await toggleTodoCompletion(todo.id, todo.completed, userId)
    if (success) {
      await loadTodos()
    }
  }

  const addTodo = async () => {
    if (!userId) return

    const { error } = await supabase
      .from('todos')
      .insert({
        user_id: userId,
        ...newTodo,
        due_date: newTodo.due_date || null
      })

    if (!error) {
      await loadTodos()
      setShowAddForm(false)
      setNewTodo({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        category: ''
      })
    }
  }

  const deleteTodo = async (id: string) => {
    if (!userId) return
    
    const success = await deleteTodoById(id, userId)
    if (success) {
      await loadTodos()
      setSwipeDelete(null)
    }
  }

  const handleTouchStart = (e: React.TouchEvent, todoId: string) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent, todoId: string) => {
    touchEndX.current = e.changedTouches[0].clientX
    const swipeDistance = touchStartX.current - touchEndX.current
    
    if (swipeDistance > 100) {
      setSwipeDelete(todoId)
    } else if (swipeDistance < -100) {
      setSwipeDelete(null)
    }
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Mobile-First Header */}
      <div className="sticky top-0 z-40 bg-white shadow-lg">
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              My To-Dos
            </h1>
            {/* Desktop Add Button */}
            <button
              onClick={() => setShowAddForm(true)}
              className="hidden md:flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              <span className="text-xl">+</span>
              Add Todo
            </button>
          </div>

          {/* Stats - Horizontal Scroll on Mobile */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:grid md:grid-cols-4 md:overflow-visible">
            <div className="min-w-[100px] bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-blue-800">Total</div>
            </div>
            <div className="min-w-[100px] bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-green-800">Done</div>
            </div>
            <div className="min-w-[100px] bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="text-xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-yellow-800">Pending</div>
            </div>
            <div className="min-w-[100px] bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="text-xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-xs text-red-800">Overdue</div>
            </div>
          </div>

          {/* Filter Tabs - Full Width on Mobile */}
          <div className="flex gap-1 mt-3 -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Todos List - Mobile Optimized */}
      <div className="p-4 pb-24">
        {filteredTodos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center mt-8">
            <div className="text-5xl mb-3">✨</div>
            <h3 className="text-lg font-semibold text-gray-700">No todos here!</h3>
            <p className="text-gray-500 mt-1 text-sm">
              {filter === 'completed' ? 'No completed tasks' : 'Tap + to add your first todo'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTodos.map(todo => (
              <div
                key={todo.id}
                className="relative"
                onTouchStart={(e) => handleTouchStart(e, todo.id)}
                onTouchEnd={(e) => handleTouchEnd(e, todo.id)}
              >
                {/* Delete Button - Revealed on Swipe */}
                {swipeDelete === todo.id && (
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="absolute right-0 top-0 bottom-0 bg-red-500 text-white px-6 rounded-r-xl flex items-center z-10"
                  >
                    Delete
                  </button>
                )}

                <div
                  className={`bg-white rounded-xl shadow-sm p-4 transition-all ${
                    todo.completed ? 'opacity-60' : ''
                  } ${swipeDelete === todo.id ? 'transform -translate-x-24' : ''}`}
                  onClick={() => setSelectedTodo(selectedTodo?.id === todo.id ? null : todo)}
                >
                  <div className="flex items-start gap-3">
                    {/* Larger Checkbox for Mobile */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTodo(todo)
                      }}
                      className={`mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        todo.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 active:border-green-500'
                      }`}
                    >
                      {todo.completed && <span className="text-sm">✓</span>}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-base ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {todo.title}
                      </h3>
                      
                      {/* Priority and Date - Always Visible on Mobile */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(todo.priority)}`}>
                          {todo.priority}
                        </span>
                        {todo.due_date && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs border border-purple-200">
                            📅 {new Date(todo.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {todo.category && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs border border-blue-200">
                            {todo.category}
                          </span>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {selectedTodo?.id === todo.id && todo.description && (
                        <p className="text-gray-600 text-sm mt-3 p-3 bg-gray-50 rounded-lg">
                          {todo.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-50 active:scale-95 transition-transform"
      >
        +
      </button>

      {/* Mobile-Optimized Add Form (Bottom Sheet) */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAddForm(false)}
          />
          <div className="relative bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl p-6 pb-8 md:m-4 animate-slide-up">
            {/* Mobile Handle */}
            <div className="md:hidden w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            
            <h2 className="text-xl font-semibold mb-4">Add New Todo</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTodo.title}
                onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
                autoFocus
              />
              
              <textarea
                placeholder="Add details (optional)"
                value={newTodo.description}
                onChange={(e) => setNewTodo({...newTodo, description: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
                rows={2}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Priority</label>
                  <select
                    value={newTodo.priority}
                    onChange={(e) => setNewTodo({...newTodo, priority: e.target.value as Todo['priority']})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Due Date</label>
                  <input
                    type="datetime-local"
                    value={newTodo.due_date}
                    onChange={(e) => setNewTodo({...newTodo, due_date: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
              </div>
              
              <input
                type="text"
                placeholder="Category (optional)"
                value={newTodo.category}
                onChange={(e) => setNewTodo({...newTodo, category: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-base"
              />
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  onClick={addTodo}
                  disabled={!newTodo.title}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                >
                  Add Todo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
