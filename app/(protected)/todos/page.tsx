// app/(protected)/todos/page.tsx
"use client"
import React, { useState, useEffect, useRef } from 'react'
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
}
export default function TodosPage() {
const [todos, setTodos] = useState<Todo[]>([])
const [loading, setLoading] = useState(true)
const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
const [showAddForm, setShowAddForm] = useState(false)
const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
const [swipeDelete, setSwipeDelete] = useState<string | null>(null)
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
completed_at: !todo.completed ? new Date().toISOString() : null,
updated_at: new Date().toISOString()
})
.eq('id', todo.id)
if (!error) {
  await loadTodos()
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
const filteredTodos = todos.filter(todo => {
if (filter === 'pending') return !todo.completed
if (filter === 'completed') return todo.completed
return true
})
if (loading) {
return (

 ) }

return (
 {/* Mobile-First Header /}

My To-Dos

 {/ Desktop Add Button */}
<button
onClick={() => setShowAddForm(true)}
className="hidden md:flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
>
+
Add Todo


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
