<script lang="ts">
    /**
     * Note Editor - Simplified to a single textarea as requested
     * 
     * Features:
     * - Auto-focus
     * - Input/Change handlers
     */
    import { onMount } from "svelte";

    let {
        value = $bindable(""),
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

    function handleInput(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        value = target.value;
        oninput(value);
    }

    function handleChange(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        value = target.value;
        onchange(value);
    }

    onMount(() => {
        if (autofocus && textInput) {
            textInput.focus();
        }
    });
</script>

<div class="relative w-full h-full flex-1">
    <textarea
        bind:this={textInput}
        bind:value={value}
        {placeholder}
        {autofocus}
        oninput={handleInput}
        onchange={handleChange}
        class="relative z-10 w-full h-full resize-none font-sans text-[17px] leading-relaxed bg-transparent focus:outline-none px-8 sm:px-12 py-6 text-[#2B4634] placeholder:text-[#5C4B3C]/60 {classList}"
        style="caret-color: #2B4634;"
    ></textarea>
</div>
