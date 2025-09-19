// app/(protected)/shopping/page.tsx
"use client"

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ShoppingItem {
  id: string
  title: string
  description?: string
  category?: string
  quantity?: number
  unit?: string
  completed: boolean
  created_at: string
  updated_at: string
  notes?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  list_type?: string
}

// Shopping categories with emojis
const SHOPPING_CATEGORIES = [
  { name: 'Produce', emoji: '🥦', color: 'green' },
  { name: 'Dairy', emoji: '🥛', color: 'blue' },
  { name: 'Meat', emoji: '🥩', color: 'red' },
  { name: 'Bakery', emoji: '🍞', color: 'yellow' },
  { name: 'Frozen', emoji: '🧊', color: 'cyan' },
  { name: 'Pantry', emoji: '🥫', color: 'orange' },
  { name: 'Beverages', emoji: '🥤', color: 'purple' },
  { name: 'Snacks', emoji: '🍿', color: 'pink' },
  { name: 'Health', emoji: '💊', color: 'teal' },
  { name: 'Household', emoji: '🧹', color: 'indigo' },
  { name: 'Other', emoji: '📦', color: 'gray' }
]

// Confetti function
let confetti: any = null

export default function ShoppingListPage() {
  const router = useRouter()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [swipeDelete, setSwipeDelete] = useState<string | null>(null)
  const [showCompletedItems, setShowCompletedItems] = useState(false)
  const [groupByCategory, setGroupByCategory] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [newItem, setNewItem] = useState({
    title: '',
    category: '',
    quantity: 1,
    unit: '',
    notes: ''
  })
  
  const [editForm, setEditForm] = useState({
    title: '',
    category: '',
    quantity: 1,
    unit: '',
    notes: ''
  })
  
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    categories: 0
  })

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Load confetti
  useEffect(() => {
    import('canvas-confetti').then((module) => {
      confetti = module.default
    })
  }, [])

  useEffect(() => {
    loadShoppingList()
    
    const subscription = supabase
      .channel('shopping-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          // Only reload if it's a shopping list item
          if (payload.new && (payload.new as any).list_type === 'shopping') {
            loadShoppingList()
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadShoppingList = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .eq('list_type', 'shopping')
      .order('completed', { ascending: true })
      .order('category', { ascending: true })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setItems(data)
      calculateStats(data)
    }
    setLoading(false)
  }

  const calculateStats = (itemsList: ShoppingItem[]) => {
    const categories = new Set(itemsList.map(item => item.category).filter(Boolean))
    setStats({
      total: itemsList.length,
      completed: itemsList.filter(i => i.completed).length,
      pending: itemsList.filter(i => !i.completed).length,
      categories: categories.size
    })
  }

  const triggerCelebration = () => {
    if (!confetti) return
    
    const count = 200
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999
    }
    
    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
        spread: 90,
        colors: ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6']
      })
    }
    
    fire(0.25, { startVelocity: 55 })
    fire(0.2, { spread: 60 })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    
    // Show celebration message
    const celebrationDiv = document.createElement('div')
    celebrationDiv.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  z-index: 9999; background: white; padding: 2rem 3rem; border-radius: 1rem; 
                  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                  animation: celebration-bounce 0.5s ease-out;">
        <h2 style="font-size: 2rem; font-weight: bold; color: #8b5cf6; margin: 0;">🛒 Shopping Complete! 🎉</h2>
        <p style="color: #6b7280; margin-top: 0.5rem;">Time to head to the store!</p>
      </div>
    `
    document.body.appendChild(celebrationDiv)
    
    setTimeout(() => {
      celebrationDiv.remove()
    }, 3000)
  }

  const toggleItem = async (item: ShoppingItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    
    const wasCompleted = item.completed
    const { error } = await supabase
      .from('todos')
      .update({ 
        completed: !wasCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)

    if (!error) {
      await loadShoppingList()
      
      // Check if all items are now completed
      const { data: remainingItems } = await supabase
        .from('todos')
        .select('completed')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('list_type', 'shopping')
        .eq('completed', false)
      
      if (!remainingItems || remainingItems.length === 0) {
        triggerCelebration()
      }
    }
  }

  const addItem = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !newItem.title) return

    // Auto-detect category from title
    const detectedCategory = detectCategory(newItem.title)

    const { error } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        title: newItem.title,
        category: newItem.category || detectedCategory,
        quantity: newItem.quantity,
        unit: newItem.unit,
        notes: newItem.notes,
        list_type: 'shopping',
        completed: false,
        priority: 'medium'
      })

    if (!error) {
      await loadShoppingList()
      setShowAddForm(false)
      setNewItem({
        title: '',
        category: '',
        quantity: 1,
        unit: '',
        notes: ''
      })
    }
  }

  const startEdit = (item: ShoppingItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    
    setEditingItem(item)
    setEditForm({
      title: item.title || '',
      category: item.category || '',
      quantity: item.quantity || 1,
      unit: item.unit || '',
      notes: item.notes || ''
    })
    setShowEditForm(true)
  }

  const saveEdit = async () => {
    if (!editingItem) return
    
    const { error } = await supabase
      .from('todos')
      .update({
        title: editForm.title,
        category: editForm.category,
        quantity: editForm.quantity,
        unit: editForm.unit,
        notes: editForm.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingItem.id)
    
    if (!error) {
      await loadShoppingList()
      setShowEditForm(false)
      setEditingItem(null)
    }
  }

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (!error) {
      await loadShoppingList()
      setSwipeDelete(null)
    }
  }

  const detectCategory = (title: string): string => {
    const lowerTitle = title.toLowerCase()
    
    const categoryKeywords: Record<string, string[]> = {
      'Produce': ['apple', 'banana', 'lettuce', 'tomato', 'carrot', 'fruit', 'vegetable', 'salad', 'potato', 'onion'],
      'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'],
      'Meat': ['chicken', 'beef', 'pork', 'fish', 'turkey', 'bacon', 'sausage', 'ham'],
      'Bakery': ['bread', 'bagel', 'muffin', 'croissant', 'donut', 'cake', 'cookie'],
      'Frozen': ['ice cream', 'frozen', 'pizza'],
      'Pantry': ['rice', 'pasta', 'sauce', 'oil', 'flour', 'sugar', 'salt', 'spice', 'can', 'beans'],
      'Beverages': ['soda', 'juice', 'water', 'coffee', 'tea', 'drink', 'beer', 'wine'],
      'Snacks': ['chips', 'crackers', 'nuts', 'popcorn', 'candy', 'chocolate'],
      'Health': ['vitamin', 'medicine', 'bandaid', 'pharmacy'],
      'Household': ['paper', 'towel', 'detergent', 'soap', 'cleaner', 'trash', 'battery']
    }
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword))) {
        return category
      }
    }
    
    return 'Other'
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent, itemId: string) => {
    touchEndX.current = e.changedTouches[0].clientX
    const swipeDistance = touchStartX.current - touchEndX.current
    
    if (swipeDistance > 100) {
      setSwipeDelete(itemId)
    } else if (swipeDistance < -100) {
      setSwipeDelete(null)
    }
  }

  const getCategoryColor = (category: string) => {
    const cat = SHOPPING_CATEGORIES.find(c => c.name === category)
    return cat ? cat.color : 'gray'
  }

  const getCategoryEmoji = (category: string) => {
    const cat = SHOPPING_CATEGORIES.find(c => c.name === category)
    return cat ? cat.emoji : '📦'
  }

  // Filter and group items
  const filteredItems = items.filter(item => {
    if (!showCompletedItems && item.completed) return false
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const groupedItems = groupByCategory 
    ? SHOPPING_CATEGORIES.map(category => ({
        category: category.name,
        items: filteredItems.filter(item => item.category === category.name)
      })).filter(group => group.items.length > 0)
    : [{ category: 'All Items', items: filteredItems }]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      {/* Edit Modal */}
      {showEditForm && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md animate-slide-up">
            <h2 className="text-xl font-bold mb-4">Edit Item</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Item name"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full p-2 border rounded-lg"
                autoFocus
              />
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Quantity</label>
                  <input
                    type="number"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 border rounded-lg"
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Unit</label>
                  <input
                    type="text"
                    placeholder="lbs, pcs, etc."
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
              
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Select Category</option>
                {SHOPPING_CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
              
              <textarea
                placeholder="Notes (optional)"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full p-2 border rounded-lg h-20"
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditForm(false)
                  setEditingItem(null)
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!editForm.title}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-lg">
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => router.push('/todos')}
              className="flex items-center gap-2 text-2xl md:text-3xl font-bold hover:opacity-80 transition-opacity"
            >
              <span>🛒</span>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Shopping List
              </span>
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGroupByCategory(!groupByCategory)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  groupByCategory ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {groupByCategory ? 'Grouped' : 'List'}
              </button>
              
              <button
                onClick={() => setShowCompletedItems(!showCompletedItems)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  showCompletedItems ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {showCompletedItems ? 'Hide' : 'Show'} Done
              </button>
              
              <button
                onClick={() => setShowAddForm(true)}
                className="hidden md:flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-all"
              >
                <span className="text-xl">+</span>
                Add Item
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-3 mt-3 overflow-x-auto pb-2 -mx-4 px-4">
            <div className="min-w-[100px] bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="text-xl font-bold text-purple-600">{stats.total}</div>
              <div className="text-xs text-purple-800">Total Items</div>
            </div>
            <div className="min-w-[100px] bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-green-800">In Cart</div>
            </div>
            <div className="min-w-[100px] bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="text-xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-yellow-800">To Get</div>
            </div>
            <div className="min-w-[100px] bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-xl font-bold text-blue-600">{stats.categories}</div>
              <div className="text-xs text-blue-800">Categories</div>
            </div>
          </div>
        </div>
      </div>

      {/* Shopping Items */}
      <div className="p-4 pb-24">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center mt-8">
            <div className="text-5xl mb-3">🛒</div>
            <h3 className="text-lg font-semibold text-gray-700">Shopping list is empty!</h3>
            <p className="text-gray-500 mt-1 text-sm">Tap + to add items to your list</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedItems.map(group => (
              <div key={group.category} className={group.items.length > 0 ? '' : 'hidden'}>
                {groupByCategory && (
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">{getCategoryEmoji(group.category)}</span>
                    {group.category}
                    <span className="text-xs text-gray-400">({group.items.length})</span>
                  </h3>
                )}
                
                <div className="space-y-2">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className="relative"
                      onTouchStart={handleTouchStart}
                      onTouchEnd={(e) => handleTouchEnd(e, item.id)}
                    >
                      {/* Delete Button - Revealed on Swipe */}
                      {swipeDelete === item.id && (
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="absolute right-0 top-0 bottom-0 bg-red-500 text-white px-6 rounded-r-xl flex items-center z-10"
                        >
                          Delete
                        </button>
                      )}

                      <div
                        className={`bg-white rounded-xl shadow-sm p-4 transition-all hover:shadow-md ${
                          item.completed ? 'opacity-60' : ''
                        } ${swipeDelete === item.id ? 'transform -translate-x-24' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={(e) => toggleItem(item, e)}
                            className={`mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all transform hover:scale-110 ${
                              item.completed
                                ? 'bg-purple-500 border-purple-500 text-white'
                                : 'border-gray-300 hover:border-purple-400 active:scale-95'
                            }`}
                          >
                            {item.completed && <span className="text-sm">✓</span>}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h3 className={`font-medium text-base ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {item.quantity && item.quantity > 1 && (
                                  <span className="font-bold text-purple-600 mr-2">
                                    {item.quantity}{item.unit ? ` ${item.unit}` : 'x'}
                                  </span>
                                )}
                                {item.title}
                              </h3>
                              
                              <button
                                onClick={(e) => startEdit(item, e)}
                                className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                            
                            {item.notes && (
                              <p className="text-gray-600 text-sm mt-2">
                                📝 {item.notes}
                              </p>
                            )}
                            
                            {!groupByCategory && item.category && (
                              <span className={`inline-block mt-2 px-2 py-1 bg-${getCategoryColor(item.category)}-50 text-${getCategoryColor(item.category)}-600 rounded-full text-xs`}>
                                {getCategoryEmoji(item.category)} {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-purple-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-50 active:scale-95 transition-transform hover:bg-purple-600"
      >
        +
      </button>

      {/* Add Form (Bottom Sheet) */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAddForm(false)}
          />
          <div className="relative bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl p-6 pb-8 md:m-4 animate-slide-up">
            <div className="md:hidden w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            
            <h2 className="text-xl font-semibold mb-4">Add Shopping Item</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="What do you need to buy?"
                value={newItem.title}
                onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
                autoFocus
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Quantity</label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Unit (optional)</label>
                  <input
                    type="text"
                    placeholder="lbs, kg, pcs..."
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
              </div>
              
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-base"
              >
                <option value="">Auto-detect Category</option>
                {SHOPPING_CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
              
              <textarea
                placeholder="Notes (optional)"
                value={newItem.notes}
                onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-base"
                rows={2}
              />
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:scale-95 transition-transform hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={addItem}
                  disabled={!newItem.title}
                  className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform hover:bg-purple-600"
                >
                  Add to List
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
