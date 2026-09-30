<script lang="ts">
    import {
        ArrowRight,
        Apple,
        Check,
        ChevronDown,
        Chrome,
        Clock3,
        LockKeyhole,
        ShieldCheck,
        Sparkles,
        CalendarDays
    } from 'lucide-svelte';

    let openFaq = $state<number | null>(0);

    // The three-card core loop (rendered as big colored capability panels).
    const capabilities = [
        {
            key: 'capture',
            tone: 'forest',
            title: 'Write it down fast.',
            copy: 'No folders. No setup. Just type what is on your mind — from your phone, the web, or Chrome. Resin keeps it safe until you are ready.',
            img: '/img/landing/capture.jpg',
            alt: 'A stream running through a mountain forest',
            chips: ['A project I keep avoiding', 'Text Maya back', 'Finally start the essay']
        },
        {
            key: 'plan',
            tone: 'clay',
            title: 'Break it into small steps.',
            copy: 'Resin turns your note into a few easy steps, guesses how long each one takes, and fits them around the stuff already on your calendar.',
            img: '/img/landing/plan.jpg',
            alt: 'A mountain stream over rocks',
            chips: ['Read the notes · 12m', 'Write the intro · 25m', 'Check it over · 15m']
        },
        {
            key: 'focus',
            tone: 'deep',
            title: 'Block distractions and start.',
            copy: 'Start in one tap. The step you are on stays on screen while the apps and sites that pull you away get blocked — on your phone and in your browser. When you are done, they come back.',
            img: '/img/landing/focus.jpg',
            alt: 'Pine trees with a mountain peak behind them',
            chips: ['Instagram · blocked', 'Reddit · blocked', 'YouTube · blocked']
        }
    ];

    // Secondary "do more" feature cards with imagery.
    const showcase = [
        { img: '/img/landing/misty.jpg', alt: 'A misty mountain valley', title: 'Works on all your devices.', copy: 'Your notes, plans, and focus stay the same on your phone, the web, and Chrome.' },
        { img: '/img/landing/canopy.jpg', alt: 'A mountain lake at sunrise', title: 'Plans that fit your day.', copy: 'Resin adds your steps around the meetings you already have.' },
        { img: '/img/landing/follow.jpg', alt: 'A stream in a green mountain valley', title: 'Real focus, not willpower.', copy: 'Resin blocks distracting apps and sites while you work, using Apple Screen Time.' },
        { img: '/img/landing/hero-alt.jpg', alt: 'A calm mountain river', title: 'See what you got done.', copy: 'Small starts add up. Resin keeps track of the work you finished.' }
    ];

    const faqs = [
        ['Is Resin just another to-do list?', 'No. Most to-do lists want a clear task. Resin helps with the fuzzy stuff you keep putting off. It helps you pick the first small step and make time to do it.'],
        ['What does Resin block?', 'On iPhone, Resin uses Apple Screen Time to block the apps you pick. The Chrome add-on blocks the websites you pick while you are focusing.'],
        ['Can I use Resin without AI?', 'Yes. Notes, calendars, focus timers, and blocking all work without AI. The AI plan is just an extra option if you want it.'],
        ['Do my devices stay in sync?', 'Yes. Your notes, plans, and focus stay the same across your phone, the web, and Chrome.']
    ];
</script>

<svelte:head>
    <meta name="description" content="Resin helps overloaded minds turn vague intentions into realistic next actions—and protect the attention needed to begin." />
    <meta property="og:title" content="Resin — Follow through on what matters" />
    <meta property="og:description" content="Capture the thought, make a realistic plan, and protect the time to begin." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://noteresin.com/" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="https://noteresin.com/" />
</svelte:head>

<main class="landing-shell">
    <!-- HERO: full-bleed image, headline overlaid bottom-left -->
    <section class="hero">
        <img class="hero-bg" src="/img/landing/hero.jpg" alt="" aria-hidden="true" />
        <div class="hero-scrim"></div>
        <div class="hero-inner">
            <h1>You know what matters.<br /><span>Now start it.</span></h1>
            <p class="hero-lede">Got something you keep meaning to do? Resin turns it into small steps, finds time for it in your day, and blocks distractions so you can start.</p>
            <div class="hero-actions">
                <a class="btn btn-primary" href="/login?mode=start&next=/">Make my first plan <ArrowRight size={18} /></a>
                <a class="btn btn-ghost" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"><Apple size={18} /> Join the iPhone beta</a>
            </div>
            <p class="hero-note"><Check size={14} /> Unlimited local planning on iPhone <span></span> No card required</p>
        </div>
    </section>

    <!-- CAPABILITIES: three big colored core-loop cards -->
    <section class="cap-section">
        <div class="cap-head">
            <h2>Stop putting it off. Start it.</h2>
            <p class="cap-sub">Three easy steps for busy, messy days: write it down, break it into steps, and block distractions so you can begin.</p>
        </div>
        <div class="cap-stack">
            {#each capabilities as cap, i}
                <article class="cap-card {cap.tone}">
                    <div class="cap-copy">
                        <h3>{cap.title}</h3>
                        <p>{cap.copy}</p>
                        <div class="cap-chips">{#each cap.chips as chip}<span>{chip}</span>{/each}</div>
                    </div>
                    <div class="cap-media"><img src={cap.img} alt={cap.alt} loading="lazy" width="1100" height="820" /></div>
                </article>
            {/each}
        </div>
    </section>

    <!-- SHOWCASE: four "do more" image cards -->
    <section class="showcase-section">
        <div class="showcase-head">
            <h2>A few more things Resin does.</h2>
            <p>Simple help to make it easier to start and finish what matters.</p>
        </div>
        <div class="showcase-grid">
            {#each showcase as card}
                <article class="showcase-card">
                    <div class="showcase-media"><img src={card.img} alt={card.alt} loading="lazy" width="1100" height="820" /></div>
                    <div class="showcase-body"><h3>{card.title}</h3><p>{card.copy}</p></div>
                </article>
            {/each}
        </div>
        <div class="platform-strip">
            <span><Apple size={16} /> iPhone</span>
            <span><Chrome size={16} /> Chrome</span>
            <span><CalendarDays size={16} /> Calendar</span>
            <span><ShieldCheck size={16} /> Screen Time</span>
        </div>
    </section>

    <!-- FAQ -->
    <section class="faq-section">
        <div class="faq-head">
            <h2>Before you begin.</h2>
        </div>
        <div class="faq-list">
            {#each faqs as faq, index}
                <div class="faq-item">
                    <button onclick={() => openFaq = openFaq === index ? null : index} aria-expanded={openFaq === index} aria-controls={`faq-answer-${index}`}>
                        <span>{faq[0]}</span><ChevronDown size={18} class={openFaq === index ? 'faq-icon open' : 'faq-icon'} />
                    </button>
                    {#if openFaq === index}<p id={`faq-answer-${index}`}>{faq[1]}</p>{/if}
                </div>
            {/each}
        </div>
    </section>

    <!-- FINAL CTA: dark full-bleed -->
    <section class="final-cta">
        <img class="final-bg" src="/img/landing/misty.jpg" alt="" aria-hidden="true" />
        <div class="final-scrim"></div>
        <div class="final-inner">
            <h2>Carry less.<br /><span>Start one thing.</span></h2>
            <div class="hero-actions">
                <a class="btn btn-primary" href="/login?mode=start&next=/">Make my first plan <ArrowRight size={18} /></a>
                <a class="btn btn-ghost light" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"><Apple size={18} /> Join the iPhone beta</a>
            </div>
            <p class="final-note">Unlimited local planning on iPhone · No card required · AI optional</p>
        </div>
    </section>
</main>

<style>
    .landing-shell { --ink:#25231f; --muted:#6f665c; --amber:#c07a3c; --forest:#365744; --paper:#f3eee6; color:var(--ink); background:var(--paper); overflow-x:clip; font-family:'Inter','DM Sans',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
    .landing-shell :global(*) { box-sizing:border-box; }
    h1,h2,h3,p { margin:0; } h1,h2,h3 { font-family:'Manrope','Inter',system-ui,sans-serif; font-weight:800; letter-spacing:-.035em; line-height:.98; }
    .btn { min-height:54px; padding:0 26px; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; gap:9px; text-decoration:none; font-size:15px; font-weight:700; transition:transform .18s ease, background .18s ease, box-shadow .18s ease; }
    .btn:hover { transform:translateY(-2px); }
    .btn-primary { color:#fff; background:var(--ink); box-shadow:0 14px 30px rgba(37,35,31,.22); }.btn-primary:hover { background:var(--forest); }
    .btn-ghost { color:#fff; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.4); backdrop-filter:blur(6px); }.btn-ghost:hover { background:rgba(255,255,255,.24); }

    /* HERO */
    .hero { position:relative; min-height:92vh; display:flex; align-items:flex-end; padding:0; overflow:hidden; }
    .hero-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .hero-scrim { position:absolute; inset:0; background:linear-gradient(180deg, rgba(20,26,20,.34) 0%, rgba(20,26,20,.06) 34%, rgba(20,26,20,.5) 78%, rgba(15,20,15,.82) 100%); }
    .hero-inner { position:relative; width:100%; max-width:1180px; margin:0 auto; padding:0 max(24px,calc((100vw - 1180px)/2)) clamp(56px,8vh,104px); }
    .hero h1 { color:#fff; font-size:clamp(52px,8.4vw,124px); text-shadow:0 2px 30px rgba(0,0,0,.28); }.hero h1 span { color:#f0c79a; }
    .hero-lede { max-width:600px; margin-top:24px; color:rgba(255,255,255,.9); font-size:clamp(16px,1.5vw,20px); line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.3); }
    .hero-actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:32px; }
    .hero-note { margin-top:20px; display:flex; align-items:center; gap:9px; color:rgba(255,255,255,.7); font-size:12px; }.hero-note span { width:3px; height:3px; border-radius:50%; background:rgba(255,255,255,.5); }

    /* CAPABILITIES */
    .cap-section { padding:clamp(80px,10vh,140px) max(24px,calc((100vw - 1180px)/2)); }
    .cap-head { max-width:640px; }.cap-head h2 { margin-top:16px; font-size:clamp(40px,5vw,72px); }.cap-sub { margin-top:20px; color:var(--muted); font-size:16px; line-height:1.7; }
    .cap-stack { margin-top:54px; display:grid; gap:22px; }
    .cap-card { border-radius:30px; overflow:hidden; display:grid; grid-template-columns:1.05fr .95fr; min-height:400px; color:#fff; }
    .cap-card.forest { background:#2f5040; }.cap-card.clay { background:#a95f34; }.cap-card.deep { background:#20342a; }
    .cap-copy { padding:clamp(44px,4.8vw,80px); display:flex; flex-direction:column; justify-content:center; }
    .cap-card h3 { font-size:clamp(30px,3.4vw,46px); line-height:1.02; max-width:15ch; }
    .cap-card .cap-copy p { margin-top:22px; max-width:46ch; color:rgba(255,255,255,.82); font-size:15px; line-height:1.75; }
    .cap-chips { margin-top:30px; display:flex; flex-wrap:wrap; gap:10px; }.cap-chips span { padding:9px 15px; border-radius:999px; background:rgba(255,255,255,.13); border:1px solid rgba(255,255,255,.2); font-size:12px; font-weight:600; }
    .cap-media { position:relative; overflow:hidden; }.cap-media img { width:100%; height:100%; object-fit:cover; display:block; }

    /* SHOWCASE */
    .showcase-section { padding:clamp(70px,8vh,120px) max(24px,calc((100vw - 1180px)/2)); border-top:1px solid rgba(37,35,31,.09); }
    .showcase-head { max-width:640px; }.showcase-head h2 { font-size:clamp(40px,5vw,68px); }.showcase-head p { margin-top:18px; color:var(--muted); font-size:16px; line-height:1.7; }
    .showcase-grid { margin-top:52px; display:grid; grid-template-columns:repeat(4,1fr); gap:22px; }
    .showcase-card { border:1px solid rgba(37,35,31,.1); border-radius:22px; overflow:hidden; background:#fffdf9; box-shadow:0 16px 38px rgba(61,46,31,.08); transition:transform .2s ease, box-shadow .2s ease; }
    .showcase-card:hover { transform:translateY(-3px); box-shadow:0 26px 54px rgba(61,46,31,.14); }
    .showcase-media { aspect-ratio:11/8; overflow:hidden; background:#eee7dd; }.showcase-media img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .5s ease; }.showcase-card:hover .showcase-media img { transform:scale(1.05); }
    .showcase-body { padding:30px 28px 34px; }.showcase-body h3 { font-size:20px; }.showcase-body p { margin-top:13px; color:var(--muted); font-size:13px; line-height:1.65; }
    .platform-strip { margin-top:44px; padding-top:26px; border-top:1px solid rgba(37,35,31,.1); display:flex; flex-wrap:wrap; gap:28px; color:var(--muted); }.platform-strip span { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:var(--ink); }

    /* FAQ */
    .faq-section { padding:clamp(70px,8vh,120px) max(24px,calc((100vw - 1180px)/2)); border-top:1px solid rgba(37,35,31,.09); display:grid; grid-template-columns:.7fr 1.3fr; gap:64px; }
    .faq-head h2 { margin-top:14px; font-size:clamp(36px,4vw,56px); }
    .faq-list { border-top:1px solid rgba(37,35,31,.14); }.faq-item { border-bottom:1px solid rgba(37,35,31,.14); }
    .faq-item button { width:100%; min-height:84px; padding:24px 0; border:0; display:flex; align-items:center; justify-content:space-between; gap:20px; color:var(--ink); background:transparent; text-align:left; cursor:pointer; font-family:'Manrope',sans-serif; font-size:19px; font-weight:700; letter-spacing:-.02em; }
    :global(.faq-icon) { color:#8f867c; transition:transform .2s ease; flex-shrink:0; }:global(.faq-icon.open) { transform:rotate(180deg); }
    .faq-item > p { max-width:680px; padding:2px 40px 30px 0; color:var(--muted); font-size:14px; line-height:1.75; }

    /* FINAL CTA */
    .final-cta { position:relative; margin:0; min-height:66vh; display:flex; align-items:center; justify-content:center; text-align:center; overflow:hidden; }
    .final-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .final-scrim { position:absolute; inset:0; background:linear-gradient(180deg, rgba(15,20,15,.72), rgba(15,20,15,.86)); }
    .final-inner { position:relative; padding:80px 24px; }
    .final-cta h2 { margin-top:22px; color:#fff; font-size:clamp(48px,7vw,104px); }.final-cta h2 span { color:#f0c79a; }
    .final-cta .hero-actions { justify-content:center; }
    .final-note { margin-top:22px; color:rgba(255,255,255,.6); font-size:12px; }

    @media(max-width:900px) {
        .cap-card { grid-template-columns:1fr; min-height:0; }
        .cap-media { min-height:240px; order:-1; }
        .faq-section { grid-template-columns:1fr; gap:28px; }
        .showcase-grid { grid-template-columns:repeat(2,1fr); }
    }
    @media(max-width:560px) {
        .hero { min-height:88vh; }
        .showcase-grid { grid-template-columns:1fr; }
        .hero-actions { flex-direction:column; }.btn { width:100%; }
    }
    @media(prefers-reduced-motion:reduce) { .btn:hover,.showcase-card:hover { transform:none; } .showcase-card:hover .showcase-media img { transform:none; } }
</style>
