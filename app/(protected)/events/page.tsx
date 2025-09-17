// app/(protected)/events/page.tsx
"use client"

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Calendar,
  MapPin,
  Users,
  Clock,
  Share2,
  Send,
  MessageCircle,
  Car,
  Filter,
  Grid,
  List,
  Map,
  Plus,
  Edit,
  Trash2,
  Copy,
  Globe,
  Lock,
  UserPlus,
  Sun,
  Cloud,
  CloudRain,
  Eye,
  EyeOff,
  Video,
  ChevronDown,
  ChevronRight,
  Search,
  Heart,
  Star,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  Coffee
} from 'lucide-react'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Event {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  location_details?: string
  latitude?: number
  longitude?: number
  visibility: 'private' | 'friends' | 'acquaintances' | 'public' | 'community'
  category?: string
  sub_category?: string
  image_url?: string
  images?: string[]
  created_by: string
  creator_name?: string
  creator_avatar?: string
  host_type: 'personal' | 'business' | 'community'
  capacity?: number
  has_waitlist?: boolean
  hide_attendee_count?: boolean
  hide_exact_address?: boolean
  show_email_only?: boolean
  is_virtual?: boolean
  virtual_link?: string
  recurring_pattern?: string
  tags?: string[]
  weather?: any
  rsvp_count?: number
  interested_count?: number
  chat_enabled?: boolean
  meditation_room_enabled?: boolean
  journal_prompt?: string
  created_at: string
  updated_at: string
}

interface RSVP {
  event_id: string
  user_id: string
  status: 'going' | 'interested' | 'maybe' | 'cant_go'
  is_co_host?: boolean
  carpool_available?: boolean
}

interface Friend {
  id: string
  name: string
  avatar_url?: string
  safe_to_carpool?: boolean
  tier: 'friend' | 'acquaintance' | 'restricted'
}

// Event categories with sub-categories
const EVENT_CATEGORIES = {
  'Wellness': ['Yoga', 'Meditation', 'Breathwork', 'Tai Chi', 'Qi Gong'],
  'Sound Healing': ['Sound Bath', 'Tuning Forks', 'Singing Bowls', 'Gong Bath', 'Drumming'],
  'Social': ['Meetup', 'Party', 'Dinner', 'Game Night', 'Book Club'],
  'Outdoor': ['Hiking', 'Beach', 'Picnic', 'Camping', 'Nature Walk'],
  'Learning': ['Workshop', 'Class', 'Seminar', 'Study Group', 'Lecture'],
  'Creative': ['Art', 'Music', 'Dance', 'Writing', 'Crafts'],
  'Business': ['Networking', 'Conference', 'Meeting', 'Presentation'],
  'Community': ['Volunteer', 'Fundraiser', 'Town Hall', 'Cleanup'],
}

// Weather icons mapping
const getWeatherIcon = (condition: string) => {
  switch(condition?.toLowerCase()) {
    case 'sunny':
    case 'clear':
      return <Sun className="w-4 h-4 text-yellow-500" />
    case 'cloudy':
    case 'overcast':
      return <Cloud className="w-4 h-4 text-gray-500" />
    case 'rain':
    case 'drizzle':
      return <CloudRain className="w-4 h-4 text-blue-500" />
    default:
      return <Sun className="w-4 h-4 text-yellow-500" />
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list' | 'map'>('grid')
  const [filter, setFilter] = useState<'all' | 'hosting' | 'attending' | 'interested'>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [carpoolFriends, setCarpoolFriends] = useState<Map<string, Friend[]>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedFriendsToInvite, setSelectedFriendsToInvite] = useState<Set<string>>(new Set())
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    location_details: '',
    visibility: 'friends' as Event['visibility'],
    category: '',
    sub_category: '',
    custom_category: '',
    host_type: 'personal' as Event['host_type'],
    capacity: undefined as number | undefined,
    has_waitlist: false,
    hide_attendee_count: false,
    hide_exact_address: false,
    show_email_only: false,
    is_virtual: false,
    virtual_link: '',
    chat_enabled: true,
    meditation_room_enabled: false,
    journal_prompt: '',
    recurring_pattern: '',
  })

  const [stats, setStats] = useState({
    total: 0,
    hosting: 0,
    attending: 0,
    interested: 0,
    thisWeek: 0,
    thisMonth: 0,
  })

  // Load data
  useEffect(() => {
    loadEvents()
    loadFriends()
    
    // Subscribe to real-time changes
    const subscription = supabase
      .channel('events-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' },
        () => loadEvents()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // Load all events user can see
      const { data: allEvents, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_created_by_fkey(
            full_name,
            avatar_url
          ),
          event_rsvps!left(
            user_id,
            status
          )
        `)
        .or(`visibility.eq.public,visibility.eq.friends,created_by.eq.${user.id}`)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (eventsError) throw eventsError

      // Process events with additional data
      const processedEvents = (allEvents || []).map(event => ({
        ...event,
        creator_name: event.creator?.full_name,
        creator_avatar: event.creator?.avatar_url,
        rsvp_count: event.event_rsvps?.filter((r: any) => r.status === 'going').length || 0,
        interested_count: event.event_rsvps?.filter((r: any) => r.status === 'interested').length || 0,
      }))

      setEvents(processedEvents)
      
      // Set my events
      const mine = processedEvents.filter(e => e.created_by === user.id)
      setMyEvents(mine)

      // Calculate stats
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      const attending = processedEvents.filter(e => 
        e.event_rsvps?.some((r: any) => r.user_id === user.id && r.status === 'going')
      )
      const interested = processedEvents.filter(e => 
        e.event_rsvps?.some((r: any) => r.user_id === user.id && r.status === 'interested')
      )

      setStats({
        total: processedEvents.length,
        hosting: mine.length,
        attending: attending.length,
        interested: interested.length,
        thisWeek: processedEvents.filter(e => new Date(e.start_time) <= weekFromNow).length,
        thisMonth: processedEvents.filter(e => new Date(e.start_time) <= monthFromNow).length,
      })

      // Check for carpool opportunities
      await checkCarpoolOpportunities(processedEvents, user.id)
      
      // Fetch weather for upcoming events (if API available)
      // await fetchWeatherForEvents(processedEvents)
      
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('friends')
      .select(`
        friend_profile:profiles!friends_friend_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        tier,
        safe_to_carpool
      `)
      .eq('user_id', user.id)

    if (!error && data) {
      const friendsList = data.map(f => ({
        id: f.friend_profile.id,
        name: f.friend_profile.full_name,
        avatar_url: f.friend_profile.avatar_url,
        tier: f.tier,
        safe_to_carpool: f.safe_to_carpool,
      }))
      setFriends(friendsList)
    }
  }

  const checkCarpoolOpportunities = async (events: Event[], userId: string) => {
    const carpoolMap = new Map<string, Friend[]>()
    
    for (const event of events) {
      // Get friends attending this event who are safe to carpool
      const { data: attendees } = await supabase
        .from('event_rsvps')
        .select('user_id')
        .eq('event_id', event.id)
        .eq('status', 'going')

      if (attendees) {
        const attendeeIds = attendees.map(a => a.user_id)
        const carpoolableFriends = friends.filter(f => 
          f.safe_to_carpool && attendeeIds.includes(f.id)
        )
        
        if (carpoolableFriends.length >= 1) {
          carpoolMap.set(event.id, carpoolableFriends)
        }
      }
    }
    
    setCarpoolFriends(carpoolMap)
  }

  const handleRSVP = async (event: Event, status: RSVP['status']) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('event_rsvps')
      .upsert({
        event_id: event.id,
        user_id: user.id,
        status,
        updated_at: new Date().toISOString(),
      })

    if (!error) {
      await loadEvents()
    }
  }

  const createEvent = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const eventData = {
      ...newEvent,
      created_by: user.id,
      category: newEvent.custom_category || newEvent.category,
      sub_category: newEvent.custom_category ? null : newEvent.sub_category,
    }

    const { error } = await supabase
      .from('events')
      .insert(eventData)

    if (!error) {
      await loadEvents()
      setShowCreateForm(false)
      resetForm()
    }
  }

  const updateEvent = async () => {
    if (!editingEvent) return

    const { error } = await supabase
      .from('events')
      .update({
        ...newEvent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingEvent.id)

    if (!error) {
      await loadEvents()
      setEditingEvent(null)
      setShowCreateForm(false)
      resetForm()
    }
  }

  const deleteEvent = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (!error) {
        await loadEvents()
      }
    }
  }

  const shareToFeed = async (event: Event) => {
    // Share to main home feed
    const { error } = await supabase
      .from('feed_posts')
      .insert({
        type: 'event_share',
        event_id: event.id,
        content: `Check out this event: ${event.title}`,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })

    if (!error) {
      alert('Event shared to main feed!')
    }
  }

  const inviteFriends = async (event: Event) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Send invites to selected friends
    for (const friendId of selectedFriendsToInvite) {
      await supabase
        .from('event_invites')
        .insert({
          event_id: event.id,
          from_user_id: user.id,
          to_user_id: friendId,
          message: `You're invited to ${event.title}!`,
        })
    }

    setShowInviteModal(false)
    setSelectedFriendsToInvite(new Set())
    alert(`Invited ${selectedFriendsToInvite.size} friends!`)
  }

  const openCarpoolChat = async (event: Event) => {
    // Navigate to carpool organization page or open chat
    window.location.href = `/carpool?event=${event.id}`
  }

  const openEventChat = (event: Event) => {
    window.location.href = `/events/${event.id}/chat`
  }

  const openMeditationRoom = (event: Event) => {
    window.location.href = `/meditation?event=${event.id}`
  }

  const duplicateEvent = (event: Event) => {
    setNewEvent({
      ...event,
      title: `${event.title} (Copy)`,
      start_time: '',
      end_time: '',
    } as any)
    setEditingEvent(null)
    setShowCreateForm(true)
  }

  const resetForm = () => {
    setNewEvent({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      location_details: '',
      visibility: 'friends',
      category: '',
      sub_category: '',
      custom_category: '',
      host_type: 'personal',
      capacity: undefined,
      has_waitlist: false,
      hide_attendee_count: false,
      hide_exact_address: false,
      show_email_only: false,
      is_virtual: false,
      virtual_link: '',
      chat_enabled: true,
      meditation_room_enabled: false,
      journal_prompt: '',
      recurring_pattern: '',
    })
  }

  const getFilteredEvents = () => {
    let filtered = events

    // Apply filter
    switch (filter) {
      case 'hosting':
        filtered = myEvents
        break
      case 'attending':
        filtered = events.filter(e => 
          e.event_rsvps?.some((r: any) => r.status === 'going')
        )
        break
      case 'interested':
        filtered = events.filter(e => 
          e.event_rsvps?.some((r: any) => r.status === 'interested')
        )
        break
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(e => e.category === selectedCategory)
    }

    return filtered
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const filteredEvents = getFilteredEvents()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Events Hub
              </h1>
              <p className="text-gray-600 mt-1">Discover and create meaningful gatherings</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-800">Total Events</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.hosting}</div>
              <div className="text-sm text-purple-800">Hosting</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.attending}</div>
              <div className="text-sm text-green-800">Attending</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.interested}</div>
              <div className="text-sm text-yellow-800">Interested</div>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{stats.thisWeek}</div>
              <div className="text-sm text-pink-800">This Week</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{stats.thisMonth}</div>
              <div className="text-sm text-indigo-800">This Month</div>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilter('hosting')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'hosting' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'
              }`}
            >
              Hosting
            </button>
            <button
              onClick={() => setFilter('attending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'attending' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'
              }`}
            >
              Attending
            </button>
            <button
              onClick={() => setFilter('interested')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'interested' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'
              }`}
            >
              Interested
            </button>
          </div>

          <div className="flex gap-4 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {Object.keys(EVENT_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('grid')}
                className={`p-2 rounded ${view === 'grid' ? 'bg-white shadow' : ''}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded ${view === 'list' ? 'bg-white shadow' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('map')}
                className={`p-2 rounded ${view === 'map' ? 'bg-white shadow' : ''}`}
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Events Display */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">No events found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your filters or create a new event</p>
          </div>
        ) : (
          <div className={
            view === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : view === 'list'
              ? 'space-y-4'
              : 'bg-white rounded-2xl shadow-xl p-6'
          }>
            {view === 'map' ? (
              <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Map view coming soon...</p>
              </div>
            ) : (
              filteredEvents.map(event => {
                const hasCarpoolFriends = carpoolFriends.has(event.id)
                const isHost = event.created_by === (supabase.auth.getUser() as any)?.id
                
                return (
                  <div
                    key={event.id}
                    className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] ${
                      view === 'list' ? 'p-4 flex gap-4' : 'overflow-hidden'
                    }`}
                  >
                    {/* Event Image */}
                    {view === 'grid' && event.image_url && (
                      <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 relative">
                        <img 
                          src={event.image_url} 
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                        {event.weather && (
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full px-2 py-1 flex items-center gap-1">
                            {getWeatherIcon(event.weather.condition)}
                            <span className="text-xs">{event.weather.temp}°</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className={view === 'grid' ? 'p-4' : 'flex-1'}>
                      {/* Event Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {event.is_virtual && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                                <Video className="w-3 h-3" />
                                Virtual
                              </span>
                            )}
                            {event.meditation_room_enabled && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                Meditation
                              </span>
                            )}
                            {hasCarpoolFriends && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                <Car className="w-3 h-3" />
                                Carpool
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {event.visibility === 'private' && <Lock className="w-4 h-4 text-gray-400" />}
                          {event.visibility === 'public' && <Globe className="w-4 h-4 text-gray-400" />}
                          {event.visibility === 'friends' && <Users className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(event.start_time).toLocaleString()}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{event.hide_exact_address && !isHost ? 'Location provided after RSVP' : event.location}</span>
                          </div>
                        )}
                        {!event.hide_attendee_count && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{event.rsvp_count} going · {event.interested_count} interested</span>
                            {event.capacity && (
                              <span className="text-xs text-gray-500">
                                (Max: {event.capacity})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {isHost ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingEvent(event)
                                setNewEvent(event as any)
                                setShowCreateForm(true)
                              }}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => duplicateEvent(event)}
                              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1"
                            >
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRSVP(event, 'going')}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            >
                              Going
                            </button>
                            <button
                              onClick={() => handleRSVP(event, 'interested')}
                              className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                            >
                              Interested
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => shareToFeed(event)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedEvent(event)
                            setShowInviteModal(true)
                          }}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                        >
                          <Send className="w-4 h-4" />
                          Invite
                        </button>

                        {event.chat_enabled && (
                          <button
                            onClick={() => openEventChat(event)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Chat
                          </button>
                        )}

                        {hasCarpoolFriends && (
                          <button
                            onClick={() => openCarpoolChat(event)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                          >
                            <Car className="w-4 h-4" />
                            Carpool
                          </button>
                        )}

                        {event.meditation_room_enabled && (
                          <button
                            onClick={() => openMeditationRoom(event)}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1"
                          >
                            <Sparkles className="w-4 h-4" />
                            Meditation
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Create/Edit Event Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingEvent ? 'Edit Event' : 'Create Event'}
              </h2>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Event Title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  
                  <select
                    value={newEvent.host_type}
                    onChange={(e) => setNewEvent({...newEvent, host_type: e.target.value as any})}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="personal">Personal Event</option>
                    <option value="business">Business Event</option>
                    <option value="community">Community Event</option>
                  </select>
                </div>

                <textarea
                  placeholder="Event Description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                />

                {/* Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start</label>
                    <input
                      type="datetime-local"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End</label>
                    <input
                      type="datetime-local"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newEvent.is_virtual}
                        onChange={(e) => setNewEvent({...newEvent, is_virtual: e.target.checked})}
                        className="rounded"
                      />
                      Virtual Event
                    </label>
                  </div>

                  {newEvent.is_virtual ? (
                    <input
                      type="url"
                      placeholder="Virtual Meeting Link"
                      value={newEvent.virtual_link}
                      onChange={(e) => setNewEvent({...newEvent, virtual_link: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Location"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <textarea
                        placeholder="Location Details (parking, entrance, etc.)"
                        value={newEvent.location_details}
                        onChange={(e) => setNewEvent({...newEvent, location_details: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={2}
                      />
                    </>
                  )}
                </div>

                {/* Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({...newEvent, category: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {Object.keys(EVENT_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="custom">Custom Category</option>
                  </select>

                  {newEvent.category === 'custom' ? (
                    <input
                      type="text"
                      placeholder="Enter custom category"
                      value={newEvent.custom_category}
                      onChange={(e) => setNewEvent({...newEvent, custom_category: e.target.value})}
                      className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  ) : newEvent.category && EVENT_CATEGORIES[newEvent.category as keyof typeof EVENT_CATEGORIES] ? (
                    <select
                      value={newEvent.sub_category}
                      onChange={(e) => setNewEvent({...newEvent, sub_category: e.target.value})}
                      className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Sub-category</option>
                      {EVENT_CATEGORIES[newEvent.category as keyof typeof EVENT_CATEGORIES].map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  ) : null}
                </div>

                {/* Privacy & Settings */}
                <div>
                  <label className="block text-sm font-medium mb-2">Privacy & Settings</label>
                  <div className="space-y-2">
                    <select
                      value={newEvent.visibility}
                      onChange={(e) => setNewEvent({...newEvent, visibility: e.target.value as any})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="private">Private - Only Me</option>
                      <option value="friends">Friends Only</option>
                      <option value="acquaintances">Friends & Acquaintances</option>
                      <option value="public">Public - Everyone</option>
                      <option value="community">Community Only</option>
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newEvent.hide_exact_address}
                          onChange={(e) => setNewEvent({...newEvent, hide_exact_address: e.target.checked})}
                          className="rounded"
                        />
                        Hide exact address until RSVP
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newEvent.hide_attendee_count}
                          onChange={(e) => setNewEvent({...newEvent, hide_attendee_count: e.target.checked})}
                          className="rounded"
                        />
                        Hide attendee count
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newEvent.show_email_only}
                          onChange={(e) => setNewEvent({...newEvent, show_email_only: e.target.checked})}
                          className="rounded"
                        />
                        Show email only (hide phone)
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newEvent.chat_enabled}
                          onChange={(e) => setNewEvent({...newEvent, chat_enabled: e.target.checked})}
                          className="rounded"
                        />
                        Enable event chat
                      </label>
                    </div>
                  </div>
                </div>

                {/* Capacity & Waitlist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Capacity (optional)</label>
                    <input
                      type="number"
                      placeholder="Max attendees"
                      value={newEvent.capacity || ''}
                      onChange={(e) => setNewEvent({...newEvent, capacity: parseInt(e.target.value) || undefined})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newEvent.has_waitlist}
                        onChange={(e) => setNewEvent({...newEvent, has_waitlist: e.target.checked})}
                        className="rounded"
                        disabled={!newEvent.capacity}
                      />
                      Enable waitlist when full
                    </label>
                  </div>
                </div>

                {/* Special Features */}
                <div>
                  <label className="block text-sm font-medium mb-2">Special Features</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newEvent.meditation_room_enabled}
                        onChange={(e) => setNewEvent({...newEvent, meditation_room_enabled: e.target.checked})}
                        className="rounded"
                      />
                      Enable Meditation Room for this event
                    </label>
                    
                    {newEvent.meditation_room_enabled && (
                      <textarea
                        placeholder="Journal prompt for attendees (optional)"
                        value={newEvent.journal_prompt}
                        onChange={(e) => setNewEvent({...newEvent, journal_prompt: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowCreateForm(false)
                      setEditingEvent(null)
                      resetForm()
                    }}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingEvent ? updateEvent : createEvent}
                    disabled={!newEvent.title || !newEvent.start_time}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invite Friends Modal */}
        {showInviteModal && selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold mb-4">Invite Friends to {selectedEvent.title}</h2>
              
              <div className="space-y-2 mb-4">
                {friends.map(friend => (
                  <label key={friend.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedFriendsToInvite.has(friend.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedFriendsToInvite)
                        if (e.target.checked) {
                          newSet.add(friend.id)
                        } else {
                          newSet.delete(friend.id)
                        }
                        setSelectedFriendsToInvite(newSet)
                      }}
                      className="rounded"
                    />
                    <img 
                      src={friend.avatar_url || '/default-avatar.png'} 
                      alt={friend.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="flex-1">{friend.name}</span>
                    <span className="text-xs text-gray-500">{friend.tier}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowInviteModal(false)
                    setSelectedFriendsToInvite(new Set())
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => inviteFriends(selectedEvent)}
                  disabled={selectedFriendsToInvite.size === 0}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Invites ({selectedFriendsToInvite.size})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
