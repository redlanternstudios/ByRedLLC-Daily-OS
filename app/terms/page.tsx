import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Use — byRed LLC",
  description: "Terms of Use for byRed LLC and the Authentic Hadith App.",
}

export default function TermsPage() {
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
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-[#888]">Last updated: May 4, 2026</p>

        <div className="mt-10 space-y-10 text-[#444] leading-7">
          <p>
            These Terms of Use (&ldquo;Terms&rdquo;) govern your use of the Authentic Hadith App
            (the &ldquo;App&rdquo;) and the website at byredllc.com (the &ldquo;Site&rdquo;),
            operated by byRed LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By
            accessing or using the App or Site, you agree to be bound by these Terms.
          </p>

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">1. Acceptance of Terms</h2>
            <p className="mt-4">
              By creating an account or using the App, you confirm that you are at least 13 years
              old and agree to comply with these Terms. If you do not agree, do not use the App.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">2. Account Registration</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must notify us immediately of any unauthorized access to your account.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">3. Permitted Use</h2>
            <p className="mt-4">The App is provided for personal, non-commercial use. You may:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Browse, read, and save hadiths for personal study.</li>
              <li>Create notes, folders, and collections for personal use.</li>
              <li>Share hadiths and folders using the App&apos;s built-in sharing features.</li>
              <li>Use the AI assistant for hadith-related questions.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">4. Prohibited Use</h2>
            <p className="mt-4">You may not:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Reverse-engineer, decompile, or disassemble any part of the App.</li>
              <li>Use the App to distribute harmful, misleading, or offensive content.</li>
              <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts.</li>
              <li>Use automated tools (bots, scrapers) to access the App or its data.</li>
              <li>Redistribute, sell, or sublicense the App or its content without our written permission.</li>
              <li>Misrepresent AI-generated responses as scholarly Islamic rulings (fatwa).</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">5. Subscriptions and Payments</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Premium features are available through in-app subscriptions (monthly, annual, or lifetime).</li>
              <li>Payments are processed by Apple (App Store) or Google (Play Store). We do not collect or store your payment information.</li>
              <li>Subscriptions auto-renew unless cancelled at least 24 hours before the current period ends.</li>
              <li>You can manage or cancel subscriptions through your device&apos;s subscription settings.</li>
              <li>Refunds are handled by Apple or Google according to their respective refund policies.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">6. Hadith Content</h2>
            <p className="mt-4">
              The hadith texts, translations, and gradings provided in the App are sourced from
              established scholarly collections. While we strive for accuracy, the App is an
              educational tool and should not be used as a sole source for Islamic legal rulings. We
              encourage users to consult qualified scholars for matters of fiqh (Islamic
              jurisprudence).
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">7. AI Assistant Disclaimer</h2>
            <p className="mt-4">
              The AI assistant feature uses large language models to answer hadith-related questions.
              AI responses are generated by machine learning models and may contain errors or
              inaccuracies. AI responses do not constitute Islamic scholarly opinions or legal advice.
              Always verify important information with qualified scholars and authenticated sources.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">8. User Content</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>You retain ownership of notes, annotations, and collections you create in the App.</li>
              <li>By sharing content publicly or via links, you grant us a non-exclusive license to display that content to the intended recipients.</li>
              <li>We may remove user content that violates these Terms or applicable law.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">9. Intellectual Property</h2>
            <p className="mt-4">
              The App&apos;s design, code, branding, and original content are the property of byRed
              LLC. Hadith texts are part of the Islamic scholarly tradition and are not claimed as our
              intellectual property. You may not use our trademarks, logos, or branding without
              written permission.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">10. Disclaimer of Warranties</h2>
            <p className="mt-4">
              The App is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, either express or implied. We do not guarantee that the App
              will be uninterrupted, error-free, or free of harmful components. We disclaim all
              warranties including, but not limited to, implied warranties of merchantability,
              fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">11. Limitation of Liability</h2>
            <p className="mt-4">
              To the maximum extent permitted by law, byRed LLC shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your use
              of the App, including but not limited to loss of data, loss of profits, or
              interruption of service.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">12. Governing Law</h2>
            <p className="mt-4">
              These Terms are governed by and construed in accordance with the laws of the State of
              California, United States, without regard to its conflict of law provisions. Any
              disputes arising under these Terms shall be resolved in the courts located in San
              Diego County, California.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">13. Changes to These Terms</h2>
            <p className="mt-4">
              We may update these Terms from time to time. When we make changes, we will update the
              &ldquo;Last updated&rdquo; date at the top of this page. Continued use of the App
              after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a]">14. Contact Us</h2>
            <div className="mt-4 rounded-lg bg-[#f0ede8] p-6">
              <p className="font-semibold text-[#1a1a1a]">byRed LLC</p>
              <p className="mt-1">
                Email:{" "}
                <a href="mailto:legal@byredllc.com" className="text-[#8b6914] underline hover:text-[#6a5010]">
                  legal@byredllc.com
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
