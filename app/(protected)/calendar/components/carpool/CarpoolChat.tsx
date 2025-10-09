// app/(protected)/calendar/components/carpool/CarpoolChat.tsx

import React, { useRef, useEffect } from 'react';
import {
  Send, Mic, Calendar, Clock, MapPin, Navigation, Share2,
  Edit, Trash2, ThumbsUp, Heart, CheckCircle, X, Check
} from 'lucide-react';
import type { CarpoolChatProps } from './types';

// ADDED: Extended props interface to include onViewProfile
interface ExtendedCarpoolChatProps extends CarpoolChatProps {
  onViewProfile?: (userId: string) => void;
}

const CarpoolChat: React.FC<ExtendedCarpoolChatProps> = ({
  messages,
  polls,
  newMessage,
  onMessageChange,
  onSendMessage,
  onVoiceRecord,
  isVoiceRecording,
  onVotePoll,
  onEditMessage,
  onDeleteMessage,
  onEditPoll,
  onDeletePoll,
  onChangeVote,
  editingMessage,
  editMessageText,
  onEditMessageTextChange,
  onSaveEditMessage,
  onCancelEditMessage,
  editingPoll,
  editPollText,
  onEditPollTextChange,
  onSaveEditPoll,
  onCancelEditPoll,
  userId,
  isMobile = false,
  onViewProfile // ADDED: New prop for viewing profiles
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Event Post Component
  const EventPost = ({ eventData }: { eventData: any }) => (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 my-2">
      <div className="flex items-start gap-3">
        <div className="bg-blue-500 text-white p-2 rounded-lg">
          <Calendar size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {eventData.title}
          </h4>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock size={14} />
              <span>{eventData.date} • {eventData.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              <span>{eventData.location}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
              <Navigation className="inline mr-1" size={12} />
              Directions
            </button>
            <button className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
              <Share2 className="inline mr-1" size={12} />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Messages Area - FIXED: Proper height constraints */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50 dark:bg-gray-950">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${
                msg.userId === userId ? 'flex-row-reverse' : ''
              }`}
            >
              <span className="text-2xl flex-shrink-0">{msg.avatar}</span>
              <div className={`max-w-[70%] ${msg.userId === userId ? 'items-end' : ''}`}>
                {msg.isEventPost ? (
                  <EventPost eventData={msg.eventData} />
                ) : (
                  <>
                    {/* ADDED: Username display with click handler for mobile */}
                    {msg.userId !== userId && !msg.isAI && (
                      <div className="mb-1 px-1">
                        <button
                          onClick={() => msg.userId && onViewProfile?.(msg.userId)}
                          className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                        >
                          {msg.user}
                        </button>
                      </div>
                    )}
                    <div className={`rounded-2xl px-3 py-2 ${
                      msg.userId === userId
                        ? 'bg-blue-500 text-white'
                        : msg.isAI
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {msg.time}
                      </span>
                      {msg.edited && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                          (edited)
                        </span>
                      )}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex gap-1">
                          {msg.reactions.map((reaction, idx) => (
                            <span key={idx} className="text-xs">
                              {reaction}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Active Polls - FIXED: No flex interference */}
        {polls.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-t dark:border-gray-700">
            {polls.map(poll => (
              <div key={poll.id} className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{poll.question}</p>
                  {poll.createdBy === userId && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditPoll(poll.id, poll.question)}
                        className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => onDeletePoll(poll.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {poll.options.map((option, idx) => {
                    const userVoted = option.votes.includes(userId || '');
                    const userVotedElsewhere = poll.options.some((opt, i) => 
                      i !== idx && opt.votes.includes(userId || '')
                    );
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (userVoted) {
                            // Remove vote if clicking same option
                            onVotePoll(poll.id, idx);
                          } else if (userVotedElsewhere) {
                            // Change vote if user voted elsewhere
                            const oldIndex = poll.options.findIndex(opt => 
                              opt.votes.includes(userId || '')
                            );
                            onChangeVote(poll.id, oldIndex, idx);
                          } else {
                            // New vote
                            onVotePoll(poll.id, idx);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg transition-colors text-sm active:scale-95 ${
                          userVoted
                            ? 'bg-blue-500 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border dark:border-gray-600'
                        }`}
                      >
                        {option.text} ({option.votes.length})
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Area - FIXED: Stays at bottom */}
        <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={onVoiceRecord}
              className={`p-2 rounded-full transition-colors active:scale-95 ${
                isVoiceRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Mic size={20} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={onSendMessage}
              className="p-2 bg-blue-500 text-white rounded-full active:scale-95"
              disabled={!newMessage.trim()}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-950">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.userId === userId ? 'flex-row-reverse' : ''
            }`}
          >
            <span className="text-3xl flex-shrink-0">{msg.avatar}</span>
            <div className={`max-w-[60%] ${msg.userId === userId ? 'items-end' : ''}`}>
              {msg.isEventPost ? (
                <EventPost eventData={msg.eventData} />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    {/* UPDATED: Made username clickable for desktop */}
                    <button
                      onClick={() => msg.userId && onViewProfile?.(msg.userId)}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                      title="View profile"
                    >
                      {msg.user}
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {msg.time}
                    </span>
                    {msg.edited && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                        (edited)
                      </span>
                    )}
                    {/* Edit controls for user's own messages */}
                    {msg.userId === userId && !msg.isAI && (
                      <div className="flex gap-1 ml-auto">
                        <button
                          onClick={() => onEditMessage(msg.id, msg.message)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit message"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteMessage(msg.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete message"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {editingMessage === msg.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editMessageText}
                        onChange={(e) => onEditMessageTextChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={onSaveEditMessage}
                          className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={onCancelEditMessage}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.userId === userId
                        ? 'bg-blue-500 text-white'
                        : msg.isAI
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}>
                      <p>{msg.message}</p>
                    </div>
                  )}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex gap-1 mt-1 px-2">
                      {msg.reactions.map((reaction, idx) => (
                        <span key={idx} className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                          {reaction}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Active Polls */}
      {polls.length > 0 && (
        <div className="flex-shrink-0 px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-t dark:border-gray-700">
          {polls.map(poll => (
            <div key={poll.id} className="mb-4">
              <div className="flex items-center justify-between mb-3">
                {editingPoll === poll.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editPollText}
                      onChange={(e) => onEditPollTextChange(e.target.value)}
                      className="flex-1 px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={onSaveEditPoll}
                      className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={onCancelEditPoll}
                      className="px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{poll.question}</p>
                    {poll.createdBy === userId && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => onEditPoll(poll.id, poll.question)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit poll"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => onDeletePoll(poll.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete poll"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {editingPoll !== poll.id && (
                <div className="flex gap-3">
                  {poll.options.map((option, idx) => {
                    const userVoted = option.votes.includes(userId || '');
                    const userVotedElsewhere = poll.options.some((opt, i) => 
                      i !== idx && opt.votes.includes(userId || '')
                    );
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (userVoted) {
                            // Remove vote if clicking same option
                            onVotePoll(poll.id, idx);
                          } else if (userVotedElsewhere) {
                            // Change vote if user voted elsewhere
                            const oldIndex = poll.options.findIndex(opt => 
                              opt.votes.includes(userId || '')
                            );
                            onChangeVote(poll.id, oldIndex, idx);
                          } else {
                            // New vote
                            onVotePoll(poll.id, idx);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          userVoted
                            ? 'bg-blue-500 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {option.text} ({option.votes.length})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onVoiceRecord}
            className={`p-2 rounded-full transition-colors ${
              isVoiceRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Mic size={20} />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onSendMessage}
            className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            disabled={!newMessage.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CarpoolChat;
