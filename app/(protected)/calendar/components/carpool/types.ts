// app/(protected)/calendar/components/carpool/types.ts
// ENHANCED: Added new interfaces while preserving all existing ones

import type { DBEvent } from '@/lib/types';

// ===== EXISTING INTERFACES (PRESERVED) =====
export interface EventCarpoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: DBEvent | null;
  userId: string | null;
  carpoolGroupId?: string;
  carpoolData?: {
    carpoolMatches: any[];
    friends: any[];
    sendCarpoolInvite: (matchId: string, message?: string) => Promise<any>;
    createCarpoolGroup: (eventId: string, friendIds: string[], message?: string) => Promise<any>;
  };
  showToast?: (toast: { type: string; message: string }) => void;
  isMobile?: boolean;
  onOpenSettings?: () => void;
}

export interface Message {
  id: number;
  user: string;
  userId?: string;
  message: string;
  time: string;
  avatar: string;
  isAI?: boolean;
  reactions?: string[];
  isEventPost?: boolean;
  edited?: boolean;
  eventData?: {
    title: string;
    date: string;
    time: string;
    location: string;
  };
}

export interface Poll {
  id: string;
  question: string;
  options: { text: string; votes: string[] }[];
  createdBy: string;
  active: boolean;
}

export interface CarpoolStats {
  totalFriends: number;
  needingRides: number;
  driversAvailable: number;
  estimatedSavings: string;
  distanceAway: number;
}

export interface CarpoolGroup {
  id: string;
  event_id: string;
  creator_id: string;
  name: string;
  status: 'active' | 'completed' | 'archived';
  participant_count: number;
  created_at: string;
  last_activity: string;
  meetup_location?: string;
  departure_time?: string;
  participants: CarpoolParticipant[];
}

export interface CarpoolParticipant {
  id: string;
  group_id: string;
  user_id: string;
  role: 'creator' | 'driver' | 'rider' | 'member';
  joined_at: string;
  user_name: string;
}

export interface CarDetails {
  seats: number;
  make: string;
  color: string;
}

export interface EventDetails {
  meetupLocation: string;
  departureTime: string;
  notes: string;
}

export interface AISuggestions {
  meetupSpot: string;
  departureTime: string;
  route: string;
  parking: string;
  weatherAlert?: string | null;
  alternativeRoute?: string;
}

export type DriverStatus = 'none' | 'driver' | 'rider';
export type ActiveView = 'overview' | 'coordination' | 'chat';

// Component Props Interfaces
export interface CarpoolOverviewProps {
  event: DBEvent;
  carpoolStats: CarpoolStats;
  aiSuggestions: AISuggestions | null;
  onQuickAction: (action: string) => void;
  driverStatus: DriverStatus;
  onSetDriverStatus: (status: DriverStatus) => void;
  carDetails: CarDetails;
  onEditCarDetails: () => void;
  onEditEventDetails: () => void;
  isMobile?: boolean;
  // FIXED: Added missing friend invite prop
  onOpenFriendInvite?: () => void;
  onOpenProfileSettings?: () => void;
  showToast?: (toast: { type: string; message: string }) => void;
  // Enhanced persistence props
  persistenceState?: {
    currentCarpoolId: string | null;
    isSaving: boolean;
    lastSaved: Date | null;
    saveError: string | null;
    isOnline: boolean;
    syncStatus: 'synced' | 'pending' | 'error';
  };
  onSaveData?: () => void;
  onSyncPendingChanges?: () => void;
  tempEventDetails?: EventDetails;
  onSaveCarDetails?: () => void;
  isEditingCarDetails?: boolean;
  tempCarDetails?: CarDetails;
}

export interface CarpoolChatProps {
  messages: Message[];
  polls: Poll[];
  newMessage: string;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onVoiceRecord: () => void;
  isVoiceRecording: boolean;
  onVotePoll: (pollId: string, optionIndex: number) => void;
  onEditMessage: (messageId: number, currentText: string) => void;
  onDeleteMessage: (messageId: number) => void;
  onEditPoll: (pollId: string, currentQuestion: string) => void;
  onDeletePoll: (pollId: string) => void;
  onChangeVote: (pollId: string, oldOptionIndex: number, newOptionIndex: number) => void;
  editingMessage: number | null;
  editMessageText: string;
  onEditMessageTextChange: (text: string) => void;
  onSaveEditMessage: () => void;
  onCancelEditMessage: () => void;
  editingPoll: string | null;
  editPollText: string;
  onEditPollTextChange: (text: string) => void;
  onSaveEditPoll: () => void;
  onCancelEditPoll: () => void;
  userId: string | null;
  isMobile?: boolean;
}

export interface CarpoolSidebarsProps {
  selectedFriends: string[];
  onFriendToggle: (friendId: string) => void;
  carpoolData?: {
    friends: any[];
    createCarpoolGroup?: (eventId: string, friendIds: string[], message?: string) => Promise<any>;
  };
  event: DBEvent;
  onShowPoll: () => void;
  onShowEditCarDetails: () => void;
  onShowEditEventDetails: () => void;
  onQuickAction: (action: string) => void;
  showToast?: (toast: { type: string; message: string }) => void;
  isMobile?: boolean;
}

export interface CarpoolModalsProps {
  showPoll: boolean;
  onClosePoll: () => void;
  newPollQuestion: string;
  onPollQuestionChange: (question: string) => void;
  onCreatePoll: () => void;
  showEditCarDetails: boolean;
  onCloseEditCarDetails: () => void;
  tempCarDetails: CarDetails;
  onTempCarDetailsChange: (details: CarDetails) => void;
  onSaveCarDetails: () => void;
  showEditEventDetails: boolean;
  onCloseEditEventDetails: () => void;
  tempEventDetails: EventDetails;
  onTempEventDetailsChange: (details: EventDetails) => void;
  onSaveEventDetails: () => void;
  showNewCarpoolConfirm: boolean;
  onCloseNewCarpoolConfirm: () => void;
  onStartNewCarpool: () => void;
  showInfo: boolean;
  onCloseInfo: () => void;
  showProfileSettings: boolean;
  onCloseProfileSettings: () => void;
  // FIXED: Added proper friend invite modal props that use FriendSelector
  showFriendInvite: boolean;
  onCloseFriendInvite: () => void;
  selectedFriendsToInvite: string[];
  onSelectedFriendsToInviteChange: (friendIds: string[]) => void;
  onSendFriendInvites: () => void;
  userId: string | null;
  showToast?: (toast: { type: string; message: string }) => void;
  isMobile?: boolean;
}

// ===== NEW INTERFACES ADDED (SAFE ADDITIONS) =====

// NEW: Enhanced persistence interfaces from CarpoolManager refactoring
export interface CarpoolData {
  messages: any[];
  polls: any[];
  selectedFriends: string[];
  driverStatus: string;
  carDetails: any;
  tempEventDetails: any;
}

export interface PersistenceOptions {
  useSupabase?: boolean;
  useLocalStorage?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

export interface PersistenceState {
  currentCarpoolId: string | null;
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  isOnline: boolean;
  syncStatus: 'synced' | 'pending' | 'error';
}

// NEW: Hook return interface for the new service layer
export interface CarpoolManagerHookReturn {
  // State
  carpoolGroups: CarpoolGroup[];
  loading: boolean;
  selectedCarpool: CarpoolGroup | null;
  persistenceState: PersistenceState;
  persistenceOptions: PersistenceOptions;
  
  // Group Management
  loadCarpoolGroups: () => Promise<void>;
  createNewCarpool: (name: string) => Promise<void>;
  archiveCarpool: (groupId: string) => Promise<void>;
  deleteCarpool: (groupId: string) => Promise<void>;
  openCarpool: (group: CarpoolGroup) => void;
  setSelectedCarpool: (group: CarpoolGroup | null) => void;
  
  // Persistence Services
  saveCarpoolData: (carpoolId: string, data: CarpoolData, options?: Partial<PersistenceOptions>) => Promise<any>;
  loadCarpoolData: (carpoolId?: string) => Promise<any>;
  syncPendingChanges: () => Promise<void>;
  
  // Utilities
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => string;
  getSyncStatusIcon: () => { icon: string; className: string; title: string };
}

// NEW: Props for the new UI component architecture
export interface CarpoolManagerUIProps {
  isOpen: boolean;
  onClose: () => void;
  event: DBEvent | null;
  userId: string | null;
  showToast?: (toast: { type: string; message: string }) => void;
  isMobile?: boolean;
  onOpenSettings?: () => void;
}

// PRESERVED: Original manager props (keeping for backward compatibility)
export interface CarpoolManagerProps {
  isOpen: boolean;
  onClose: () => void;
  event: DBEvent | null;
  userId: string | null;
  showToast?: (toast: { type: string; message: string }) => void;
  isMobile?: boolean;
  onOpenSettings?: () => void;
}
