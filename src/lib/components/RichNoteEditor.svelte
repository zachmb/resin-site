<script lang="ts">
    /**
     * Rich Note Editor - Detects and styles URLs in note content
     *
     * Features:
     * - Automatic URL detection and styling (blue, underline)
     * - Clickable URLs that open in new tab
     * - Plain text editing with rich display
     * - Synced scroll position between editor and display
     * - Same functionality as iOS RichTextEditorView
     */

    import { onMount } from "svelte";

    interface URLMatch {
        start: number;
        end: number;
        url: string;
    }

    let {
        value = "",
        placeholder = "",
        onchange = (val: string) => {},
        oninput = (val: string) => {},
        autofocus = false,
        class: classList = "",
    } = $props<{
        value?: string;
        placeholder?: string;
        onchange?: (value: string) => void;
        oninput?: (value: string) => void;
        autofocus?: boolean;
        class?: string;
    }>();

    let textInput: HTMLTextAreaElement | null = $state(null);
    let displayLayer: HTMLDivElement | null = $state(null);
    let htmlContent = $state("");
    let urlMatches: URLMatch[] = $state([]);

    // URL detection regex - matches http://, https://, and www. URLs
    const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/g;

    function detectUrls(text: string): URLMatch[] {
        const matches: URLMatch[] = [];
        let match;

        // Create new regex for each call to avoid statefulness issues
        const regex = /https?:\/\/[^\s]+|www\.[^\s]+/g;

        while ((match = regex.exec(text)) !== null) {
            let url = match[0];

            // Add http:// to www URLs for proper linking
            if (url.startsWith("www.")) {
                url = "http://" + url;
            }

            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                url: url,
            });
        }

        return matches;
    }

    function renderContent() {
        urlMatches = detectUrls(value);

        if (urlMatches.length === 0) {
            htmlContent = escapeHtml(value);
            return;
        }

        // Build HTML with URL highlighting
        let html = "";
        let lastIndex = 0;

        for (const match of urlMatches) {
            // Add text before URL
            if (match.start > lastIndex) {
                html += escapeHtml(value.substring(lastIndex, match.start));
            }

            // Add URL as link
            const displayUrl = value.substring(match.start, match.end);
            html += `<a href="${match.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800 cursor-pointer">${escapeHtml(displayUrl)}</a>`;

            lastIndex = match.end;
        }

        // Add remaining text
        if (lastIndex < value.length) {
            html += escapeHtml(value.substring(lastIndex));
        }

        htmlContent = html;
    }

    function escapeHtml(text: string): string {
        const map: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        };
        return text.replace(/[&<>"']/g, (char) => map[char]);
    }

    function handleInput(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        value = target.value;
        renderContent();
        oninput(value);

        // Sync scroll position
        if (displayLayer) {
            displayLayer.scrollTop = target.scrollTop;
            displayLayer.scrollLeft = target.scrollLeft;
        }
    }

    function handleChange(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        value = target.value;
        renderContent();
        onchange(value);
    }

    function handleScroll(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        if (displayLayer) {
            displayLayer.scrollTop = target.scrollTop;
            displayLayer.scrollLeft = target.scrollLeft;
        }
    }

    onMount(() => {
        if (autofocus && textInput) {
            textInput.focus();
        }
        renderContent();
    });

    $effect(() => {
        // Re-render when value changes from outside
        renderContent();
    });
</script>

<div class="relative w-full h-full flex-1">
    <!-- Rich text display layer (behind textarea) -->
    <div
        bind:this={displayLayer}
        class="absolute inset-0 overflow-hidden whitespace-pre-wrap break-words font-sans text-[17px] leading-relaxed text-[#2B4634] px-8 sm:px-12 py-6 pointer-events-none"
        aria-hidden="true"
    >
        {@html htmlContent}
    </div>

    <!-- Text input (on top with transparent background) -->
    <textarea
        bind:this={textInput}
        {value}
        {placeholder}
        {autofocus}
        oninput={handleInput}
        onchange={handleChange}
        onscroll={handleScroll}
        class="relative z-10 w-full h-full resize-none font-sans text-[17px] leading-relaxed bg-transparent focus:outline-none px-8 sm:px-12 py-6 placeholder:text-[#5C4B3C]/60 {classList}"
        style="color: rgba(43, 70, 52, 0.5); caret-color: #2B4634;"
    ></textarea>
</div>
