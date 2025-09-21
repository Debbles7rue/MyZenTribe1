// components/FriendQuestionnaireModal.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface FriendQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: string;
  friendName: string | null;
  currentUserId: string;
  onComplete?: () => void;
}

export default function FriendQuestionnaireModal({
  isOpen,
  onClose,
  friendId,
  friendName,
  currentUserId,
  onComplete
}: FriendQuestionnaireModalProps) {
  const [relationshipType, setRelationshipType] = useState<string>('friend');
  const [howWeMet, setHowWeMet] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // Save the questionnaire responses
      const { error } = await supabase
        .from('friend_questionnaires')
        .upsert({
          user_id: currentUserId,
          friend_id: friendId,
          relationship_type: relationshipType,
          how_we_met: howWeMet,
          private_notes: notes,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update the friendship with relationship type
      await supabase
        .from('friendships')
        .update({ 
          relationship_type: relationshipType,
          updated_at: new Date().toISOString()
        })
        .or(
          `and(user_id.eq.${currentUserId},friend_id.eq.${friendId}),` +
          `and(user_id.eq.${friendId},friend_id.eq.${currentUserId})`
        );

      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    onComplete?.();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">
              Tell us about your connection
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Help us understand your relationship with {friendName || 'your new friend'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Relationship Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How would you categorize this connection?
              </label>
              <div className="space-y-2">
                {[
                  { value: 'close_friend', label: '👥 Close Friend', desc: 'Someone I trust deeply' },
                  { value: 'friend', label: '😊 Friend', desc: 'A regular friend' },
                  { value: 'acquaintance', label: '👋 Acquaintance', desc: 'Someone I know casually' },
                  { value: 'family', label: '👨‍👩‍👧‍👦 Family', desc: 'Family member' },
                  { value: 'colleague', label: '💼 Colleague', desc: 'Work or professional contact' },
                  { value: 'community', label: '🌟 Community Member', desc: 'From a shared community' }
                ].map(type => (
                  <label
                    key={type.value}
                    className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                      relationshipType === type.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="relationshipType"
                      value={type.value}
                      checked={relationshipType === type.value}
                      onChange={(e) => setRelationshipType(e.target.value)}
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* How We Met */}
            <div>
              <label htmlFor="howWeMet" className="block text-sm font-medium text-gray-700 mb-2">
                How did you meet? (Private - only you can see this)
              </label>
              <textarea
                id="howWeMet"
                value={howWeMet}
                onChange={(e) => setHowWeMet(e.target.value)}
                placeholder="e.g., Met at yoga class, college roommate, work conference..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Private Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Private notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything you want to remember about this person..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                These notes are completely private and only visible to you
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
