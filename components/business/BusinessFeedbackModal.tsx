'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { FeedbackModalStep, FeedbackFormData, FeedbackType, FeedbackRating, BusinessFeedback } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  existingFeedback?: BusinessFeedback | null;
  onFeedbackSubmitted: () => void;
}

export default function BusinessFeedbackModal({ 
  isOpen, 
  onClose, 
  businessId, 
  businessName,
  existingFeedback,
  onFeedbackSubmitted 
}: Props) {
  const [currentStep, setCurrentStep] = useState<FeedbackModalStep>('type');
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: null,
    rating: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with existing feedback if available
  useEffect(() => {
    if (existingFeedback) {
      setFormData({
        type: existingFeedback.feedback_type,
        rating: existingFeedback.rating
      });
      setCurrentStep('rating'); // Skip to rating step for updates
    } else {
      setFormData({ type: null, rating: null });
      setCurrentStep('type');
    }
  }, [existingFeedback, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('type');
      setFormData({ type: null, rating: null });
      setError(null);
    }
  }, [isOpen]);

  async function submitFeedback() {
    if (!formData.type || !formData.rating) return;

    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to give feedback');

      if (existingFeedback) {
        // Update existing feedback
        const { error } = await supabase
          .from('business_feedback')
          .update({
            feedback_type: formData.type,
            rating: formData.rating,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingFeedback.id);

        if (error) throw error;
      } else {
        // Create new feedback
        const { error } = await supabase
          .from('business_feedback')
          .insert({
            business_id: businessId,
            user_id: user.id,
            feedback_type: formData.type,
            rating: formData.rating
          });

        if (error) throw error;
      }

      onFeedbackSubmitted();
      onClose();
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  }

  function handleTypeSelect(type: FeedbackType) {
    setFormData(prev => ({ ...prev, type }));
    setCurrentStep('explanation');
  }

  function handleNext() {
    if (currentStep === 'explanation') {
      setCurrentStep('rating');
    }
  }

  function handleBack() {
    if (currentStep === 'rating') {
      setCurrentStep('explanation');
    } else if (currentStep === 'explanation') {
      setCurrentStep('type');
    }
  }

  function handleRatingSelect(rating: FeedbackRating) {
    setFormData(prev => ({ ...prev, rating }));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {existingFeedback ? 'Update Feedback' : 'Give Feedback'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Help others by sharing your experience with <strong>{businessName}</strong>
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2">
              {['type', 'explanation', 'rating'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${
                    currentStep === step ? 'bg-purple-600' :
                    (index < ['type', 'explanation', 'rating'].indexOf(currentStep)) ? 'bg-purple-300' : 'bg-gray-200'
                  }`} />
                  {index < 2 && (
                    <div className={`w-8 h-0.5 mx-1 ${
                      index < ['type', 'explanation', 'rating'].indexOf(currentStep) ? 'bg-purple-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Type Selection */}
          {currentStep === 'type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-center mb-6">
                How did you interact with {businessName}?
              </h3>
              
              <button
                onClick={() => handleTypeSelect('service')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  formData.type === 'service'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                }`}
              >
                <div className="font-medium">I used their services</div>
                <div className="text-sm text-gray-600 mt-1">
                  Hired them, bought something, received treatment, etc.
                </div>
              </button>

              <button
                onClick={() => handleTypeSelect('event')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  formData.type === 'event'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                }`}
              >
                <div className="font-medium">I attended their events</div>
                <div className="text-sm text-gray-600 mt-1">
                  Went to workshops, classes, meetups, or other events
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Explanation */}
          {currentStep === 'explanation' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-center mb-6">
                {formData.type === 'service' 
                  ? 'About Using Their Services' 
                  : 'About Attending Their Events'
                }
              </h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-800">
                  {formData.type === 'service' ? (
                    <>
                      <strong>Service Experience:</strong> This means you actually paid for or received 
                      services from {businessName}. This could include purchasing products, receiving 
                      treatments, hiring them for work, or any direct business transaction.
                    </>
                  ) : (
                    <>
                      <strong>Event Experience:</strong> This means you attended events, workshops, 
                      classes, or meetups organized by {businessName}. You were physically present 
                      or participated in their activities.
                    </>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm text-yellow-800">
                  <strong>Important:</strong> Only provide feedback based on real experiences. 
                  False feedback helps no one and hurts the community.
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                I understand, continue
              </button>
            </div>
          )}

          {/* Step 3: Rating */}
          {currentStep === 'rating' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-center mb-6">
                Based on your experience, would you recommend {businessName}?
              </h3>

              <button
                onClick={() => handleRatingSelect('positive')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  formData.rating === 'positive'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👍</span>
                  <div>
                    <div className="font-medium text-green-700">Legit, I recommend them</div>
                    <div className="text-sm text-gray-600">
                      Good experience, would use again or recommend to others
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRatingSelect('negative')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  formData.rating === 'negative'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👎</span>
                  <div>
                    <div className="font-medium text-red-700">Not legit, I don't recommend</div>
                    <div className="text-sm text-gray-600">
                      Poor experience, would not use again or recommend
                    </div>
                  </div>
                </div>
              </button>

              {formData.rating && (
                <button
                  onClick={submitFeedback}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {existingFeedback ? 'Updating...' : 'Submitting...'}
                    </div>
                  ) : (
                    existingFeedback ? 'Update Feedback' : 'Submit Feedback'
                  )}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        {currentStep !== 'type' && (
          <div className="flex justify-between p-6 border-t bg-gray-50">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back
            </button>
            <div className="text-sm text-gray-500">
              Step {['type', 'explanation', 'rating'].indexOf(currentStep) + 1} of 3
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
