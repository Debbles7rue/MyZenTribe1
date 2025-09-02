// app/(protected)/admin/page.tsx
// Copy this entire file to app/(protected)/admin/page.tsx in your project

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  checkIsAdmin, 
  getAdminStats, 
  getInboxMessages,
  getContentReports,
  markMessageRead,
  resolveReport
} from "@/lib/admin-utils";
import type { AdminStats, InboxMessage, ContentReport } from "@/lib/admin-types";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'inbox' | 'reports' | 'users'>('overview');
  
  // Inbox state
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [messageFilter, setMessageFilter] = useState<'all' | 'contact' | 'suggestion'>('all');
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  
  // Reports state
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [reportFilter, setReportFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin, activeTab]);

  const checkAdminAccess = async () => {
    const adminStatus = await checkIsAdmin();
    if (!adminStatus) {
      router.push('/');
      return;
    }
    setIsAdmin(true);
    setLoading(false);
  };

  const loadDashboardData = async () => {
    if (activeTab === 'overview') {
      const { data } = await getAdminStats();
      setStats(data);
    } else if (activeTab === 'inbox') {
      const { data } = await getInboxMessages(
        messageFilter === 'all' ? undefined : messageFilter
      );
      setMessages(data);
    } else if (activeTab === 'reports') {
      const { data } = await getContentReports(
        reportFilter === 'all' ? undefined : 'pending'
      );
      setReports(data);
    }
  };

  const handleMarkRead = async (messageId: string) => {
    await markMessageRead(messageId);
    setMessages(messages.map(m => 
      m.id === messageId ? { ...m, status: 'read' as const } : m
    ));
    if (stats) {
      setStats({ ...stats, unreadMessages: stats.unreadMessages - 1 });
    }
  };

  const handleResolveReport = async (reportId: string, resolution: string) => {
    const { error } = await resolveReport(reportId, resolution);
    if (!error) {
      setReports(reports.filter(r => r.id !== reportId));
      if (stats) {
        setStats({ ...stats, pendingReports: stats.pendingReports - 1 });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Access denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container-app py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Admin Panel</span>
              <button
                onClick={() => router.push('/')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to App
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="container-app">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'inbox', label: 'Inbox', badge: stats?.unreadMessages },
              { id: 'reports', label: 'Reports', badge: stats?.pendingReports },
              { id: 'users', label: 'Users', icon: '👥' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
                {tab.badge ? (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container-app py-8">
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Users" value={stats.totalUsers} icon="👥" />
            <StatCard title="Total Events" value={stats.totalEvents} icon="📅" />
            <StatCard title="Communities" value={stats.totalCommunities} icon="🏘️" />
            <StatCard title="Today's Signups" value={stats.todaySignups} icon="🆕" />
            <StatCard 
              title="Unread Messages" 
              value={stats.unreadMessages} 
              icon="📬" 
              highlight={stats.unreadMessages > 0}
            />
            <StatCard 
              title="Pending Reports" 
              value={stats.pendingReports} 
              icon="⚠️"
              highlight={stats.pendingReports > 0}
            />
            <StatCard title="Active Moderation" value={stats.activeModeration} icon="🔨" />
            <StatCard title="Total Reports" value={stats.totalReports} icon="📝" />
          </div>
        )}

        {activeTab === 'inbox' && (
          <div className="space-y-6">
            {/* Filter */}
            <div className="flex gap-2">
              {['all', 'contact', 'suggestion'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setMessageFilter(filter as any);
                    loadDashboardData();
                  }}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium
                    ${messageFilter === filter
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Messages List */}
            <div className="bg-white rounded-lg shadow">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No messages found
                </div>
              ) : (
                <div className="divide-y">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        message.status === 'unread' ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedMessage(message);
                        if (message.status === 'unread') {
                          handleMarkRead(message.id);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`
                              px-2 py-0.5 text-xs rounded-full
                              ${message.type === 'contact' 
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                              }
                            `}>
                              {message.type}
                            </span>
                            {message.status === 'unread' && (
                              <span className="text-xs font-semibold text-blue-600">NEW</span>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-900">
                            {message.subject || 'No subject'}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {message.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {message.sender_name || message.sender_email || 'Anonymous'} • 
                            {new Date(message.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Filter */}
            <div className="flex gap-2">
              {['pending', 'all'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setReportFilter(filter as any);
                    loadDashboardData();
                  }}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium
                    ${reportFilter === filter
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Reports List */}
            <div className="bg-white rounded-lg shadow">
              {reports.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No reports found
                </div>
              ) : (
                <div className="divide-y">
                  {reports.map((report) => (
                    <div key={report.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                              {report.content_type}
                            </span>
                            <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                              {report.reason}
                            </span>
                            {report.status === 'pending' && (
                              <span className="text-xs font-semibold text-red-600">PENDING</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {report.description || 'No description provided'}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Reported on {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {report.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolveReport(report.id, 'Content removed')}
                              className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Remove Content
                            </button>
                            <button
                              onClick={() => handleResolveReport(report.id, 'No action needed')}
                              className="text-xs px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">User Management</h2>
            <p className="text-gray-600">
              User management features coming soon. You'll be able to:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>• Search and filter users</li>
              <li>• View user profiles and activity</li>
              <li>• Ban or suspend users</li>
              <li>• Grant admin privileges</li>
              <li>• View moderation history</li>
            </ul>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {selectedMessage && (
        <MessageModal 
          message={selectedMessage} 
          onClose={() => setSelectedMessage(null)} 
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  icon, 
  highlight = false 
}: { 
  title: string; 
  value: number; 
  icon: string; 
  highlight?: boolean;
}) {
  return (
    <div className={`
      bg-white rounded-lg shadow p-6
      ${highlight ? 'ring-2 ring-red-500' : ''}
    `}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

// Message Modal Component
function MessageModal({ 
  message, 
  onClose 
}: { 
  message: InboxMessage; 
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">{message.subject || 'No subject'}</h2>
              <p className="text-sm text-gray-600 mt-1">
                From: {message.sender_name || message.sender_email || 'Anonymous'}
              </p>
              <p className="text-sm text-gray-600">
                Date: {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{message.message}</p>
          </div>

          {message.response && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Response:</h3>
              <p className="text-gray-700">{message.response}</p>
              <p className="text-xs text-gray-500 mt-2">
                Responded on {new Date(message.responded_at!).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
