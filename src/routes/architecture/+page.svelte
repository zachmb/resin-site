<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { Layout, Smartphone, RefreshCw, Brain, Calendar, Cloud, FileText, ListChecks, CalendarCheck, LockKeyhole, ShieldCheck } from "lucide-svelte";

    let visible = false;
    onMount(() => { visible = true; });

    const steps = [
        { icon: FileText, title: 'You write it down', desc: 'Type the thing on your mind. No structure needed.' },
        { icon: Brain, title: 'Resin makes a plan', desc: 'It breaks your note into a few small steps and guesses how long each one takes.' },
        { icon: CalendarCheck, title: 'It finds time', desc: 'The steps get added to your day, around what is already there.' },
        { icon: ShieldCheck, title: 'You focus', desc: 'Start a session and distracting apps and sites get blocked until you are done.' }
    ];

    const stack = [
        { icon: Smartphone, name: 'iPhone app', desc: 'Built with SwiftUI. Uses Apple Screen Time to block apps.' },
        { icon: Layout, name: 'Web app', desc: 'Fast and calm. The same plans and focus as your phone.' },
        { icon: RefreshCw, name: 'Sync', desc: 'Your notes, plans, and focus stay the same on every device.' },
        { icon: Brain, name: 'AI planning', desc: 'Turns your note into steps — on your phone, or on a secure server for web and Chrome.' },
        { icon: Calendar, name: 'Calendar', desc: 'Adds your steps to Google Calendar and Apple Calendar.' },
        { icon: Cloud, name: 'Works offline', desc: 'Loads right away from a local copy, then syncs in the background.' }
    ];
</script>

<svelte:head><title>How Resin works | Resin</title></svelte:head>

<main class="arch-page">
    <div class="max-w-5xl mx-auto space-y-32">
        <section class="text-center">
            {#if visible}
                <div in:fly={{ y: 24, duration: 700 }}>
                    <h1>What's under the hood.</h1>
                    <p class="lede">A quick look at how Resin turns a messy thought into a plan you actually start — and how we keep your stuff private.</p>
                </div>
            {/if}
        </section>

        <section class="space-y-12">
            <div class="text-center"><h2>How a note becomes done</h2><p class="sub">Four simple steps.</p></div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                {#each steps as step, i}
                    {@const Icon = step.icon}
                    {#if visible}
                        <div in:fly={{ y: 24, delay: 150 + i * 120, duration: 700 }} class="arch-card text-center">
                            <div class="arch-ico"><Icon size={24} /></div>
                            <div class="step-num">Step {i + 1}</div>
                            <h3>{step.title}</h3>
                            <p>{step.desc}</p>
                        </div>
                    {/if}
                {/each}
            </div>
        </section>

        <section class="space-y-12">
            <div class="text-center"><h2>What Resin is built with</h2><p class="sub">Simple, steady pieces that work together.</p></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each stack as tech, i}
                    {@const Icon = tech.icon}
                    {#if visible}
                        <div in:fly={{ y: 20, delay: 150 + i * 100, duration: 700 }} class="arch-card">
                            <div class="arch-ico"><Icon size={22} /></div>
                            <h3>{tech.name}</h3>
                            <p>{tech.desc}</p>
                        </div>
                    {/if}
                {/each}
            </div>
        </section>

        <section class="privacy-block text-center">
            <div class="w-16 h-16 rounded-full mx-auto flex items-center justify-center"><LockKeyhole size={28} /></div>
            <h2>Your privacy comes first</h2>
            <p>The apps and sites you block stay on your device. Resin never reads your notes, the pages you visit, your passwords, or your history. What you share with Resin stays with Resin.</p>
            <a href="/privacy">Read the privacy policy →</a>
        </section>
    </div>
</main>

<style>
    .arch-page{min-height:100vh;padding:150px 24px 120px;background:#f3eee6;color:#25231f;font-family:'Inter','DM Sans',system-ui,sans-serif}
    .arch-page h1,.arch-page h2,.arch-page h3{font-family:'Manrope','Inter',system-ui,sans-serif!important;font-weight:800!important;letter-spacing:-.035em}
    .arch-page h1{font-size:clamp(48px,6.5vw,84px);line-height:.98}
    .arch-page .lede{max-width:640px;margin:22px auto 0;color:#6f665d;font-size:clamp(16px,1.6vw,19px);line-height:1.65}
    .arch-page h2{font-size:clamp(32px,3.8vw,48px)}.arch-page .sub{margin-top:12px;color:#817568;font-size:15px}
    .arch-card{padding:30px;border:1px solid rgba(37,35,31,.1);border-radius:20px;background:rgba(255,253,248,.72);box-shadow:0 12px 30px rgba(61,46,31,.06)}
    .arch-ico{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#365744;background:rgba(54,87,68,.1);margin-bottom:18px}
    .text-center .arch-ico{margin-left:auto;margin-right:auto}
    .step-num{color:#c98042;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
    .arch-card h3{margin-top:8px;font-size:20px}.arch-card p{margin-top:10px;color:#6f665d;font-size:13px;line-height:1.65}
    .privacy-block{max-width:760px;margin:0 auto;padding:64px 40px;border-radius:26px;color:#fff;background:#2d493a}
    .privacy-block .w-16{background:rgba(255,255,255,.1);color:#e4aa69}
    .privacy-block h2{margin-top:22px;color:#fff}.privacy-block p{max-width:560px;margin:16px auto 0;color:rgba(255,255,255,.72);font-size:15px;line-height:1.7}
    .privacy-block a{display:inline-block;margin-top:26px;color:#f0b773;text-decoration:none;font-size:14px;font-weight:800}
    @media(max-width:520px){.arch-page{padding:120px 18px 80px}.privacy-block{padding:44px 24px}}
</style>
