<script lang="ts">
</script>

<main class="flex-grow max-w-3xl mx-auto px-6 py-20 w-full font-sans">
    <h1 class="text-4xl font-bold font-serif text-resin-charcoal mb-4">
        App Support
    </h1>
    <p class="text-xl text-resin-earth mb-12">
        We're here to help you get the most out of Resin.
    </p>

    <div
        class="bg-white rounded-3xl p-8 shadow-[0_10px_40px_rgb(232,154,60,0.1)] border border-resin-amber/20 mb-12"
    >
        <h2 class="text-2xl font-semibold text-resin-forest mb-6">
            Contact Us
        </h2>

        <form class="space-y-6" onsubmit={(e) => e.preventDefault()}>
            <div>
                <label
                    for="name"
                    class="block text-sm font-medium text-resin-earth mb-2"
                    >Name</label
                >
                <input
                    type="text"
                    id="name"
                    class="w-full px-4 py-3 rounded-xl border border-resin-earth/20 bg-resin-bg/50 focus:outline-none focus:border-resin-amber focus:ring-1 focus:ring-resin-amber/50 transition-colors"
                    placeholder="Your name"
                />
            </div>

            <div>
                <label
                    for="email"
                    class="block text-sm font-medium text-resin-earth mb-2"
                    >Email</label
                >
                <input
                    type="email"
                    id="email"
                    class="w-full px-4 py-3 rounded-xl border border-resin-earth/20 bg-resin-bg/50 focus:outline-none focus:border-resin-amber focus:ring-1 focus:ring-resin-amber/50 transition-colors"
                    placeholder="you@example.com"
                />
            </div>

            <div>
                <label
                    for="message"
                    class="block text-sm font-medium text-resin-earth mb-2"
                    >How can we help?</label
                >
                <textarea
                    id="message"
                    rows="4"
                    class="w-full px-4 py-3 rounded-xl border border-resin-earth/20 bg-resin-bg/50 focus:outline-none focus:border-resin-amber focus:ring-1 focus:ring-resin-amber/50 transition-colors"
                    placeholder="Describe the issue or feedback..."
                ></textarea>
            </div>

            <button
                type="submit"
                class="w-full py-4 bg-resin-forest text-white rounded-xl font-medium hover:bg-resin-charcoal transition-colors shadow-md"
            >
                Send Message
            </button>
        </form>
    </div>

    <div class="space-y-4 text-center">
        <h3 class="font-medium text-resin-charcoal">
            Frequently Asked Questions
        </h3>
        <p class="text-resin-earth/80 text-sm">
            <strong>Where are my API keys stored?</strong><br />
            All custom API keys you provide are stored exclusively on your device
            within the secure keychain. They are never sent to our servers.
        </p>
    </div>
</main>
