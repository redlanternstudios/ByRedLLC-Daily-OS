import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — byRed LLC",
  description: "Privacy Policy for byRed LLC and the Authentic Hadith App.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fafaf8] text-[#2c2c2c]">
      <div className="mx-auto max-w-3xl px-5 py-16 md:py-24">
        <Link
          href="/"
          className="mb-10 inline-block text-sm text-[#888] hover:text-[#444] transition-colors"
        >
          &larr; Back to byredllc.com
        </Link>

        <h1 className="text-3xl font-bold text-[#1a1a1a] md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-[#888]">Last updated: May 4, 2026</p>

        <div className="mt-10 space-y-10 text-[#444] leading-7">
          <p>
            byRed LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the
            Authentic Hadith App (the &ldquo;App&rdquo;), available on iOS and Android. This
            Privacy Policy explains what information we collect, how we use it, and your rights
            regarding your data.
          </p>
          <p>
            By using the App, you agree to the collection and use of information as described in
            this policy.
          </p>

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">1. Information We Collect</h2>

            <h3 className="mt-6 text-base font-semibold text-[#333]">
              1.1 Information You Provide
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f0ede8]">
                    <th className="border border-[#e0ddd8] px-3 py-2 text-left font-semibold text-[#1a1a1a]">Data Type</th>
                    <th className="border border-[#e0ddd8] px-3 py-2 text-left font-semibold text-[#1a1a1a]">When Collected</th>
                    <th className="border border-[#e0ddd8] px-3 py-2 text-left font-semibold text-[#1a1a1a]">Required</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Email address</td><td className="border border-[#e0ddd8] px-3 py-2">Account registration and login</td><td className="border border-[#e0ddd8] px-3 py-2">Yes</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Password</td><td className="border border-[#e0ddd8] px-3 py-2">Account registration (hashed, never stored in plain text)</td><td className="border border-[#e0ddd8] px-3 py-2">Yes</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Full name</td><td className="border border-[#e0ddd8] px-3 py-2">Account registration</td><td className="border border-[#e0ddd8] px-3 py-2">No</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Notes and annotations</td><td className="border border-[#e0ddd8] px-3 py-2">When you save notes on hadiths</td><td className="border border-[#e0ddd8] px-3 py-2">No</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Folders and collections</td><td className="border border-[#e0ddd8] px-3 py-2">When you organize saved hadiths</td><td className="border border-[#e0ddd8] px-3 py-2">No</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Chat messages</td><td className="border border-[#e0ddd8] px-3 py-2">When you use the AI assistant feature</td><td className="border border-[#e0ddd8] px-3 py-2">No</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Quiz responses</td><td className="border border-[#e0ddd8] px-3 py-2">When you complete quizzes</td><td className="border border-[#e0ddd8] px-3 py-2">No</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-6 text-base font-semibold text-[#333]">
              1.2 Information Collected Automatically
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f0ede8]">
                    <th className="border border-[#e0ddd8] px-3 py-2 text-left font-semibold text-[#1a1a1a]">Data Type</th>
                    <th className="border border-[#e0ddd8] px-3 py-2 text-left font-semibold text-[#1a1a1a]">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Usage statistics (hadiths read, streaks, XP)</td><td className="border border-[#e0ddd8] px-3 py-2">Gamification and progress tracking</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Reading progress</td><td className="border border-[#e0ddd8] px-3 py-2">Resuming stories and lessons where you left off</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Lesson and learning path completion</td><td className="border border-[#e0ddd8] px-3 py-2">Tracking your educational progress</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Achievement unlocks</td><td className="border border-[#e0ddd8] px-3 py-2">Displaying your accomplishments</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Language and theme preferences</td><td className="border border-[#e0ddd8] px-3 py-2">Personalizing the App experience</td></tr>
                  <tr><td className="border border-[#e0ddd8] px-3 py-2">Subscription status</td><td className="border border-[#e0ddd8] px-3 py-2">Providing access to premium features</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-6 text-base font-semibold text-[#333]">
              1.3 Information We Do Not Collect
            </h3>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Precise or coarse location data</li>
              <li>Contacts, photos, or camera data</li>
              <li>Health or fitness data</li>
              <li>Device advertising identifiers (IDFA)</li>
              <li>Browsing history outside the App</li>
              <li>Biometric data</li>
              <li>Phone number</li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">2. How We Use Your Information</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li><strong>App Functionality:</strong> To provide core features including authentication, saving hadiths, tracking progress, and syncing data across your devices.</li>
              <li><strong>Personalization:</strong> To remember your language preference, theme, and learning progress.</li>
              <li><strong>Subscriptions:</strong> To manage your premium subscription status and restore purchases.</li>
              <li><strong>AI Assistant:</strong> To process your questions and provide hadith-related responses through our AI chat feature.</li>
              <li><strong>Improvement:</strong> To understand how features are used so we can improve the App.</li>
            </ul>
            <p className="mt-4">
              We do not use your data for advertising, profiling, or selling to third parties.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">3. Third-Party Services</h2>
            <p className="mt-4">
              The App uses the following third-party services to operate. Each service receives only
              the data necessary for its function:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f0ede8]">
                    <th className="border border-[#e0ddd8] px-3 py-2 text-left font-semibold text-[#1a1a1a]">Service</th>
                    <th className="border border-[#e0ddd8] px-3 py-2 text-left font-semibold text-[#1a1a1a]">Purpose</th>
                    <th className="border border-[#e0ddd8] px-3 py-2 text-left font-semibold text-[#1a1a1a]">Data Shared</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#e0ddd8] px-3 py-2 font-medium">Supabase</td>
                    <td className="border border-[#e0ddd8] px-3 py-2">Backend database, authentication, and data storage</td>
                    <td className="border border-[#e0ddd8] px-3 py-2">Account info, user content (notes, folders, progress), usage statistics</td>
                  </tr>
                  <tr>
                    <td className="border border-[#e0ddd8] px-3 py-2 font-medium">RevenueCat</td>
                    <td className="border border-[#e0ddd8] px-3 py-2">Subscription and in-app purchase management</td>
                    <td className="border border-[#e0ddd8] px-3 py-2">User ID, purchase transactions, subscription status</td>
                  </tr>
                  <tr>
                    <td className="border border-[#e0ddd8] px-3 py-2 font-medium">Groq (via our server)</td>
                    <td className="border border-[#e0ddd8] px-3 py-2">AI-powered hadith assistant</td>
                    <td className="border border-[#e0ddd8] px-3 py-2">Chat messages you send to the AI assistant</td>
                  </tr>
                  <tr>
                    <td className="border border-[#e0ddd8] px-3 py-2 font-medium">Apple / Google</td>
                    <td className="border border-[#e0ddd8] px-3 py-2">Payment processing for subscriptions</td>
                    <td className="border border-[#e0ddd8] px-3 py-2">Payment is handled entirely by Apple/Google; we do not receive or store credit card information</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">Each third-party service operates under its own privacy policy:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Supabase: <a href="https://supabase.com/privacy" className="text-[#8b6914] underline hover:text-[#6a5010]">supabase.com/privacy</a></li>
              <li>RevenueCat: <a href="https://www.revenuecat.com/privacy" className="text-[#8b6914] underline hover:text-[#6a5010]">revenuecat.com/privacy</a></li>
              <li>Groq: <a href="https://groq.com/privacy-policy" className="text-[#8b6914] underline hover:text-[#6a5010]">groq.com/privacy-policy</a></li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">4. Data Storage and Security</h2>

            <h3 className="mt-6 text-base font-semibold text-[#333]">4.1 Remote Storage</h3>
            <p className="mt-3">
              Your account data, saved content, and progress are stored on Supabase servers secured
              with encryption in transit (TLS/SSL) and row-level security policies that restrict data
              access to your account only.
            </p>

            <h3 className="mt-6 text-base font-semibold text-[#333]">4.2 On-Device Storage</h3>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li><strong>Authentication tokens</strong> are stored in iOS Keychain (encrypted) via Expo SecureStore.</li>
              <li><strong>Offline cache</strong> (saved hadiths and folders) is stored in a local SQLite database so the App works without an internet connection.</li>
              <li><strong>Preferences</strong> (theme, language, onboarding status) are stored in local device storage.</li>
            </ul>

            <h3 className="mt-6 text-base font-semibold text-[#333]">4.3 Security Measures</h3>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>All network communication uses HTTPS encryption.</li>
              <li>Passwords are hashed using industry-standard algorithms and are never stored in plain text.</li>
              <li>Database access is governed by row-level security, ensuring users can only access their own data.</li>
              <li>API keys and secrets are stored securely and are not exposed in the App bundle.</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">5. AI Assistant and Chat Data</h2>
            <p className="mt-4">
              When you use the AI assistant feature, your messages are sent from the App to our
              server, which forwards them to Groq&apos;s large language model for processing. Chat
              messages are used solely to generate responses to your questions. We do not use your
              chat messages to train AI models. Chat history is stored temporarily in your
              device&apos;s memory during the session and is not permanently saved to our servers.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">6. Data Retention</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li><strong>Account data:</strong> Retained for as long as your account is active.</li>
              <li><strong>User content</strong> (notes, folders, saved hadiths): Retained until you delete them or delete your account.</li>
              <li><strong>Usage statistics:</strong> Retained for as long as your account is active.</li>
              <li><strong>Chat messages:</strong> Not permanently stored on our servers.</li>
            </ul>
            <p className="mt-4">
              When you delete your account, your personal data is archived for up to 30 days (to
              allow recovery if requested) and then permanently deleted from our active systems.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">7. Your Rights</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li><strong>Access:</strong> You can view your profile information, saved content, and statistics within the App at any time.</li>
              <li><strong>Correction:</strong> You can update your name and email through the App settings.</li>
              <li><strong>Deletion:</strong> You can delete individual notes, folders, and saved hadiths at any time. You can request full account deletion by contacting us at the email below.</li>
              <li><strong>Export:</strong> You can request a copy of your data by contacting us.</li>
              <li><strong>Opt-out:</strong> You can stop using optional features (AI assistant, gamification) at any time without affecting core App functionality.</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">8. Children&apos;s Privacy</h2>
            <p className="mt-4">
              The App is not directed at children under the age of 13. We do not knowingly collect
              personal information from children under 13. If you are a parent or guardian and believe
              your child has provided us with personal information, please contact us at the email
              below and we will promptly delete that information.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">9. California Privacy Rights (CCPA)</h2>
            <p className="mt-4">If you are a California resident, you have the right to:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Know what personal information we collect about you.</li>
              <li>Request deletion of your personal information.</li>
              <li>Opt out of the sale of your personal information. We do not sell your personal information.</li>
              <li>Not be discriminated against for exercising your privacy rights.</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@byredllc.com" className="text-[#8b6914] underline hover:text-[#6a5010]">
                privacy@byredllc.com
              </a>.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">10. International Data Transfers</h2>
            <p className="mt-4">
              Your data may be processed on servers located outside your country of residence,
              including the United States. By using the App, you consent to the transfer of your
              information to these locations. We ensure all transfers are protected by appropriate
              security measures.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">11. Changes to This Policy</h2>
            <p className="mt-4">
              We may update this Privacy Policy from time to time. When we make changes, we will
              update the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of
              the App after changes constitutes acceptance of the updated policy. For material
              changes, we will provide notice within the App.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">12. Contact Us</h2>
            <div className="mt-4 rounded-lg bg-[#f0ede8] p-6">
              <p className="font-semibold text-[#1a1a1a]">byRed LLC</p>
              <p className="mt-1">
                Email:{" "}
                <a href="mailto:privacy@byredllc.com" className="text-[#8b6914] underline hover:text-[#6a5010]">
                  privacy@byredllc.com
                </a>
              </p>
              <p className="mt-1">
                Website:{" "}
                <a href="https://byredllc.com" className="text-[#8b6914] underline hover:text-[#6a5010]">
                  byredllc.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
