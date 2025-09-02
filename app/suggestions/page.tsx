// app/suggestions/page.tsx
// Copy this entire file to app/suggestions/page.tsx in your project

"use client";

import { useState } from "react";
import { sendContactMessage } from "@/lib/admin-utils";
import { supabase } from "@/lib/supabaseClient";

export default function SuggestionsPage() {
  const [formData, setFormData] = useState({
    category: "feature",
    subject: "",
    message: ""
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: "feature", label: "🚀 New Feature", description: "Suggest a new feature or functionality" },
    { value: "improvement", label: "✨ Improvement", description: "Ways to improve existing features" },
    { value: "community", label: "👥 Community", description: "Ideas for community building" },
    { value: "content", label: "📝 Content", description: "Content or resource suggestions" },
    { value: "other", label: "💡 Other", description: "Any other suggestions" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.subject.trim() || !formData.message.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setSending(true);

    try {
      // Format subject with category
      const categoryLabel = categories.find(c => c.value === formData.category)?.label || "Suggestion";
      const fullSubject = `${categoryLabel}: ${formData.subject}`;

      // Send the suggestion to admin inbox
      const { error: sendError } = await sendContactMessage(
        'suggestion',
        fullSubject,
        formData.message
      );

      if (sendError) throw sendError;

      setSuccess(true);
      setFormData({
        category: "feature",
        subject: "",
        message: ""
      });

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to send suggestion. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
      <div className="container-app py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Share Your Ideas</h1>
          <p className="text-gray-600 mb-8">
            Help us make MyZenTribe better! Your suggestions shape our community.
          </p>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800">
                  Thank you for your suggestion! We review every idea carefully.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card p-6">
              <div>
                <label className="block text-sm font-medium mb-3">
                  Category *
                </label>
                <div className="grid gap-2">
                  {categories.map((cat) => (
                    <label
                      key={cat.value}
                      className={`
                        flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${formData.category === cat.value 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        checked={formData.category === cat.value}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium">{cat.label}</div>
                        <div className="text-sm text-gray-600">{cat.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2">
                  Brief Title *
                </label>
                <input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Give your suggestion a title..."
                  maxLength={100}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.subject.length}/100 characters
                </p>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Your Suggestion *
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={8}
                  placeholder="Describe your idea in detail. The more specific, the better!"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Be as detailed as possible - explain the problem it solves and how it would work.
                </p>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  * Required fields
                </p>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? "Sending..." : "Submit Suggestion"}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2 text-purple-600">💭 What makes a great suggestion?</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Clear problem statement</li>
                <li>• Specific solution ideas</li>
                <li>• How it benefits the community</li>
                <li>• Real-world examples</li>
              </ul>
            </div>
            
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2 text-purple-600">🎯 Our Promise</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Every suggestion is reviewed</li>
                <li>• Popular ideas get priority</li>
                <li>• We'll credit contributors</li>
                <li>• Updates in our changelog</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
