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
type?: 'todo'
// Additional fields for calendar integration
assigned_to?: string
recurring?: boolean
recurrence_pattern?: string
reminder_time?: string
attachments?: string[]
subtasks?: Subtask[]
estimated_duration?: number // in minutes
actual_duration?: number
project_id?: string
parent_todo_id?: string
}
export interface Subtask {
id: string
title: string
completed: boolean
completed_at?: string
}
export interface TodoStats {
total: number
completed: number
pending: number
overdue: number
todayCount: number
weekCount: number
completionRate: number
avgCompletionTime: number
byPriority: {
urgent: number
high: number
medium: number
low: number
}
byCategory: Record<string, number>
}
// ============================================
// SHARED FUNCTIONS - Export these for other pages
// ============================================
// Load todos - can be called from anywhere
export async function loadTodosForUser(userId: string): Promise<Todo[]> {
try {
// First try todos table
const { data: todosData, error: todosError } = await supabase
.from('todos')
.select('*')
.or(user_id.eq.${userId},created_by.eq.${userId})
.order('completed', { ascending: true })
.order('due_date', { ascending: true })
// Also check events table for event_type='todo'
const { data: eventTodos, error: eventsError } = await supabase
  .from('events')
  .select('*')
  .eq('created_by', userId)
  .eq('event_type', 'todo')
  .order('start_time', { ascending: true })

const todos: Todo[] = []

if (!todosError && todosData) {
  todos.push(...todosData)
}

if (!eventsError && eventTodos) {
  // Convert events to todo format
  const convertedEventTodos = eventTodos.map(event => ({
    id: event.id,
    user_id: event.created_by,
    created_by: event.created_by,
    title: event.title,
    description: event.description,
    priority: 'medium' as const,
    due_date: event.start_time,
    completed: event.status === 'completed',
    completed_at: event.status === 'completed' ? event.updated_at : null,
    category: event.event_type,
    tags: [],
    created_at: event.created_at,
    updated_at: event.updated_at,
    type: 'todo' as const
  }))
  todos.push(...convertedEventTodos)
}

return todos
} catch (error) {
console.error('Error loading todos:', error)
return []
}
}
// Toggle todo - can be called from anywhere
export async function toggleTodoCompletion(todoId: string, currentStatus: boolean, userId: string) {
try {
// First check if it's in todos table
const { data: todoCheck } = await supabase
.from('todos')
.select('id')
.eq('id', todoId)
.single()
if (todoCheck) {
  // It's in todos table
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
} else {
  // Check events table
  const { error } = await supabase
    .from('events')
    .update({
      status: !currentStatus ? 'completed' : 'scheduled',
      updated_at: new Date().toISOString()
    })
    .eq('id', todoId)
    .eq('created_by', userId)
  
  return !error
}
} catch (error) {
console.error('Error toggling todo:', error)
return false
}
}
// Delete todo - can be called from anywhere
export async function deleteTodoById(todoId: string, userId: string) {
try {
// First check if it's in todos table
const { data: todoCheck } = await supabase
.from('todos')
.select('id')
.eq('id', todoId)
.single()
if (todoCheck) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todoId)
    .or(`user_id.eq.${userId},created_by.eq.${userId}`)

  return !error
} else {
  // Try events table
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', todoId)
    .eq('created_by', userId)
    .eq('event_type', 'todo')
  
  return !error
}
} catch (error) {
console.error('Error deleting todo:', error)
return false
}
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
.or(user_id.eq.${userId},created_by.eq.${userId})
.gte('due_date', today.toISOString())
.lt('due_date', tomorrow.toISOString())
.order('due_date')
return data || []
}
// Get week's todos
export async function getWeeksTodos(userId: string): Promise<Todo[]> {
const today = new Date()
today.setHours(0, 0, 0, 0)
const nextWeek = new Date(today)
nextWeek.setDate(nextWeek.getDate() + 7)
const { data } = await supabase
.from('todos')
.select('*')
.or(user_id.eq.${userId},created_by.eq.${userId})
.gte('due_date', today.toISOString())
.lt('due_date', nextWeek.toISOString())
.order('due_date')
return data || []
}
// Calculate detailed stats - for dashboard and analytics
export function calculateTodoStats(todos: Todo[]): TodoStats {
const now = new Date()
const today = new Date()
today.setHours(0, 0, 0, 0)
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const nextWeek = new Date(today)
nextWeek.setDate(nextWeek.getDate() + 7)
// Calculate average completion time
const completedWithTime = todos.filter(t => t.completed && t.completed_at && t.created_at)
const avgCompletionTime = completedWithTime.length > 0
? completedWithTime.reduce((sum, t) => {
const created = new Date(t.created_at).getTime()
const completed = new Date(t.completed_at!).getTime()
return sum + (completed - created)
}, 0) / completedWithTime.length / (1000 * 60 * 60) // in hours
: 0
// Group by priority
const byPriority = {
urgent: todos.filter(t => t.priority === 'urgent' && !t.completed).length,
high: todos.filter(t => t.priority === 'high' && !t.completed).length,
medium: todos.filter(t => t.priority === 'medium' && !t.completed).length,
low: todos.filter(t => t.priority === 'low' && !t.completed).length,
}
// Group by category
const byCategory: Record<string, number> = {}
todos.forEach(todo => {
if (todo.category && !todo.completed) {
byCategory[todo.category] = (byCategory[todo.category] || 0) + 1
}
})
const total = todos.length
const completed = todos.filter(t => t.completed).length
return {
total,
completed,
pending: todos.filter(t => !t.completed).length,
overdue: todos.filter(t =>
!t.completed && t.due_date && new Date(t.due_date) < now
).length,
todayCount: todos.filter(t => {
if (!t.due_date || t.completed) return false
const due = new Date(t.due_date)
return due >= today && due < tomorrow
}).length,
weekCount: todos.filter(t => {
if (!t.due_date || t.completed) return false
const due = new Date(t.due_date)
return due >= today && due < nextWeek
}).length,
completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
avgCompletionTime: Math.round(avgCompletionTime),
byPriority,
byCategory
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
// Get priority emoji
export const getPriorityEmoji = (priority: string) => {
switch (priority) {
case 'urgent': return '🔴'
case 'high': return '🟠'
case 'medium': return '🟡'
case 'low': return '🟢'
default: return '⚪'
}
}
// ============================================
// REUSABLE COMPONENTS - Export for other pages
// ============================================
// TodoSidebar - For calendar page
export function TodoSidebar({
userId,
onDragStart,
className = "",
showCompleted = false,
maxItems = 5
}: {
userId: string
onDragStart?: (todo: Todo) => void
className?: string
showCompleted?: boolean
maxItems?: number
}) {
const [todos, setTodos] = useState<Todo[]>([])
const [isLoading, setIsLoading] = useState(false)
useEffect(() => {
const loadTodos = async () => {
setIsLoading(true)
const data = await loadTodosForUser(userId)
setTodos(data)
setIsLoading(false)
}
loadTodos()

const subscription = supabase
  .channel('sidebar-todos')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'todos' },
    () => loadTodos()
  )
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'events', filter: 'event_type=eq.todo' },
    () => loadTodos()
  )
  .subscribe()

return () => { subscription.unsubscribe() }
}, [userId])
const filteredTodos = showCompleted
? todos.slice(0, maxItems)
: todos.filter(t => !t.completed).slice(0, maxItems)
const handleToggle = async (todo: Todo) => {
await toggleTodoCompletion(todo.id, todo.completed, userId)
const data = await loadTodosForUser(userId)
setTodos(data)
}
const handleDelete = async (todoId: string) => {
await deleteTodoById(todoId, userId)
const data = await loadTodosForUser(userId)
setTodos(data)
}
if (isLoading) {
return (
<div className={animate-pulse ${className}}>



 ) }

return (

To-Dos

 {filteredTodos.length} 
 {filteredTodos.length === 0 ? ( 
No todos
 ) : ( filteredTodos.map((todo) => ( <div key={todo.id} draggable={!todo.completed} onDragStart={() => onDragStart?.(todo)} className="group p-2 bg-green-50 border border-green-200 rounded-lg hover:shadow-md transition-all text-sm relative cursor-move" > 
 <input type="checkbox" checked={todo.completed} onChange={() => handleToggle(todo)} className="w-3 h-3 cursor-pointer" onClick={(e) => e.stopPropagation()} /> 

<span className={block truncate ${todo.completed ? 'line-through text-gray-500' : ''}}>
{todo.title}

{todo.due_date && (

Due: {new Date(todo.due_date).toLocaleDateString()}

)}
{getPriorityEmoji(todo.priority)}
<button
onClick={(e) => {
e.stopPropagation()
handleDelete(todo.id)
}}
className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
>
×

 )) )} 
 {!showCompleted && todos.filter(t => !t.completed).length > maxItems && ( 

+{todos.filter(t => !t.completed).length - maxItems} more
 )} 

Drag to calendar to schedule
 ) }

// TodoQuickStats - For dashboard
export function TodoQuickStats({ userId }: { userId: string }) {
const [stats, setStats] = useState({ pending: 0, todayCount: 0, weekCount: 0 })
const [isLoading, setIsLoading] = useState(true)
useEffect(() => {
const loadStats = async () => {
setIsLoading(true)
const todos = await loadTodosForUser(userId)
const calculated = calculateTodoStats(todos)
setStats({
pending: calculated.pending,
todayCount: calculated.todayCount,
weekCount: calculated.weekCount
})
setIsLoading(false)
}
loadStats()

const subscription = supabase
  .channel('todo-stats')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'todos' },
    () => loadStats()
  )
  .subscribe()

return () => { subscription.unsubscribe() }
}, [userId])
if (isLoading) {
return (


 ) }

return (
✅
{stats.pending}
Pending Todos
 {stats.todayCount > 0 && ( 

{stats.todayCount} due today
 )} {stats.weekCount > 0 && ( 

{stats.weekCount} this week
 )} 
 ) }

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function TodosPage() {
const [todos, setTodos] = useState<Todo[]>([])
const [loading, setLoading] = useState(true)
const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created' | 'title'>('due_date')
const [showAddForm, setShowAddForm] = useState(false)
const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
const [swipeDelete, setSwipeDelete] = useState<string | null>(null)
const [searchQuery, setSearchQuery] = useState('')
const [selectedCategory, setSelectedCategory] = useState('all')
const [categories, setCategories] = useState<string[]>([])
const [userId, setUserId] = useState<string | null>(null)
const [isMobile, setIsMobile] = useState(false)
const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
const [batchMode, setBatchMode] = useState(false)
const [selectedTodos, setSelectedTodos] = useState<Set>(new Set())
const [newTodo, setNewTodo] = useState({
title: '',
description: '',
priority: 'medium' as Todo['priority'],
due_date: '',
category: '',
tags: [] as string[],
recurring: false,
recurrence_pattern: '',
reminder_time: '',
estimated_duration: 30,
})
const [stats, setStats] = useState({
total: 0,
completed: 0,
pending: 0,
overdue: 0,
todayCount: 0,
weekCount: 0,
completionRate: 0,
avgCompletionTime: 0,
byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
byCategory: {}
})
const touchStartX = useRef(0)
const touchEndX = useRef(0)
const touchStartY = useRef(0)
const longPressTimer = useRef<NodeJS.Timeout | null>(null)
// Check if mobile on mount
useEffect(() => {
const checkMobile = () => {
setIsMobile(window.innerWidth < 768)
}
checkMobile()
window.addEventListener('resize', checkMobile)
return () => window.removeEventListener('resize', checkMobile)
}, [])
// Load user and todos
useEffect(() => {
const loadUser = async () => {
const { data: { user } } = await supabase.auth.getUser()
if (user) {
setUserId(user.id)
}
}
loadUser()
}, [])
useEffect(() => {
if (userId) {
loadTodos()
  const subscription = supabase
    .channel('todos-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'todos' },
      () => loadTodos()
    )
    .subscribe()

  // Request notification permission on mobile
  if (isMobile && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }

  return () => {
    subscription.unsubscribe()
  }
}
}, [userId])
const loadTodos = async () => {
if (!userId) return
setLoading(true)
const data = await loadTodosForUser(userId)
setTodos(data)
setStats(calculateTodoStats(data))

// Extract unique categories
const uniqueCategories = new Set<string>()
data.forEach(todo => {
  if (todo.category) uniqueCategories.add(todo.category)
})
setCategories(Array.from(uniqueCategories))

setLoading(false)
}
const toggleTodo = async (todo: Todo) => {
const success = await toggleTodoCompletion(todo.id, todo.completed, userId!)
if (success) {
// Show completion animation
if (!todo.completed && isMobile) {
navigator.vibrate?.(50)
}
await loadTodos()
}
}
const addTodo = async () => {
if (!userId || !newTodo.title.trim()) return
const todoData: any = {
  user_id: userId,
  ...newTodo,
  due_date: newTodo.due_date || null,
  tags: newTodo.tags.length > 0 ? newTodo.tags : null,
}

const { error } = await supabase
  .from('todos')
  .insert(todoData)

if (!error) {
  await loadTodos()
  setShowAddForm(false)
  resetForm()
  
  // Show success feedback
  if (isMobile) {
    navigator.vibrate?.(100)
  }
}
}
const updateTodo = async () => {
if (!editingTodo || !userId) return
const { error } = await supabase
  .from('todos')
  .update({
    title: newTodo.title,
    description: newTodo.description,
    priority: newTodo.priority,
    due_date: newTodo.due_date || null,
    category: newTodo.category,
    tags: newTodo.tags,
    updated_at: new Date().toISOString()
  })
  .eq('id', editingTodo.id)
  .eq('user_id', userId)

if (!error) {
  await loadTodos()
  setEditingTodo(null)
  setShowAddForm(false)
  resetForm()
}
}
const deleteTodo = async (id: string) => {
if (!userId) return
const success = await deleteTodoById(id, userId)
if (success) {
  await loadTodos()
  setSwipeDelete(null)
  if (isMobile) {
    navigator.vibrate?.(100)
  }
}
}
const batchDelete = async () => {
if (!userId || selectedTodos.size === 0) return
for (const todoId of selectedTodos) {
  await deleteTodoById(todoId, userId)
}

setSelectedTodos(new Set())
setBatchMode(false)
await loadTodos()
}
const batchComplete = async () => {
if (!userId || selectedTodos.size === 0) return
for (const todoId of selectedTodos) {
  const todo = todos.find(t => t.id === todoId)
  if (todo && !todo.completed) {
    await toggleTodoCompletion(todoId, false, userId)
  }
}

setSelectedTodos(new Set())
setBatchMode(false)
await loadTodos()
}
const handleTouchStart = (e: React.TouchEvent, todoId: string) => {
touchStartX.current = e.touches[0].clientX
touchStartY.current = e.touches[0].clientY
// Long press for batch selection
longPressTimer.current = setTimeout(() => {
  setBatchMode(true)
  setSelectedTodos(new Set([todoId]))
  if (isMobile) {
    navigator.vibrate?.(50)
  }
}, 500)
}
const handleTouchMove = (e: React.TouchEvent) => {
// Cancel long press if user moves
const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current)
const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)
if ((deltaX > 10 || deltaY > 10) && longPressTimer.current) {
  clearTimeout(longPressTimer.current)
  longPressTimer.current = null
}
}
const handleTouchEnd = (e: React.TouchEvent, todoId: string) => {
// Clear long press timer
if (longPressTimer.current) {
clearTimeout(longPressTimer.current)
longPressTimer.current = null
}
touchEndX.current = e.changedTouches[0].clientX
const swipeDistance = touchStartX.current - touchEndX.current
const verticalDistance = Math.abs(e.changedTouches[0].clientY - touchStartY.current)

// Only trigger swipe if horizontal movement is greater than vertical
if (Math.abs(swipeDistance) > 100 && verticalDistance < 50) {
  if (swipeDistance > 0) {
    // Swipe left - show delete
    setSwipeDelete(todoId)
  } else {
    // Swipe right - hide delete
    setSwipeDelete(null)
  }
}
}
const resetForm = () => {
setNewTodo({
title: '',
description: '',
priority: 'medium',
due_date: '',
category: '',
tags: [],
recurring: false,
recurrence_pattern: '',
reminder_time: '',
estimated_duration: 30,
})
}
const handleEdit = (todo: Todo) => {
setEditingTodo(todo)
setNewTodo({
title: todo.title,
description: todo.description || '',
priority: todo.priority,
due_date: todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : '',
category: todo.category || '',
tags: todo.tags || [],
recurring: todo.recurring || false,
recurrence_pattern: todo.recurrence_pattern || '',
reminder_time: todo.reminder_time || '',
estimated_duration: todo.estimated_duration || 30,
})
setShowAddForm(true)
}
// Sort todos
const sortedTodos = [...todos].sort((a, b) => {
switch (sortBy) {
case 'priority':
const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
return priorityOrder[a.priority] - priorityOrder[b.priority]
case 'created':
return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
case 'title':
return a.title.localeCompare(b.title)
case 'due_date':
default:
if (!a.due_date) return 1
if (!b.due_date) return -1
return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
}
})
// Filter todos
const filteredTodos = sortedTodos.filter(todo => {
// Status filter
if (filter === 'pending' && todo.completed) return false
if (filter === 'completed' && !todo.completed) return false
// Category filter
if (selectedCategory !== 'all' && todo.category !== selectedCategory) return false

// Search filter
if (searchQuery) {
  const query = searchQuery.toLowerCase()
  return (
    todo.title.toLowerCase().includes(query) ||
    todo.description?.toLowerCase().includes(query) ||
    todo.category?.toLowerCase().includes(query) ||
    todo.tags?.some(tag => tag.toLowerCase().includes(query))
  )
}

return true
})
if (loading) {
return (

 ) }

return (
 {/* Mobile-First Header /}

My To-Dos

 {batchMode && ( 

<button
onClick={batchComplete}
className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm"
disabled={selectedTodos.size === 0}
>
✓ Complete ({selectedTodos.size})

<button
onClick={batchDelete}
className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
disabled={selectedTodos.size === 0}
>
🗑 Delete ({selectedTodos.size})

<button
onClick={() => {
setBatchMode(false)
setSelectedTodos(new Set())
}}
className="px-3 py-1 bg-gray-500 text-white rounded-lg text-sm"
>
Cancel

 )} {/ Desktop Add Button */}
<button
onClick={() => setShowAddForm(true)}
className="hidden md:flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
>
+
Add Todo


      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search todos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Stats - Horizontal Scroll on Mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:grid md:grid-cols-6 md:overflow-visible">
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
        <div className="min-w-[100px] bg-purple-50 p-3 rounded-lg border border-purple-200">
          <div className="text-xl font-bold text-purple-600">{stats.todayCount}</div>
          <div className="text-xs text-purple-800">Today</div>
        </div>
        <div className="min-w-[100px] bg-indigo-50 p-3 rounded-lg border border-indigo-200">
          <div className="text-xl font-bold text-indigo-600">{stats.completionRate}%</div>
          <div className="text-xs text-indigo-800">Rate</div>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex gap-2 items-center mt-3">
        {/* Filter Tabs */}
        <div className="flex gap-1 flex-1">
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

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="due_date">Due Date</option>
          <option value="priority">Priority</option>
          <option value="created">Created</option>
          <option value="title">Title</option>
        </select>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              selectedCategory === 'all' 
                ? 'bg-blue-500 text-white' 
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            All Categories
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                selectedCategory === category 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {category} ({stats.byCategory[category] || 0})
            </button>
          ))}
        </div>
      )}
    </div>
  </div>

  {/* Todos List - Mobile Optimized */}
  <div className="p-4 pb-24">
    {batchMode && (
      <p className="text-center text-sm text-gray-600 mb-2">
        Long press to select multiple todos
      </p>
    )}
    
    {filteredTodos.length === 0 ? (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center mt-8">
        <div className="text-5xl mb-3">✨</div>
        <h3 className="text-lg font-semibold text-gray-700">
          {searchQuery ? 'No todos found' : 'No todos here!'}
        </h3>
        <p className="text-gray-500 mt-1 text-sm">
          {filter === 'completed' ? 'No completed tasks' : 
           searchQuery ? 'Try a different search' :
           'Tap + to add your first todo'}
        </p>
      </div>
    ) : (
      <div className="space-y-2">
        {filteredTodos.map(todo => (
          <div
            key={todo.id}
            className={`relative ${batchMode && selectedTodos.has(todo.id) ? 'ring-2 ring-green-500' : ''}`}
            onTouchStart={(e) => !batchMode && handleTouchStart(e, todo.id)}
            onTouchMove={(e) => !batchMode && handleTouchMove(e)}
            onTouchEnd={(e) => !batchMode && handleTouchEnd(e, todo.id)}
            onClick={() => {
              if (batchMode) {
                const newSelected = new Set(selectedTodos)
                if (newSelected.has(todo.id)) {
                  newSelected.delete(todo.id)
                } else {
                  newSelected.add(todo.id)
                }
                setSelectedTodos(newSelected)
              }
            }}
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
              onClick={() => !batchMode && setSelectedTodo(selectedTodo?.id === todo.id ? null : todo)}
            >
              <div className="flex items-start gap-3">
                {/* Larger Checkbox for Mobile */}
                {!batchMode && (
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
                )}
                
                {batchMode && (
                  <div className={`mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center ${
                    selectedTodos.has(todo.id)
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300'
                  }`}>
                    {selectedTodos.has(todo.id) && <span className="text-sm">✓</span>}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium text-base ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {todo.title}
                  </h3>
                  
                  {/* Priority and Date - Always Visible on Mobile */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(todo.priority)}`}>
                      {getPriorityEmoji(todo.priority)} {todo.priority}
                    </span>
                    {todo.due_date && (
                      <span className={`px-2 py-1 rounded-full text-xs border ${
                        new Date(todo.due_date) < new Date() && !todo.completed
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-purple-50 text-purple-600 border-purple-200'
                      }`}>
                        📅 {new Date(todo.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {todo.category && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs border border-blue-200">
                        {todo.category}
                      </span>
                    )}
                    {todo.recurring && (
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs border border-indigo-200">
                        🔄 Recurring
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {todo.tags && todo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {todo.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded Details */}
                  {selectedTodo?.id === todo.id && (
                    <div className="mt-3">
                      {todo.description && (
                        <p className="text-gray-600 text-sm p-3 bg-gray-50 rounded-lg">
                          {todo.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(todo)
                          }}
                          className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteTodo(todo.id)
                          }}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
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

  {/* Mobile-Optimized Add/Edit Form (Bottom Sheet) */}
  {showAddForm && (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          setShowAddForm(false)
          setEditingTodo(null)
          resetForm()
        }}
      />
      <div className="relative bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl p-6 pb-8 md:m-4 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Mobile Handle */}
        <div className="md:hidden w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        
        <h2 className="text-xl font-semibold mb-4">
          {editingTodo ? 'Edit Todo' : 'Add New Todo'}
        </h2>
        
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
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
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
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Category</label>
              <input
                type="text"
                placeholder="e.g., Work, Personal"
                value={newTodo.category}
                onChange={(e) => setNewTodo({...newTodo, category: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-sm"
                list="categories"
              />
              <datalist id="categories">
                {categories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Est. Duration (min)</label>
              <input
                type="number"
                value={newTodo.estimated_duration}
                onChange={(e) => setNewTodo({...newTodo, estimated_duration: parseInt(e.target.value) || 30})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-sm"
                min="5"
                step="5"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="e.g., important, review, followup"
              value={newTodo.tags.join(', ')}
              onChange={(e) => setNewTodo({
                ...newTodo, 
                tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
              })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-base"
            />
          </div>

          {/* Reminder */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Reminder Time (optional)</label>
            <input
              type="datetime-local"
              value={newTodo.reminder_time}
              onChange={(e) => setNewTodo({...newTodo, reminder_time: e.target.value})}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recurring"
              checked={newTodo.recurring}
              onChange={(e) => setNewTodo({...newTodo, recurring: e.target.checked})}
              className="w-4 h-4"
            />
            <label htmlFor="recurring" className="text-sm text-gray-700">Make this a recurring todo</label>
          </div>

          {newTodo.recurring && (
            <input
              type="text"
              placeholder="Recurrence pattern (e.g., daily, weekly, monthly)"
              value={newTodo.recurrence_pattern}
              onChange={(e) => setNewTodo({...newTodo, recurrence_pattern: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-base"
            />
          )}
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowAddForm(false)
                setEditingTodo(null)
                resetForm()
              }}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:scale-95 transition-transform"
            >
              Cancel
            </button>
            <button
              onClick={editingTodo ? updateTodo : addTodo}
              disabled={!newTodo.title.trim()}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              {editingTodo ? 'Update' : 'Add'} Todo
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
