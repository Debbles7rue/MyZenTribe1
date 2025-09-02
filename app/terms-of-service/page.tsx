// app/terms-of-service/page.tsx
"use client";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
      <div className="container-app py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By accessing and using MyZenTribe, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-gray-700">
                MyZenTribe is a community platform that provides meditation, event planning, community building, 
                and emergency safety features. We reserve the right to modify or discontinue the service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Conduct</h2>
              <p className="text-gray-700 mb-3">You agree to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Use the service with kindness and respect for all users</li>
                <li>Not post harmful, offensive, or inappropriate content</li>
                <li>Not harass, bully, or threaten other users</li>
                <li>Not use the service for illegal activities</li>
                <li>Not spam or send unsolicited messages</li>
                <li>Respect the privacy and personal information of others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Safety & Emergency Features</h2>
              <p className="text-gray-700">
                The SOS emergency feature is provided as-is for your convenience. While we strive to make it reliable, 
                we cannot guarantee its availability at all times. In case of emergency, always contact official 
                emergency services (911 in the US) first.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Content Ownership</h2>
              <p className="text-gray-700">
                You retain ownership of content you post. By posting content, you grant MyZenTribe a license to 
                use, display, and distribute your content as part of the service. You are responsible for the 
                content you post.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Privacy</h2>
              <p className="text-gray-700">
                Your use of our service is also governed by our <a href="/privacy-policy" className="text-purple-600 hover:underline">Privacy Policy</a>. 
                Please review it to understand how we collect and use your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Disclaimers</h2>
              <p className="text-gray-700">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT THE 
                SERVICE WILL BE ERROR-FREE OR UNINTERRUPTED. USE OF THE SERVICE IS AT YOUR OWN RISK.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
              <p className="text-gray-700">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, MYZENTRIBE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
              <p className="text-gray-700">
                We reserve the right to suspend or terminate your account if you violate these terms or for 
                any other reason at our discretion. You may delete your account at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
              <p className="text-gray-700">
                We may update these Terms of Service from time to time. Continued use of the service after 
                changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contact Information</h2>
              <p className="text-gray-700">
                For questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">Email: legal@myzentribe.com</p>
                <p className="text-gray-700">Or use our <a href="/contact" className="text-purple-600 hover:underline">Contact Form</a></p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              By using MyZenTribe, you agree to these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
