// components/ReportModal.tsx
'use client';

import { useState } from 'react';
import { reportContent } from '@/lib/admin-utils';
import type { ContentReport } from '@/lib/admin-types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contentType: ContentReport['content_type'];
  contentId: string;
  contentName?: string;
}

const REPORT_REASONS: { value: ContentReport['reason'], label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'false_info', label: 'Misleading Information' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'violence', label: 'Violence or Threats' },
  { value: 'other', label: 'Other' }
];

export default function ReportModal({ isOpen, onClose, contentType, contentId, contentName }: Props) {
  const [reason, setReason] = useState<ContentReport['reason']>('spam');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      const { error: reportError } = await reportContent(
        contentType,
        contentId,
        reason,
        description || undefined
      );

      if (reportError) {
        throw reportError;
      }

      console.log('✅ Report submitted successfully');
      setSubmitted(true);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        // Reset form
        setTimeout(() => {
          setSubmitted(false);
          setReason('spam');
          setDescription('');
        }, 300);
      }, 2000);

    } catch (err: any) {
      console.error('❌ Error submitting report:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    onClose();
    // Reset form after close animation
    setTimeout(() => {
      setSubmitted(false);
      setReason('spam');
      setDescription('');
      setError(null);
    }, 300);
  }

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {submitted ? (
          // Success State
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Report Submitted
            </h2>
            <p className="text-gray-600">
              Thank you for helping keep our community safe. We'll review this report shortly.
            </p>
          </div>
        ) : (
          // Report Form
          <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Report {contentType}
            </h2>
            {contentName && (
              <p className="text-sm text-gray-600 mb-4">
                Reporting: <span className="font-medium">{contentName}</span>
              </p>
            )}

            {/* Reason Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for report <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ContentReport['reason'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
                disabled={submitting}
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide any additional information that might help us review this report..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={4}
                maxLength={500}
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                {description.length}/500 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>

            {/* Privacy Notice */}
            <p className="text-xs text-gray-500 mt-4 text-center">
              Reports are reviewed by our moderation team. False reports may result in action against your account.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
