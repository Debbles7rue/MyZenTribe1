// app/privacy/page.tsx
"use client";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
      <div className="container-app py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <p className="text-gray-700 mb-3">
                MyZenTribe collects information you provide directly to us, such as when you create an account, 
                update your profile, post content, or communicate with other users.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Account information (email, username, profile details)</li>
                <li>Content you create (posts, events, comments)</li>
                <li>Location data (only when you explicitly share it for events or SOS features)</li>
                <li>Emergency contact information (for SOS feature)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
              <p className="text-gray-700 mb-3">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Connect you with your communities and friends</li>
                <li>Send you notifications about your account and activities</li>
                <li>Ensure safety through our SOS emergency feature</li>
                <li>Respond to your comments, questions, and requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
              <p className="text-gray-700 mb-3">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>With your consent or at your direction</li>
                <li>With other users as part of the service (based on your privacy settings)</li>
                <li>For legal reasons or to prevent harm</li>
                <li>With emergency contacts when you use the SOS feature</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
              <p className="text-gray-700">
                We take reasonable measures to help protect your personal information from loss, theft, misuse, 
                unauthorized access, disclosure, alteration, and destruction. However, no internet or electronic 
                storage system is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Your Choices</h2>
              <p className="text-gray-700 mb-3">You have several choices regarding your information:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Update or correct your account information at any time</li>
                <li>Choose your privacy settings for posts and events</li>
                <li>Opt-out of certain notifications</li>
                <li>Delete your account (contact support)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Children's Privacy</h2>
              <p className="text-gray-700">
                MyZenTribe is not intended for children under 13 years of age. We do not knowingly collect 
                personal information from children under 13. If you are under 13, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of any changes by 
                posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">Email: privacy@myzentribe.com</p>
                <p className="text-gray-700">Or use our <a href="/contact" className="text-purple-600 hover:underline">Contact Form</a></p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              By using MyZenTribe, you agree to this Privacy Policy. Thank you for trusting us with your information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
