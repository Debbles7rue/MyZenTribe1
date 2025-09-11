// app/contact/page.tsx
// Copy this entire file to app/contact/page.tsx in your project

"use client";

import { useState } from "react";
import { sendContactMessage } from "@/lib/admin-utils";
import { supabase } from "@/lib/supabaseClient";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      // If not logged in, save their name and email with the message
      if (!user && (!formData.name.trim() || !formData.email.trim())) {
        setError("Please provide your name and email");
        setSending(false);
        return;
      }

      // Send the message to admin inbox
      const fullMessage = user 
        ? formData.message
        : `From: ${formData.name} (${formData.email})\n\n${formData.message}`;

      const { error: sendError } = await sendContactMessage(
        'contact',
        formData.subject,
        fullMessage
      );

      if (sendError) throw sendError;

      setSuccess(true);
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: ""
      });

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
      <div className="container-app py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
          <p className="text-gray-600 mb-8">
            Have a question, concern, or feedback? We'd love to hear from you!
          </p>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800">
                  Your message has been sent successfully! We'll get back to you soon.
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
              {/* Show name/email fields only for non-logged-in users */}
              <GuestFields 
                formData={formData} 
                setFormData={setFormData} 
              />

              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2">
                  Subject *
                </label>
                <input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="What is this about?"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={6}
                  placeholder="Tell us more..."
                  required
                />
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
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-8 p-6 bg-white rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-3">How Contact Messages Work</h2>
            <div className="space-y-2 text-gray-600">
              <p>💬 Messages are sent directly through the app to our admin team</p>
              <p>📱 Response time: Within 24-48 hours</p>
              <p>🌟 For urgent matters, please indicate in your subject line</p>
              <p>🔒 All messages are kept private and secure within MyZenTribe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for guest name/email fields
function GuestFields({ 
  formData, 
  setFormData 
}: { 
  formData: any; 
  setFormData: (data: any) => void;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  });

  if (isLoggedIn) return null;

  return (
    <>
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Your Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="John Doe"
          required={!isLoggedIn}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Your Email *
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="john@example.com"
          required={!isLoggedIn}
        />
      </div>
    </>
  );
}
