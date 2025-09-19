// app/(protected)/todos/page.tsx
"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Todo {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  completed: boolean
  category?: string
  tags?: string[]
  created_at: string
  updated_at: string
  time?: string
  notes?: string
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurring_parent_id?: string
}

// Export for calendar integration
export interface QuickTodoForm {
  title: string
  date: string
  time: string
  priority: string
  category: string
  notes: string
}

// Confetti function - will be initialized after component mounts
let confetti: any = null

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [swipeDelete, setSwipeDelete] = useState<string | null>(null)
  const [showCompletedItems, setShowCompletedItems] = useState(false)
  const [showQuickModal, setShowQuickModal] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as Todo['priority'],
    due_date: '',
    category: '',
    time: '',
    notes: '',
    recurring: 'none' as Todo['recurring']
  })
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Todo['priority'],
    due_date: '',
    category: '',
    time: '',
    notes: '',
    recurring: 'none' as Todo['recurring']
  })
  
  // Quick modal form state (for calendar integration)
  const [quickModalForm, setQuickModalForm] = useState<QuickTodoForm>({
    title: '',
    date: '',
    time: '',
    priority: 'medium',
    category: '',
    notes: ''
  })
  
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  })

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Load confetti library
  useEffect(() => {
    import('canvas-confetti').then((module) => {
      confetti = module.default
    })
  }, [])

  // Listen for external quick modal triggers (from calendar)
  useEffect(() => {
    const handleQuickTodo = (event: CustomEvent) => {
      setShowQuickModal(true)
      if (event.detail) {
        setQuickModalForm(event.detail)
      }
    }
    
    window.addEventListener('openQuickTodo' as any, handleQuickTodo)
    return () => {
      window.removeEventListener('openQuickTodo' as any, handleQuickTodo)
    }
  }, [])

  useEffect(() => {
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
  }, [])

  const loadTodos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('completed', { ascending: true })
      .order('due_date', { ascending: true })

    if (!error && data) {
      setTodos(data)
      calculateStats(data)
      
      // Notify calendar to reload
      window.dispatchEvent(new CustomEvent('todosUpdated', { detail: data }))
    }
    setLoading(false)
  }

  const calculateStats = (todosList: Todo[]) => {
    const now = new Date()
    setStats({
      total: todosList.length,
      completed: todosList.filter(t => t.completed).length,
      pending: todosList.filter(t => !t.completed).length,
      overdue: todosList.filter(t => 
        !t.completed && t.due_date && new Date(t.due_date) < now
      ).length
    })
  }

  // Celebration when all todos are complete
  const triggerCelebration = () => {
    if (!confetti) return
    
    // Multiple confetti bursts for epic celebration
    const count = 200
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999
    }
    
    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      })
    }
    
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    })
    fire(0.2, {
      spread: 60,
    })
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    })
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    })
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    })
    
    // Show celebration message
    const celebrationDiv = document.createElement('div')
    celebrationDiv.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  z-index: 9999; background: white; padding: 2rem 3rem; border-radius: 1rem; 
                  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                  animation: celebration-bounce 0.5s ease-out;">
        <h2 style="font-size: 2rem; font-weight: bold; color: #10b981; margin: 0;">🎉 All Done! 🎉</h2>
        <p style="color: #6b7280; margin-top: 0.5rem;">You've completed all your todos!</p>
      </div>
    `
    document.body.appendChild(celebrationDiv)
    
    setTimeout(() => {
      celebrationDiv.remove()
    }, 3000)
  }

  const createRecurringTodo = async (originalTodo: Todo) => {
    if (!originalTodo.recurring || originalTodo.recurring === 'none') return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    let nextDate = new Date(originalTodo.due_date || new Date())
    
    switch (originalTodo.recurring) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1)
        break
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7)
        break
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
    }
    
    const newRecurringTodo = {
      user_id: user.id,
      title: originalTodo.title,
      description: originalTodo.description,
      priority: originalTodo.priority,
      due_date: nextDate.toISOString().split('T')[0],
      time: originalTodo.time,
      category: originalTodo.category,
      notes: originalTodo.notes,
      recurring: originalTodo.recurring,
      recurring_parent_id: originalTodo.recurring_parent_id || originalTodo.id,
      completed: false
    }
    
    await supabase.from('todos').insert(newRecurringTodo)
  }

  const toggleTodo = async (todo: Todo, e?: React.MouseEvent) => {
    // Prevent event bubbling to parent div
    if (e) {
      e.stopPropagation()
    }
    
    const wasCompleted = todo.completed
    const { error } = await supabase
      .from('todos')
      .update({ 
        completed: !wasCompleted,
        completed_at: !wasCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', todo.id)

    if (!error) {
      // If completing a recurring todo, create the next occurrence
      if (!wasCompleted && todo.recurring && todo.recurring !== 'none') {
        await createRecurringTodo(todo)
      }
      
      await loadTodos()
      
      // Check if all todos are now completed
      const { data: remainingTodos } = await supabase
        .from('todos')
        .select('completed')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('completed', false)
      
      if (!remainingTodos || remainingTodos.length === 0) {
        // All todos are complete!
        triggerCelebration()
      }
      
      // Trigger success animation if completed
      if (!wasCompleted) {
        window.dispatchEvent(new CustomEvent('todoCompleted', { 
          detail: { id: todo.id, title: todo.title }
        }))
      }
    }
  }

  const addTodo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
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
        category: '',
        time: '',
        notes: '',
        recurring: 'none'
      })
    }
  }

  const startEdit = (todo: Todo, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setEditingTodo(todo)
    setEditForm({
      title: todo.title || '',
      description: todo.description || '',
      priority: todo.priority || 'medium',
      due_date: todo.due_date || '',
      category: todo.category || '',
      time: todo.time || '',
      notes: todo.notes || '',
      recurring: todo.recurring || 'none'
    })
    setShowEditForm(true)
  }

  const saveEdit = async () => {
    if (!editingTodo) return
    
    const { error } = await supabase
      .from('todos')
      .update({
        ...editForm,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingTodo.id)
    
    if (!error) {
      await loadTodos()
      setShowEditForm(false)
      setEditingTodo(null)
    }
  }

  // Quick add for calendar integration
  const createQuickTodo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !quickModalForm.title) return

    const { error } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        title: quickModalForm.title,
        due_date: quickModalForm.date || new Date().toISOString().split('T')[0],
        time: quickModalForm.time,
        priority: quickModalForm.priority as Todo['priority'] || 'medium',
        category: quickModalForm.category,
        notes: quickModalForm.notes,
        completed: false,
        recurring: 'none'
      })

    if (!error) {
      await loadTodos()
      setShowQuickModal(false)
      setQuickModalForm({
        title: '',
        date: '',
        time: '',
        priority: 'medium',
        category: '',
        notes: ''
      })
      
      // Notify calendar of success
      window.dispatchEvent(new CustomEvent('quickTodoCreated'))
    }
  }

  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (!error) {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRecurringIcon = (recurring?: string) => {
    if (!recurring || recurring === 'none') return null
    return '🔄'
  }

  const filteredTodos = todos.filter(todo => {
    // First apply completed filter if showCompletedItems is false
    if (!showCompletedItems && todo.completed) return false
    
    // Then apply view filter
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
      {/* Quick Add Modal (for calendar integration) */}
      {showQuickModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md animate-slide-up">
            <h2 className="text-xl font-bold mb-4">Quick Add Todo</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={quickModalForm.title}
                onChange={(e) => setQuickModalForm({ ...quickModalForm, title: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                autoFocus
              />
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={quickModalForm.date}
                  onChange={(e) => setQuickModalForm({ ...quickModalForm, date: e.target.value })}
                  className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
                
                <input
                  type="time"
                  value={quickModalForm.time}
                  onChange={(e) => setQuickModalForm({ ...quickModalForm, time: e.target.value })}
                  className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <select
                value={quickModalForm.priority}
                onChange={(e) => setQuickModalForm({ ...quickModalForm, priority: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              
              <input
                type="text"
                placeholder="Category (optional)"
                value={quickModalForm.category}
                onChange={(e) => setQuickModalForm({ ...quickModalForm, category: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
              
              <textarea
                placeholder="Notes (optional)"
                value={quickModalForm.notes}
                onChange={(e) => setQuickModalForm({ ...quickModalForm, notes: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 h-20"
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowQuickModal(false)
                  setQuickModalForm({
                    title: '',
                    date: '',
                    time: '',
                    priority: 'medium',
                    category: '',
                    notes: ''
                  })
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createQuickTodo}
                disabled={!quickModalForm.title}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                Add Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditForm && editingTodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md animate-slide-up">
            <h2 className="text-xl font-bold mb-4">Edit Todo</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                autoFocus
              />
              
              <textarea
                placeholder="Description (optional)"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 h-20"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Todo['priority'] })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Recurring</label>
                  <select
                    value={editForm.recurring}
                    onChange={(e) => setEditForm({ ...editForm, recurring: e.target.value as Todo['recurring'] })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="none">No Repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
                
                <input
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <input
                type="text"
                placeholder="Category (optional)"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
              
              <textarea
                placeholder="Notes (optional)"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 h-20"
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditForm(false)
                  setEditingTodo(null)
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!editForm.title}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-First Header */}
      <div className="sticky top-0 z-40 bg-white shadow-lg">
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              My To-Dos
            </h1>
            <div className="flex items-center gap-2">
              {/* Show Completed Toggle */}
              <button
                onClick={() => setShowCompletedItems(!showCompletedItems)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  showCompletedItems 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {showCompletedItems ? 'Hide' : 'Show'} Done
              </button>
              
              {/* Desktop Add Button */}
              <button
                onClick={() => setShowAddForm(true)}
                className="hidden md:flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all"
              >
                <span className="text-xl">+</span>
                Add Todo
              </button>
            </div>
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
                  className={`bg-white rounded-xl shadow-sm p-4 transition-all hover:shadow-md ${
                    todo.completed ? 'opacity-60' : ''
                  } ${swipeDelete === todo.id ? 'transform -translate-x-24' : ''}`}
                  onClick={() => setSelectedTodo(selectedTodo?.id === todo.id ? null : todo)}
                >
                  <div className="flex items-start gap-3">
                    {/* Fixed Checkbox - Prevent propagation properly */}
                    <button
                      onClick={(e) => toggleTodo(todo, e)}
                      className={`mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all transform hover:scale-110 ${
                        todo.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-400 active:scale-95'
                      }`}
                    >
                      {todo.completed && <span className="text-sm">✓</span>}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className={`font-medium text-base ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {todo.title} {getRecurringIcon(todo.recurring)}
                        </h3>
                        
                        {/* Edit Button */}
                        <button
                          onClick={(e) => startEdit(todo, e)}
                          className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                          aria-label="Edit todo"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Priority and Date - Always Visible on Mobile */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(todo.priority)}`}>
                          {todo.priority}
                        </span>
                        {todo.recurring && todo.recurring !== 'none' && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs border border-purple-200">
                            🔄 {todo.recurring}
                          </span>
                        )}
                        {todo.due_date && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs border border-purple-200">
                            📅 {new Date(todo.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {todo.time && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs border border-blue-200">
                            🕒 {todo.time}
                          </span>
                        )}
                        {todo.category && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs border border-blue-200">
                            {todo.category}
                          </span>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {selectedTodo?.id === todo.id && (todo.description || todo.notes) && (
                        <p className="text-gray-600 text-sm mt-3 p-3 bg-gray-50 rounded-lg">
                          {todo.description || todo.notes}
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
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-50 active:scale-95 transition-transform hover:bg-green-600"
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
                  <label className="text-xs text-gray-600 mb-1 block">Repeat</label>
                  <select
                    value={newTodo.recurring}
                    onChange={(e) => setNewTodo({...newTodo, recurring: e.target.value as Todo['recurring']})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="none">No Repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Due Date</label>
                  <input
                    type="date"
                    value={newTodo.due_date}
                    onChange={(e) => setNewTodo({...newTodo, due_date: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Time</label>
                  <input
                    type="time"
                    value={newTodo.time}
                    onChange={(e) => setNewTodo({...newTodo, time: e.target.value})}
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
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:scale-95 transition-transform hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={addTodo}
                  disabled={!newTodo.title}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform hover:bg-green-600"
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
        
        @keyframes celebration-bounce {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}
