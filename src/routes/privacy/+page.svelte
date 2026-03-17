<script lang="ts">
</script>

<main class="flex-grow max-w-4xl mx-auto px-6 py-20 w-full font-sans">
    <h1 class="text-4xl font-bold font-serif text-resin-charcoal mb-8">
        Privacy Policy
    </h1>

    <div class="prose prose-resin max-w-none text-resin-earth/90 space-y-6">
        <p><strong>Last Updated:</strong> March 17, 2026</p>

        <p><strong>Company:</strong> LoopLess LLC, State of Illinois, United States</p>

        <p>
            This Privacy Policy explains how Resin ("we," "us," "our," or "LoopLess LLC")
            collects, uses, and discloses your information when you use our web application,
            iOS application, Chrome browser extension, and related services (collectively, the "Services").
            By using the Services, you agree to the collection and use of information in
            accordance with this policy. If you do not agree with our policies and practices, please do not use our Services.
        </p>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            1. Information We Collect
        </h2>

        <h3 class="text-xl font-semibold text-resin-forest mt-6 mb-3">
            1.1 Account Information
        </h3>
        <p>
            When you create a Resin account, we collect your email address, authentication credentials,
            and basic profile information (name, timezone, avatar). This information is securely stored in our database via Supabase
            and is used to authenticate and identify you across all Resin platforms (web, iOS app, and Chrome extension).
        </p>

        <h3 class="text-xl font-semibold text-resin-forest mt-6 mb-3">
            1.2 Notes, Plans, and Personal Content
        </h3>
        <p>You can create notes, plans, and tasks within Resin. This content is stored on our servers in your user account and is encrypted in transit. We access this data only to:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Display your content across platforms (web, iOS, and extension)</li>
            <li>Process AI-powered features (with your explicit consent)</li>
            <li>Enable note sharing with friends</li>
            <li>Generate mind maps and connections between notes</li>
            <li>Maintain backups for data integrity</li>
        </ul>

        <h3 class="text-xl font-semibold text-resin-forest mt-6 mb-3">
            1.3 Focus and Blocking Data
        </h3>
        <p>
            The iOS app integrates with Apple's Screen Time framework to block apps and websites during
            focus sessions. The Chrome extension helps you stay focused by managing website access. We collect:
        </p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Focus session schedules and durations</li>
            <li>Apps and websites you've configured for blocking (scheduling preferences only)</li>
            <li>Session completion status and achievements</li>
            <li>Focus automation preferences and recurring schedules</li>
        </ul>
        <p class="mt-2"><strong>Important for iOS:</strong> The iOS app uses Apple's Screen Time framework for blocking. We do NOT have access to your device's screen time data, installed apps list, or browsing history. Apple handles all app/website blocking through its native APIs. We only store your blocking preferences and schedules in our database.</p>
        <p class="mt-2">This data is used exclusively to manage your focus sessions and is not shared with third parties except Apple (for Screen Time API integration only).</p>

        <h3 class="text-xl font-semibold text-resin-forest mt-6 mb-3">
            1.4 Device and Push Notification Information
        </h3>
        <p>To send you notifications and enable cross-platform sync, we collect:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li><strong>iOS:</strong> Apple Push Notification Service (APNS) tokens</li>
            <li><strong>Chrome Extension:</strong> Browser instance identifiers</li>
            <li>Device platform (iOS, Web, Chrome), device type, and last active timestamp</li>
            <li>Device model and OS version (for compatibility)</li>
        </ul>
        <p class="mt-2">We use this information to deliver timely notifications and coordinate data synchronization between your devices.</p>

        <h3 class="text-xl font-semibold text-resin-forest mt-6 mb-3">
            1.5 Calendar Integration Data
        </h3>
        <p>
            When you authorize Resin to access your Google Calendar, we collect OAuth refresh tokens to enable:
        </p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Syncing your focus sessions and plans to your calendar</li>
            <li>Reading calendar events to avoid scheduling conflicts</li>
            <li>Creating calendar entries for focus blocks and amber sessions</li>
        </ul>
        <p class="mt-2">You can revoke this access at any time in your account settings. We store your refresh token securely and only use it to sync calendar data on your behalf.</p>

        <h3 class="text-xl font-semibold text-resin-forest mt-6 mb-3">
            1.6 Usage and Analytics
        </h3>
        <p>We collect limited, aggregated usage information to understand how you use Resin and improve our Services:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Features you use most frequently</li>
            <li>Focus session counts and total focus minutes (aggregated)</li>
            <li>Streak data (consecutive days of focus activity)</li>
            <li>Reward and achievement progress</li>
            <li>Session completion rates and error reports</li>
        </ul>
        <p class="mt-2">This data is aggregated and anonymized to protect your privacy. We do NOT track your individual browsing history, websites visited outside of blocking sessions, or personal app usage.</p>

        <h3 class="text-xl font-semibold text-resin-forest mt-6 mb-3">
            1.7 Social and Collaborative Data
        </h3>
        <p>You can optionally share notes with friends and build connections:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Friend connections and relationship data</li>
            <li>Shared notes and collaborative plans</li>
            <li>Mind map connections between your notes</li>
            <li>Friend emails (only when you invite them)</li>
        </ul>
        <p class="mt-2">Only notes and connections you explicitly choose to share are visible to other users. You maintain full control over what you share.</p>

        <h3 class="text-xl font-semibold text-resin-forest mt-6 mb-3">
            1.8 iOS-Specific Data (App Store Compliance)
        </h3>
        <p>The Resin iOS app requests the following permissions for legitimate purposes:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li><strong>Screen Time API:</strong> To enable app and website blocking during focus sessions (via Apple's native framework)</li>
            <li><strong>Calendar Access:</strong> To sync focus sessions and plans to your calendar and check for scheduling conflicts</li>
            <li><strong>Notifications:</strong> To send push notifications for focus reminders and session updates</li>
        </ul>
        <p class="mt-2">We do NOT request or collect: location data, contacts, photos library, microphone, camera, health data, or any other sensitive permissions beyond those listed above.</p>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            2. How We Use Your Information
        </h2>
        <ul class="list-disc list-inside space-y-2">
            <li><strong>Service Delivery:</strong> Provide, maintain, and improve the Services</li>
            <li><strong>Communication:</strong> Send notifications, updates, and responses to your inquiries</li>
            <li><strong>Personalization:</strong> Customize your experience across devices (focus presets, themes, schedules)</li>
            <li><strong>AI Features:</strong> Process your content through AI services (DeepSeek, Google Gemini) only with your explicit consent</li>
            <li><strong>Data Synchronization:</strong> Sync your data across web, iOS, and Chrome extension</li>
            <li><strong>Security:</strong> Detect and prevent fraud, abuse, and unauthorized access</li>
            <li><strong>Legal Compliance:</strong> Comply with applicable laws and regulations</li>
            <li><strong>Service Improvement:</strong> Analyze aggregated usage patterns to improve features</li>
        </ul>

        <p class="mt-4"><strong>Data Minimization:</strong> We collect only the minimum information necessary to provide our Services. We do NOT sell, share, or monetize your personal data in any way.</p>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            3. Third-Party Services and Data Sharing
        </h2>
        <p>Resin integrates with third-party services. We share only the necessary information:</p>
        <ul class="list-disc list-inside space-y-2">
            <li><strong>Supabase:</strong> For authentication, database storage, and hosting (SOC 2 certified)</li>
            <li><strong>Apple APNS:</strong> For iOS push notifications (device tokens only, no personal data)</li>
            <li><strong>Apple Screen Time API:</strong> For managing app/website blocking (data remains on-device)</li>
            <li><strong>Google Calendar API:</strong> Your calendar OAuth tokens (encrypted, used only for sync)</li>
            <li><strong>DeepSeek & Google Gemini:</strong> Your notes and content (only when you explicitly request AI processing)</li>
        </ul>
        <p class="mt-4">
            <strong>We do NOT:</strong>
        </p>
        <ul class="list-disc list-inside space-y-1">
            <li>Sell, rent, lease, or monetize your personal information to third parties</li>
            <li>Share your data with advertisers or marketing companies</li>
            <li>Use your data for behavioral advertising or targeting</li>
            <li>Share your blocking preferences or focus data with any third party (except Apple's native APIs)</li>
            <li>Track you across other websites or services</li>
        </ul>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            4. Data Security
        </h2>
        <p>We implement industry-standard security measures to protect your information:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Encryption in transit (HTTPS/TLS 1.2+)</li>
            <li>Encryption at rest for sensitive data</li>
            <li>Secure password handling via Supabase Auth (bcrypt hashing)</li>
            <li>Regular security audits and penetration testing</li>
            <li>Limited access to personal data by authorized personnel only (principle of least privilege)</li>
            <li>Database firewalls and DDoS protection</li>
            <li>Secure OAuth implementation for third-party integrations</li>
        </ul>
        <p class="mt-2">While we strive to protect your information, no security system is impenetrable. We are not liable for unauthorized access to your account due to your own negligence or compromised credentials.</p>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            5. Your Rights and Controls
        </h2>
        <p>You have the following rights regarding your information:</p>
        <ul class="list-disc list-inside space-y-2">
            <li><strong>Access:</strong> View all your personal data stored in Resin via your account settings</li>
            <li><strong>Correction:</strong> Update or correct your account information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and all associated data</li>
            <li><strong>Opt-Out:</strong> Disable notifications and data sharing features in settings</li>
            <li><strong>Portability:</strong> Request your data in a portable format (JSON/CSV)</li>
            <li><strong>Revoke Access:</strong> Revoke third-party integrations (Google Calendar, etc.) at any time</li>
        </ul>
        <p class="mt-4">
            To exercise these rights, contact us at crew@looplessapp.com. We will respond to your request within 30 days.
        </p>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            6. Data Retention
        </h2>
        <p>
            We retain your information for as long as your account is active or as needed to provide Services.
            If you delete your account:
        </p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Your personal data will be removed within 30 days</li>
            <li>Shared notes may persist if other users have access (you can unshare them first)</li>
            <li>Backup copies may persist for up to 90 days for disaster recovery</li>
            <li>Aggregated, anonymized data may be retained for analytics</li>
            <li>Data retention beyond 30 days may occur if required by law</li>
        </ul>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            7. Children's Privacy
        </h2>
        <p>
            Resin is not intended for children under 13 (COPPA). We do not knowingly collect information from
            children under 13. If we discover that a child under 13 has provided us with personal information,
            we will delete such information and terminate the child's account immediately. Parents or guardians
            who believe their child has provided us with information should contact us at crew@looplessapp.com.
        </p>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            8. International Users (GDPR, CCPA)
        </h2>
        <p>
            <strong>For EU Residents (GDPR):</strong> You have additional rights including the right to be forgotten,
            data portability, and to object to processing. We process your data based on legitimate interest and
            your explicit consent. You can contact our Data Protection Officer at crew@looplessapp.com.
        </p>
        <p class="mt-2">
            <strong>For California Residents (CCPA):</strong> You have the right to know, delete, and opt-out of
            the sale of your personal information. We do not sell your personal information. You can submit a
            CCPA request at crew@looplessapp.com.
        </p>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            9. Cookies and Tracking
        </h2>
        <p>
            Our website uses cookies for:
        </p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Authentication (session management)</li>
            <li>User preferences (theme, language)</li>
            <li>Security (CSRF protection)</li>
        </ul>
        <p class="mt-2">We do NOT use cookies for tracking, advertising, or analytics. You can control cookies in your browser settings.</p>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            10. Contact Us
        </h2>
        <p>
            If you have questions about this Privacy Policy, wish to exercise your rights, or have privacy concerns, please contact us:
        </p>
        <div class="bg-resin-forest/5 p-4 rounded-lg mt-4 space-y-2">
            <p><strong>LoopLess LLC</strong></p>
            <p>State of Illinois, United States</p>
            <p>Email: crew@looplessapp.com</p>
            <p class="text-sm">Response time: 30 days or less for privacy requests</p>
        </div>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            11. Changes to This Privacy Policy
        </h2>
        <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices,
            technology, legal requirements, or other factors. We will notify you of material changes
            by posting the updated policy on this page, updating the "Last Updated" date above, and/or
            sending you an email notification. Your continued use of the Services following the posting
            of revised Privacy Policy means that you accept and agree to the changes. If you do not agree
            with the changes, you may delete your account.
        </p>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            12. Jurisdiction and Governing Law
        </h2>
        <p>
            This Privacy Policy is governed by and construed in accordance with the laws of the State of Illinois,
            without regard to its conflict of law principles. Any legal action or proceeding related to this policy
            shall be brought exclusively in the courts located in Illinois. However, for disputes related to data
            protection (GDPR), EU residents may file complaints with their local data protection authority.
        </p>

        <h2 class="text-2xl font-semibold text-resin-forest mt-8 mb-4">
            13. Data Processing Addendum
        </h2>
        <p>
            For enterprise customers or organizations processing large volumes of personal data through Resin,
            we can provide a Data Processing Addendum (DPA) that outlines our responsibilities as a data processor.
            Contact crew@looplessapp.com to request a DPA.
        </p>
    </div>
</main>
