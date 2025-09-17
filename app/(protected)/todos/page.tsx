// app/(protected)/todos/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Plus, Check, Clock, AlertCircle, Filter, Calendar } from 'lucide-react'

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
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
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

  const supabase = createClientComponentClient()

  // Load todos
  useEffect(() => {
    loadTodos()
    
    // Subscribe to real-time changes
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

  const toggleTodo = async (todo: Todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ 
        completed: !todo.completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', todo.id)

    if (!error) {
      await loadTodos()
      
      // Show success toast
      if (!todo.completed) {
        // Add points for completing a todo
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.rpc('add_user_points', {
            p_user_id: user.id,
            p_points: 10,
            p_action: 'complete_todo'
          })
        }
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
        category: ''
      })
    }
  }

  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (!error) {
      await loadTodos()
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                My To-Dos
              </h1>
              <p className="text-gray-600 mt-1">Stay organized and productive</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Todo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-800">Total Tasks</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-green-800">Completed</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-yellow-800">Pending</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-red-800">Overdue</div>
            </div>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Todo</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTodo.title}
                onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <textarea
                placeholder="Description (optional)"
                value={newTodo.description}
                onChange={(e) => setNewTodo({...newTodo, description: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                rows={3}
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <select
                  value={newTodo.priority}
                  onChange={(e) => setNewTodo({...newTodo, priority: e.target.value as Todo['priority']})}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <input
                  type="datetime-local"
                  value={newTodo.due_date}
                  onChange={(e) => setNewTodo({...newTodo, due_date: e.target.value})}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={newTodo.category}
                  onChange={(e) => setNewTodo({...newTodo, category: e.target.value})}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={addTodo}
                  disabled={!newTodo.title}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Todo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-xl p-2 mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              filter === 'pending' ? 'bg-yellow-500 text-white' : 'hover:bg-gray-100'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              filter === 'completed' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'
            }`}
          >
            Completed ({stats.completed})
          </button>
        </div>

        {/* Todos List */}
        <div className="space-y-3">
          {filteredTodos.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="text-6xl mb-4">✨</div>
              <h3 className="text-xl font-semibold text-gray-700">No todos here!</h3>
              <p className="text-gray-500 mt-2">
                {filter === 'completed' ? 'No completed tasks yet' : 'Add your first todo to get started'}
              </p>
            </div>
          ) : (
            filteredTodos.map(todo => (
              <div
                key={todo.id}
                className={`bg-white rounded-xl shadow-md p-4 transition-all hover:shadow-lg ${
                  todo.completed ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTodo(todo)}
                    className={`mt-1 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      todo.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {todo.completed && <Check className="w-4 h-4" />}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`font-semibold text-lg ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                          {todo.title}
                        </h3>
                        {todo.description && (
                          <p className="text-gray-600 mt-1">{todo.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                            {todo.priority}
                          </span>
                          {todo.category && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                              {todo.category}
                            </span>
                          )}
                          {todo.due_date && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(todo.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="text-red-500 hover:text-red-700 ml-4"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
