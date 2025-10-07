// app/(protected)/carpools/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Car, Users, MapPin, Clock, DollarSign, Calendar, Search, Filter,
  Plus, MoreVertical, MessageCircle, Star, TrendingUp, Leaf,
  ArrowRight, ChevronDown, Eye, Edit, Trash2, Share2,
  CheckCircle, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DBEvent } from '@/lib/types';

const supabase = createClient();

// Types
interface CarpoolGroup {
  id: string;
  event_id: string;
  driver_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  participants: CarpoolParticipant[];
  messages_count: number;
  total_savings: number;
  co2_saved: number;
  meetup_location?: string;
  departure_time?: string;
  car_details?: {
    make: string;
    color: string;
    seats: number;
  };
  created_at: string;
  updated_at: string;
}

interface CarpoolParticipant {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  role: 'driver' | 'passenger';
  status: 'confirmed' | 'pending' | 'declined';
  joined_at: string;
}

interface CarpoolStats {
  totalGroups: number;
  totalSavings: number;
  totalCO2Saved: number;
  totalTrips: number;
  averageGroupSize: number;
  topDestination: string;
}

const CarpoolManagement = () => {
  const [carpoolGroups, setCarpoolGroups] = useState<CarpoolGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<CarpoolGroup[]>([]);
  const [stats, setStats] = useState<CarpoolStats>({
    totalGroups: 0,
    totalSavings: 0,
    totalCO2Saved: 0,
    totalTrips: 0,
    averageGroupSize: 0,
    topDestination: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'active' | 'completed' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'savings' | 'participants'>('date');
  const [selectedGroup, setSelectedGroup] = useState<CarpoolGroup | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load carpool data
  const loadCarpoolData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load carpool groups
      const { data: groups, error } = await supabase
        .from('carpool_groups')
        .select(`
          *,
          events!carpool_groups_event_id_fkey (
            title,
            start_time,
            location
          )
        `)
        .or(`driver_id.eq.${user.id},participants.cs.["${user.id}"]`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform and enrich data
      const enrichedGroups: CarpoolGroup[] = (groups || []).map(group => {
        const event = group.events;
        const eventDate = new Date(event?.start_time || group.created_at);
        const now = new Date();
        
        let status: CarpoolGroup['status'] = 'upcoming';
        if (eventDate < now) {
          status = 'completed';
        } else if (eventDate.getTime() - now.getTime() < 86400000) { // Within 24 hours
          status = 'active';
        }

        // Parse participants if stored as JSON
        let participants: CarpoolParticipant[] = [];
        try {
          participants = JSON.parse(group.selected_friends || '[]').map((friendId: string, index: number) => ({
            id: `participant-${index}`,
            user_id: friendId,
            name: `Friend ${index + 1}`, // In real app, would fetch from friends table
            role: friendId === group.driver_id ? 'driver' : 'passenger',
            status: 'confirmed',
            joined_at: group.created_at
          }));
        } catch (e) {
          console.warn('Failed to parse participants:', e);
        }

        // Calculate savings (mock calculation)
        const participantCount = participants.length + 1; // Include driver
        const estimatedDistance = 20; // miles
        const gasPrice = 3.50;
        const mpg = 25;
        const totalCost = (estimatedDistance / mpg) * gasPrice;
        const savings = totalCost * (participantCount - 1) / participantCount;
        const co2Saved = (estimatedDistance / mpg) * 8.89 * (participantCount - 1) / participantCount;

        return {
          id: group.id,
          event_id: group.event_id,
          driver_id: group.driver_id,
          event_title: event?.title || 'Unknown Event',
          event_date: event?.start_time || group.created_at,
          event_location: event?.location || 'Location TBD',
          status,
          participants,
          messages_count: group.messages ? JSON.parse(group.messages).length : 0,
          total_savings: savings,
          co2_saved: co2Saved,
          meetup_location: group.event_details ? JSON.parse(group.event_details).meetupLocation : undefined,
          departure_time: group.event_details ? JSON.parse(group.event_details).departureTime : undefined,
          car_details: group.car_details ? JSON.parse(group.car_details) : undefined,
          created_at: group.created_at,
          updated_at: group.updated_at
        };
      });

      setCarpoolGroups(enrichedGroups);
      
      // Calculate stats
      const totalSavings = enrichedGroups.reduce((sum, group) => sum + group.total_savings, 0);
      const totalCO2Saved = enrichedGroups.reduce((sum, group) => sum + group.co2_saved, 0);
      const totalParticipants = enrichedGroups.reduce((sum, group) => sum + group.participants.length + 1, 0);
      const locationCounts = enrichedGroups.reduce((counts: Record<string, number>, group) => {
        counts[group.event_location] = (counts[group.event_location] || 0) + 1;
        return counts;
      }, {});
      const topDestination = Object.entries(locationCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

      setStats({
        totalGroups: enrichedGroups.length,
        totalSavings,
        totalCO2Saved,
        totalTrips: enrichedGroups.filter(g => g.status === 'completed').length,
        averageGroupSize: enrichedGroups.length > 0 ? totalParticipants / enrichedGroups.length : 0,
        topDestination
      });

    } catch (error) {
      console.error('Failed to load carpool data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter and search groups
  useEffect(() => {
    let filtered = carpoolGroups;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(group => group.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(group =>
        group.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.event_location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
        case 'savings':
          return b.total_savings - a.total_savings;
        case 'participants':
          return b.participants.length - a.participants.length;
        default:
          return 0;
      }
    });

    setFilteredGroups(filtered);
  }, [carpoolGroups, statusFilter, searchTerm, sortBy]);

  useEffect(() => {
    loadCarpoolData();
  }, [loadCarpoolData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: CarpoolGroup['status']) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: CarpoolGroup['status']) => {
    switch (status) {
      case 'upcoming': return <Clock size={14} />;
      case 'active': return <CheckCircle size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-purple-600" size={32} />
          <p className="text-gray-600 dark:text-gray-400">Loading your carpool history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Car className="text-green-600" />
                Carpool Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your carpools and track your environmental impact
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/calendar'}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              {isMobile ? 'New' : 'Create Carpool'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Groups</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalGroups}</p>
              </div>
              <Users className="text-blue-600" size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Money Saved</p>
                <p className="text-2xl font-bold text-green-600">${stats.totalSavings.toFixed(2)}</p>
              </div>
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">CO₂ Saved</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalCO2Saved.toFixed(1)} kg</p>
              </div>
              <Leaf className="text-green-600" size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Group Size</p>
                <p className="text-2xl font-bold text-purple-600">{stats.averageGroupSize.toFixed(1)}</p>
              </div>
              <TrendingUp className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 mb-6">
          <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
            <div className={`${isMobile ? 'space-y-3' : 'flex items-center gap-4'}`}>
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search carpools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="date">Date</option>
                <option value="savings">Savings</option>
                <option value="participants">Participants</option>
              </select>
            </div>
          </div>
        </div>

        {/* Carpool Groups List */}
        <div className="space-y-4">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedGroup(group);
                  setShowGroupDetails(true);
                }}
              >
                <div className="p-6">
                  <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {group.event_title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getStatusColor(group.status)}`}>
                          {getStatusIcon(group.status)}
                          {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(group.event_date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          {group.event_location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={14} />
                          {group.participants.length + 1} people
                        </div>
                      </div>

                      {group.meetup_location && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Meeting at: {group.meetup_location}
                          {group.departure_time && ` • Departing: ${group.departure_time}`}
                        </p>
                      )}
                    </div>

                    <div className={`${isMobile ? 'flex justify-between items-center' : 'flex items-center gap-6'}`}>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">${group.total_savings.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Saved</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">{group.co2_saved.toFixed(1)} kg</p>
                        <p className="text-xs text-gray-500">CO₂ Saved</p>
                      </div>
                      {group.messages_count > 0 && (
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{group.messages_count}</p>
                          <p className="text-xs text-gray-500">Messages</p>
                        </div>
                      )}
                      <ArrowRight className="text-gray-400" size={20} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center">
              <Car className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No carpools found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start organizing carpools to reduce costs and environmental impact!'
                }
              </p>
              <button
                onClick={() => window.location.href = '/calendar'}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Your First Carpool
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Group Details Modal */}
      {showGroupDetails && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedGroup.event_title}
                </h2>
                <button
                  onClick={() => setShowGroupDetails(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Event Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Event Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span>{formatDate(selectedGroup.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span>{selectedGroup.event_location}</span>
                    </div>
                    {selectedGroup.meetup_location && (
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-gray-400" />
                        <span>Meeting at: {selectedGroup.meetup_location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Participants ({selectedGroup.participants.length + 1})
                  </h3>
                  <div className="space-y-2">
                    {/* Driver */}
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <Car size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">You (Driver)</p>
                        {selectedGroup.car_details && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {selectedGroup.car_details.make} {selectedGroup.car_details.color} • {selectedGroup.car_details.seats} seats
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Passengers */}
                    {selectedGroup.participants.map((participant, index) => (
                      <div key={participant.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {participant.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{participant.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Passenger</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Summary */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Environmental Impact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                      <DollarSign className="mx-auto mb-2 text-green-600" size={24} />
                      <p className="text-lg font-bold text-green-600">${selectedGroup.total_savings.toFixed(2)}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Money Saved</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                      <Leaf className="mx-auto mb-2 text-green-600" size={24} />
                      <p className="text-lg font-bold text-green-600">{selectedGroup.co2_saved.toFixed(1)} kg</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">CO₂ Prevented</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                  {selectedGroup.status === 'upcoming' && (
                    <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                      <MessageCircle size={16} />
                      Open Chat
                    </button>
                  )}
                  <button className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarpoolManagement;
