<script lang="ts">
    import {
        ArrowRight,
        Apple,
        CalendarDays,
        Check,
        Chrome,
        Clock3,
        LockKeyhole,
        ShieldCheck,
        Sparkles
    } from 'lucide-svelte';

    let activeStage = $state(0);
    let openFaq = $state<number | null>(null);

    const stages = [
        {
            label: 'Capture',
            eyebrow: 'Start without sorting',
            title: 'Get the thought out before it disappears.',
            copy: 'Write the messy version from iPhone, web, or the Chrome extension. Resin gives you one calm place to begin.',
            stat: 'One tap to capture'
        },
        {
            label: 'Plan',
            eyebrow: 'Turn friction into a path',
            title: 'See the next step—not the whole mountain.',
            copy: 'Resin shapes a note into realistic actions, estimates the time, and helps each step find a place in your day.',
            stat: 'Clear steps in seconds'
        },
        {
            label: 'Protect',
            eyebrow: 'Make focus easier to keep',
            title: 'Start the work with fewer escape hatches.',
            copy: 'Begin a focus window from the plan. Selected apps and sites stay out of reach while your current step stays visible.',
            stat: 'OS-level app shielding'
        }
    ];

    const faqs = [
        ['What does Resin block?', 'On iPhone, Resin uses Apple’s Screen Time APIs to shield selected apps. The Chrome extension protects the distracting domains you choose during active focus sessions.'],
        ['Where does planning happen?', 'Planning can run on-device on iOS. The web app and extension use Resin’s secure planning service so the same workflow is available from your laptop.'],
        ['Can I use Resin without AI?', 'Yes. Capture notes, start manual focus sessions, manage block lists, and use the calendar without turning a note into a generated plan.'],
        ['Do my devices stay in sync?', 'Your notes, focus sessions, schedules, and protection status stay coordinated across the web app, iOS app, and Chrome extension.']
    ];
</script>

<svelte:head>
    <meta name="description" content="Resin turns scattered thoughts into clear plans and protects the time to follow through across iPhone, web, and Chrome." />
</svelte:head>

<main class="landing-shell">
    <section class="hero-section">
        <div class="hero-aura"></div>
        <div class="hero-copy">
            <div class="announcement"><span>New</span> Capture on Chrome. Continue on iPhone. <ArrowRight size={13} /></div>
            <h1>Your mind can stay messy.<br /><em>Your next step won’t.</em></h1>
            <p class="hero-lede">Resin turns scattered thoughts into a plan you can start—then protects the time to follow through.</p>
            <div class="hero-actions">
                <a class="primary-cta" href="/login?mode=start&next=/">Start free on the web <ArrowRight size={17} /></a>
                <a class="secondary-cta" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"><Apple size={17} /> Get Resin for iPhone</a>
            </div>
            <div class="trust-row">
                <span><Check size={13} /> No ads</span>
                <span><Check size={13} /> Private by design</span>
                <span><Check size={13} /> Works without AI</span>
            </div>
        </div>

        <div class="product-stage" aria-label="Resin working across web, iPhone, and Chrome">
            <div class="stage-grid"></div>
            <div class="browser-card">
                <div class="browser-bar">
                    <div class="window-dots"><span></span><span></span><span></span></div>
                    <div class="address-pill">noteresin.com/today</div>
                    <div class="sync-state"><i></i> synced</div>
                </div>
                <div class="browser-body">
                    <aside>
                        <div class="mini-brand">R</div>
                        <div class="side-item active">Today</div>
                        <div class="side-item">Notes</div>
                        <div class="side-item">Focus</div>
                        <div class="side-item">Calendar</div>
                    </aside>
                    <div class="today-view">
                        <div class="today-top"><div><span>Today</span><h2>Good afternoon, Alex.</h2></div><button>+ New thought</button></div>
                        <div class="thought-input"><Sparkles size={13} color="#c98042" /><span>What would feel lighter once it had a plan?</span><kbd>⌘ ↵</kbd></div>
                        <div class="schedule-label"><span>Now</span><i></i><small>2 tasks · 52 min</small></div>
                        <div class="plan-card">
                            <div class="plan-accent"></div>
                            <div class="plan-copy"><span>Launch plan</span><h3>Finish the landing page</h3><p>Next: Polish the mobile story</p></div>
                            <div class="plan-time"><strong>25</strong><span>min</span></div>
                            <button><LockKeyhole size={12} /> Focus</button>
                        </div>
                        <div class="mini-timeline"><span>10:00</span><div class="timeline-block">Review final copy <small>12m</small></div><span>10:30</span><div class="timeline-empty">Open time</div></div>
                    </div>
                </div>
            </div>

            <div class="phone-card">
                <div class="phone-status"><span>9:41</span><i></i><span>•••</span></div>
                <div class="phone-screen">
                    <div class="phone-kicker">Protected focus</div>
                    <div class="focus-ring"><div><strong>24:18</strong><span>remaining</span></div></div>
                    <h3>Polish the mobile story</h3>
                    <p>Launch plan · step 2 of 3</p>
                    <div class="blocked-pill"><ShieldCheck size={13} /> 4 distractions blocked</div>
                    <button>Pause focus</button>
                </div>
            </div>

            <div class="extension-card">
                <div class="extension-top"><span><Chrome size={14} /> Resin</span><i>•••</i></div>
                <small>QUICK CAPTURE</small>
                <p>Remember to simplify the mobile hero and test the CTA.</p>
                <div><span>Saved to Inbox</span><Check size={13} /></div>
            </div>

            <div class="proof-chip chip-plan"><Sparkles size={14} color="#c98042" /><div><strong>Plan ready</strong><span>3 steps · 52 min</span></div></div>
            <div class="proof-chip chip-protect"><LockKeyhole size={14} color="#c98042" /><div><strong>Focus protected</strong><span>Instagram · Reddit · YouTube</span></div></div>
        </div>
    </section>

    <section class="platform-strip" aria-label="Resin platforms">
        <p>One system, wherever the thought happens.</p>
        <div><span><Apple size={16} /> iPhone</span><span><Chrome size={16} /> Chrome</span><span class="web-mark">↗</span><span>Web app</span><span><CalendarDays size={16} /> Calendar</span></div>
    </section>

    <section class="journey-section">
        <header class="section-header centered">
            <div class="eyebrow"><span></span> One calm loop</div>
            <h2>Less system to manage.<br />More momentum to keep.</h2>
            <p>The whole journey stays visible, the choices stay small, and every screen points toward a tangible next step.</p>
        </header>

        <div class="journey-shell">
            <div class="stage-tabs" role="tablist" aria-label="Resin workflow">
                {#each stages as stage, index}
                    <button class:active={activeStage === index} onclick={() => activeStage = index} role="tab" aria-selected={activeStage === index}>
                        <span>0{index + 1}</span>{stage.label}
                    </button>
                {/each}
            </div>

            <div class="journey-content">
                <div class="journey-copy">
                    <div class="eyebrow"><span></span>{stages[activeStage].eyebrow}</div>
                    <h3>{stages[activeStage].title}</h3>
                    <p>{stages[activeStage].copy}</p>
                    <div class="stage-stat"><Check size={15} /> {stages[activeStage].stat}</div>
                </div>

                <div class="journey-visual" class:plan-mode={activeStage === 1} class:protect-mode={activeStage === 2}>
                    {#if activeStage === 0}
                        <div class="capture-demo">
                            <span>INBOX · JUST NOW</span>
                            <p>Need to finish the launch page, reply to Maya, and stop avoiding mobile QA.</p>
                            <div><span>Don’t organize yet</span><kbd>⌘ ↵</kbd></div>
                        </div>
                    {:else if activeStage === 1}
                        <div class="plan-demo">
                            <div><span>Your plan</span><strong>Launch page</strong><small>52 min total</small></div>
                            <p><b><Check size={11} /></b><span>Review final product copy</span><small>12m</small></p>
                            <p><b>2</b><span>Polish mobile sections</span><small>25m</small></p>
                            <p><b>3</b><span>Run the final build</span><small>15m</small></p>
                            <button>Place in my day <ArrowRight size={13} /></button>
                        </div>
                    {:else}
                        <div class="protect-demo">
                            <div class="mini-ring"><LockKeyhole size={24} /></div>
                            <span>FOCUS READY</span>
                            <h4>45 minutes protected</h4>
                            <div><span>Instagram</span><b>Blocked</b></div>
                            <div><span>Reddit</span><b>Blocked</b></div>
                            <div><span>YouTube</span><b>Blocked</b></div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </section>

    <section class="focus-section">
        <div class="focus-copy">
            <div class="eyebrow light"><span></span> Focus with follow-through</div>
            <h2>A timer tells you to focus.<br /><em>Resin clears the way.</em></h2>
            <p>Your next action stays visible while selected apps and sites step out of reach. No guilt dashboard. No streak anxiety. Just a quieter place to continue.</p>
            <div class="focus-points">
                <div><span><Clock3 size={18} /></span><div><strong>Begin in seconds</strong><small>Choose 15 minutes, two hours, or anything between.</small></div></div>
                <div><span><LockKeyhole size={18} /></span><div><strong>Block for real</strong><small>Apple Screen Time protection and synced website blocking.</small></div></div>
                <div><span><Sparkles size={18} /></span><div><strong>Return gently</strong><small>Blocked surfaces point back to what you meant to do.</small></div></div>
            </div>
            <a href="/focus">Explore focus <ArrowRight size={16} /></a>
        </div>
        <div class="focus-composition">
            <div class="focus-window">
                <div class="focus-window-top"><span>Current focus</span><i></i></div>
                <div class="focus-window-body"><small>UP NEXT</small><h3>Polish mobile sections</h3><p>Keep the hero compact, make the product proof obvious, and test at 390px.</p><div><span>25 min</span><b>Step 2 of 3</b></div></div>
            </div>
            <div class="block-card"><ShieldCheck size={22} color="#e8aa69" /><div><strong>Protected across devices</strong><span>Changes sync when focus starts and ends.</span></div></div>
            <div class="site-block"><span>reddit.com</span><strong>Not right now.</strong><p>You’re focusing on “Polish mobile sections.”</p><button>Return to task</button></div>
        </div>
    </section>

    <section class="feature-section">
        <header class="section-header">
            <div><div class="eyebrow"><span></span> The whole follow-through loop</div><h2>Built for what happens<br />after you write it down.</h2></div>
            <p>Resin connects the tools that usually drift apart: notes, realistic scheduling, protected focus, and reflection.</p>
        </header>

        <div class="feature-grid">
            <article class="feature-wide">
                <div class="feature-copy"><span class="feature-tag">Continue anywhere</span><h3>The same next step follows you—not the distraction.</h3><p>Capture from Chrome, shape the plan on web, and begin protected focus on iPhone without rebuilding context at every handoff.</p><div class="mini-checks"><span><Check size={13} /> Shared current task</span><span><Check size={13} /> Synced focus state</span><span><Check size={13} /> One calm inbox</span></div></div>
                <div class="handoff-art"><div class="handoff-node chrome"><span class="handoff-icon"><Chrome size={16} /></span><span>Captured</span><small>Chrome</small></div><i></i><div class="handoff-node web"><span class="web-mark">↗</span><span>Planned</span><small>Web</small></div><i></i><div class="handoff-node iphone"><span class="handoff-icon"><Apple size={16} /></span><span>Protected</span><small>iPhone</small></div></div>
            </article>
            <article class="schedule-feature"><span class="feature-tag">Scheduling</span><h3>A plan that fits the day you actually have.</h3><p>Respect working hours, existing events, and honest task lengths.</p><div class="calendar-art"><div><span>9:00</span><b>Team standup</b></div><div><span>10:00</span><b class="amber">Launch plan · 52m</b></div><div><span>11:00</span><b class="open">Open time</b></div></div></article>
            <article class="privacy-feature"><span class="feature-tag">Designed with restraint</span><h3>Useful without turning your life into a scoreboard.</h3><p>AI is optional. Your focus can be manual. Your progress is context—not a source of pressure.</p><div class="privacy-seal"><ShieldCheck size={31} /><strong>Private by design</strong><span>Clear controls · no ads</span></div></article>
        </div>
    </section>

    <section class="audience-strip">
        <span>Built for</span><p>scattered thinkers</p><i></i><p>deep workers</p><i></i><p>recovering tab collectors</p><i></i><p>people with full calendars</p>
    </section>

    <section class="faq-section">
        <div class="faq-title"><div class="eyebrow"><span></span> Questions, answered</div><h2>Know what you’re<br />starting with.</h2><p>Simple at the surface. Clear about what happens underneath.</p></div>
        <div class="faq-list">
            {#each faqs as faq, index}
                <div class="faq-item">
                    <button onclick={() => openFaq = openFaq === index ? null : index} aria-expanded={openFaq === index}><span>{faq[0]}</span><i class:open={openFaq === index}>+</i></button>
                    {#if openFaq === index}<p>{faq[1]}</p>{/if}
                </div>
            {/each}
        </div>
    </section>

    <section class="final-cta">
        <div class="cta-orbit one"></div><div class="cta-orbit two"></div>
        <div class="eyebrow light"><span></span> Start with one thought</div>
        <h2>Make the next step<br /><em>feel lighter.</em></h2>
        <p>Capture the mess. Shape the plan. Protect the time.</p>
        <div class="final-actions"><a class="amber-cta" href="/login?mode=start&next=/">Start free on the web <ArrowRight size={17} /></a><a class="quiet-cta" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"><Apple size={16} /> Get the iOS app</a></div>
        <small>No ads · AI optional · cancel anytime</small>
    </section>
</main>

<style>
    :global(body) { background:#f4efe7; }
    .landing-shell { color:#26231f; overflow:hidden; background:#f4efe7; }
    h1,h2,h3,h4 { font-family:var(--font-serif),Georgia,serif; }
    button,a { transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease; }
    a:hover,button:hover { transform:translateY(-1px); }
    a:focus-visible,button:focus-visible { outline:2px solid #d69350; outline-offset:3px; }
    .eyebrow { display:flex; align-items:center; gap:10px; color:#817568; font-size:10px; font-weight:850; letter-spacing:.13em; text-transform:uppercase; }
    .eyebrow > span { width:31px; height:1px; background:#c98042; }
    .eyebrow.light { color:rgba(255,255,255,.58); }.eyebrow.light > span { background:#dfa15d; }

    .hero-section { min-height:1120px; padding:156px max(24px,calc((100vw - 1180px)/2)) 100px; position:relative; }
    .hero-aura { position:absolute; width:720px; height:720px; left:50%; top:-350px; transform:translateX(-50%); border-radius:50%; background:rgba(222,164,104,.13); filter:blur(20px); box-shadow:0 0 0 110px rgba(222,164,104,.03),0 0 0 220px rgba(222,164,104,.018); }
    .hero-copy { max-width:900px; margin:auto; text-align:center; position:relative; z-index:2; }
    .announcement { width:max-content; max-width:100%; min-height:34px; margin:0 auto 26px; padding:5px 10px 5px 6px; border:1px solid rgba(38,35,31,.1); border-radius:999px; display:flex; align-items:center; gap:8px; color:#73695f; background:rgba(255,253,248,.68); box-shadow:0 7px 20px rgba(38,35,31,.05); font-size:10px; font-weight:700; }
    .announcement > span { padding:5px 8px; border-radius:999px; color:#fff; background:#355644; font-size:8px; letter-spacing:.08em; text-transform:uppercase; }
    .hero-copy h1 { font-size:clamp(60px,7.4vw,106px); line-height:.9; letter-spacing:-.058em; text-wrap:balance; }
    .hero-copy h1 em,.final-cta h2 em { color:#c98042; font-style:normal; }
    .hero-lede { max-width:680px; margin:29px auto 0; color:#756b60; font-size:19px; line-height:1.65; text-wrap:balance; }
    .hero-actions { display:flex; justify-content:center; flex-wrap:wrap; gap:10px; margin-top:32px; }
    .hero-actions a,.final-actions a { min-height:50px; padding:0 20px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; gap:9px; text-decoration:none; font-size:12px; font-weight:800; }
    .primary-cta { color:#fff; background:#26231f; box-shadow:0 13px 30px rgba(38,35,31,.17); }.primary-cta:hover { background:#355644; box-shadow:0 16px 34px rgba(53,86,68,.2); }
    .secondary-cta { color:#26231f; border:1px solid rgba(38,35,31,.11); background:rgba(255,253,248,.72); }
    .trust-row { display:flex; justify-content:center; flex-wrap:wrap; gap:18px; margin-top:20px; color:#817568; font-size:9px; font-weight:700; }.trust-row span { display:flex; align-items:center; gap:5px; }

    .product-stage { max-width:1080px; height:600px; margin:76px auto 0; position:relative; perspective:1400px; }
    .stage-grid { position:absolute; inset:30px 0 0; border-radius:28px; opacity:.28; background-image:linear-gradient(rgba(38,35,31,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(38,35,31,.08) 1px,transparent 1px); background-size:48px 48px; mask-image:linear-gradient(to bottom,black,transparent 92%); }
    .browser-card { width:82%; height:510px; margin:auto; border:1px solid rgba(38,35,31,.12); border-radius:22px; overflow:hidden; background:#fffdf8; box-shadow:0 45px 100px rgba(38,35,31,.16); transform:rotateX(1deg); }
    .browser-bar { height:45px; padding:0 15px; border-bottom:1px solid rgba(38,35,31,.08); display:grid; grid-template-columns:1fr 1.6fr 1fr; align-items:center; color:#8e8479; background:#faf7f1; font-size:8px; }
    .window-dots { display:flex; gap:5px; }.window-dots span { width:7px; height:7px; border-radius:50%; background:#ded6ca; }
    .address-pill { padding:7px 12px; border:1px solid rgba(38,35,31,.07); border-radius:7px; text-align:center; background:#fff; }
    .sync-state { justify-self:end; display:flex; align-items:center; gap:5px; font-weight:700; }.sync-state i { width:6px; height:6px; border-radius:50%; background:#47705a; box-shadow:0 0 0 3px rgba(71,112,90,.1); }
    .browser-body { height:465px; display:grid; grid-template-columns:112px 1fr; }.browser-body aside { padding:18px 13px; border-right:1px solid rgba(38,35,31,.07); background:#faf7f1; }
    .mini-brand { width:29px; height:29px; margin-bottom:28px; border-radius:9px; display:grid; place-items:center; color:#d69350; background:#26231f; font-family:Georgia,serif; font-weight:800; }
    .side-item { margin:5px 0; padding:8px 9px; border-radius:7px; color:#958a7e; font-size:8px; font-weight:750; }.side-item.active { color:#355644; background:#e3ebe4; }
    .today-view { padding:33px 38px; }.today-top { display:flex; align-items:flex-end; justify-content:space-between; }.today-top span { color:#968b7f; font-size:8px; font-weight:850; letter-spacing:.1em; text-transform:uppercase; }.today-top h2 { margin-top:5px; font-size:27px; letter-spacing:-.03em; }.today-top button { min-height:30px; padding:0 10px; border:0; border-radius:8px; color:#fff; background:#26231f; font-size:7px; font-weight:800; }
    .thought-input { height:44px; margin-top:20px; padding:0 13px; border:1px solid rgba(38,35,31,.09); border-radius:10px; display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px; color:#a0968b; background:#fff; box-shadow:0 5px 16px rgba(38,35,31,.04); font-size:8px; }.thought-input kbd { padding:3px 5px; border:1px solid rgba(38,35,31,.09); border-radius:4px; font-size:6px; }
    .schedule-label { margin-top:22px; display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:9px; color:#7d7267; font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }.schedule-label i { height:1px; background:rgba(38,35,31,.08); }.schedule-label small { color:#aaa095; font-size:7px; text-transform:none; letter-spacing:0; }
    .plan-card { min-height:106px; margin-top:10px; padding:15px 14px; border:1px solid rgba(38,35,31,.09); border-radius:13px; display:grid; grid-template-columns:5px 1fr 45px auto; align-items:center; gap:12px; background:#fff; box-shadow:0 10px 25px rgba(38,35,31,.055); }.plan-accent { width:4px; align-self:stretch; border-radius:999px; background:#c98042; }.plan-copy > span { color:#9a8f83; font-size:7px; font-weight:850; text-transform:uppercase; letter-spacing:.09em; }.plan-copy h3 { margin-top:4px; font-size:17px; }.plan-copy p { margin-top:5px; color:#817568; font-size:7px; }.plan-time { text-align:center; }.plan-time strong,.plan-time span { display:block; }.plan-time strong { font:700 18px Georgia,serif; }.plan-time span { color:#9a8f83; font-size:6px; text-transform:uppercase; }.plan-card > button { min-height:29px; padding:0 9px; border:0; border-radius:7px; display:flex; align-items:center; gap:5px; color:#fff; background:#355644; font-size:7px; font-weight:800; }
    .mini-timeline { margin-top:14px; display:grid; grid-template-columns:33px 1fr; gap:0 8px; color:#9d9388; font-size:7px; }.mini-timeline > div { min-height:32px; padding:0 9px; border-left:2px solid #b8cbbd; display:flex; align-items:center; justify-content:space-between; color:#486050; background:#e8eee8; font-weight:750; }.mini-timeline > div.timeline-empty { margin-top:5px; border-left-color:#e0d8cd; color:#a2988d; background:#faf7f1; font-weight:600; }.mini-timeline small { font-size:6px; }
    .phone-card { width:210px; padding:8px; border:1px solid rgba(255,255,255,.7); border-radius:33px; position:absolute; right:0; bottom:4px; background:#171a17; box-shadow:0 30px 65px rgba(38,35,31,.24); transform:rotate(3deg); }
    .phone-status { height:29px; padding:0 10px; display:flex; align-items:center; justify-content:space-between; color:#fff; font-size:6px; }.phone-status i { width:52px; height:16px; border-radius:999px; background:#050605; }
    .phone-screen { min-height:355px; padding:24px 15px 17px; border-radius:26px; text-align:center; background:#f4efe7; }.phone-kicker { color:#817568; font-size:7px; font-weight:850; letter-spacing:.12em; text-transform:uppercase; }.focus-ring { width:122px; height:122px; margin:20px auto 17px; border-radius:50%; display:grid; place-items:center; background:conic-gradient(#c98042 0 72%,rgba(38,35,31,.08) 72%); position:relative; }.focus-ring::after { content:""; position:absolute; inset:7px; border-radius:50%; background:#f4efe7; }.focus-ring > div { position:relative; z-index:1; }.focus-ring strong,.focus-ring span { display:block; }.focus-ring strong { font:700 25px Georgia,serif; }.focus-ring span { margin-top:2px; color:#8d8378; font-size:6px; text-transform:uppercase; letter-spacing:.08em; }.phone-screen h3 { font-size:16px; }.phone-screen > p { margin-top:4px; color:#817568; font-size:7px; }.blocked-pill { width:max-content; margin:17px auto; padding:7px 9px; border-radius:999px; display:flex; align-items:center; gap:5px; color:#355644; background:#e2eae3; font-size:7px; font-weight:800; }.phone-screen > button { width:100%; min-height:34px; border:1px solid rgba(38,35,31,.1); border-radius:9px; color:#62594f; background:rgba(255,255,255,.55); font-size:7px; font-weight:800; }
    .extension-card { width:230px; padding:14px; border:1px solid rgba(38,35,31,.1); border-radius:14px; position:absolute; left:0; bottom:33px; background:rgba(255,253,248,.97); box-shadow:0 20px 50px rgba(38,35,31,.15); transform:rotate(-3deg); }.extension-top,.extension-card > div:last-child { display:flex; align-items:center; justify-content:space-between; }.extension-top span { display:flex; align-items:center; gap:6px; font-size:8px; font-weight:850; }.extension-top i { color:#aaa095; font-style:normal; }.extension-card > small { display:block; margin-top:17px; color:#9b9186; font-size:6px; font-weight:850; letter-spacing:.1em; }.extension-card > p { margin:7px 0 13px; font:12px/1.45 Georgia,serif; }.extension-card > div:last-child { padding-top:9px; border-top:1px solid rgba(38,35,31,.07); color:#47705a; font-size:7px; font-weight:800; }
    .proof-chip { position:absolute; padding:10px 12px; border:1px solid rgba(38,35,31,.09); border-radius:11px; display:flex; align-items:center; gap:8px; background:rgba(255,253,248,.96); box-shadow:0 12px 30px rgba(38,35,31,.11); }.proof-chip strong,.proof-chip span { display:block; }.proof-chip strong { font-size:8px; }.proof-chip span { margin-top:2px; color:#8f8579; font-size:6px; }.chip-plan { left:7%; top:77px; }.chip-protect { right:5%; top:110px; }

    .platform-strip { min-height:92px; padding:0 max(24px,calc((100vw - 1180px)/2)); border-top:1px solid rgba(38,35,31,.09); border-bottom:1px solid rgba(38,35,31,.09); display:flex; align-items:center; justify-content:space-between; gap:28px; color:#746b62; }.platform-strip > p { color:#948a7f; font-size:10px; font-weight:700; }.platform-strip > div { display:flex; align-items:center; gap:26px; }.platform-strip span { display:flex; align-items:center; gap:7px; font-size:10px; font-weight:800; }.web-mark { width:25px; height:25px; border-radius:8px; display:grid!important; place-items:center; color:#fff; background:#26231f; }

    .journey-section,.feature-section,.faq-section { padding:125px max(24px,calc((100vw - 1180px)/2)); }
    .section-header.centered { max-width:780px; margin:auto; text-align:center; }.section-header.centered .eyebrow { justify-content:center; }.section-header h2 { margin-top:18px; font-size:clamp(44px,5vw,70px); line-height:.98; letter-spacing:-.048em; }.section-header.centered > p { max-width:600px; margin:22px auto 0; color:#817568; font-size:14px; line-height:1.75; }
    .journey-shell { margin-top:60px; border:1px solid rgba(38,35,31,.1); border-radius:23px; overflow:hidden; background:#fffdf8; box-shadow:0 24px 65px rgba(38,35,31,.08); }
    .stage-tabs { min-height:72px; padding:10px; border-bottom:1px solid rgba(38,35,31,.08); display:grid; grid-template-columns:repeat(3,1fr); gap:5px; background:#faf7f1; }.stage-tabs button { border:0; border-radius:11px; display:flex; align-items:center; justify-content:center; gap:9px; color:#8b8176; background:transparent; font-size:11px; font-weight:800; }.stage-tabs button > span { color:#aaa095; font-size:8px; }.stage-tabs button.active { color:#fff; background:#355644; box-shadow:0 8px 20px rgba(53,86,68,.16); }.stage-tabs button.active > span { color:#dfba91; }
    .journey-content { min-height:535px; display:grid; grid-template-columns:.78fr 1.22fr; }.journey-copy { padding:65px 55px; align-self:center; }.journey-copy h3 { margin-top:20px; font-size:clamp(36px,4vw,54px); line-height:1.02; letter-spacing:-.04em; }.journey-copy > p { margin-top:19px; color:#817568; font-size:14px; line-height:1.75; }.stage-stat { width:max-content; margin-top:27px; padding:9px 11px; border-radius:999px; display:flex; align-items:center; gap:7px; color:#355644; background:#e5ece6; font-size:9px; font-weight:800; }
    .journey-visual { display:grid; place-items:center; position:relative; overflow:hidden; background:#e3ebe4; }.journey-visual::before { content:""; position:absolute; width:380px; height:380px; border:1px solid rgba(53,86,68,.13); border-radius:50%; box-shadow:0 0 0 55px rgba(53,86,68,.04),0 0 0 110px rgba(53,86,68,.025); }.journey-visual.plan-mode { background:#efe3d4; }.journey-visual.plan-mode::before { border-color:rgba(201,128,66,.14); box-shadow:0 0 0 55px rgba(201,128,66,.04),0 0 0 110px rgba(201,128,66,.025); }.journey-visual.protect-mode { background:#2d493a; }
    .capture-demo,.plan-demo,.protect-demo { width:min(380px,72%); position:relative; z-index:1; }
    .capture-demo { padding:30px; border:1px solid rgba(38,35,31,.09); border-radius:16px; background:#fffdf8; box-shadow:0 22px 45px rgba(38,35,31,.13); transform:rotate(-2deg); }.capture-demo > span,.plan-demo > div span,.protect-demo > span { color:#9a8f83; font-size:8px; font-weight:850; letter-spacing:.11em; text-transform:uppercase; }.capture-demo > p { margin-top:17px; font:22px/1.35 Georgia,serif; }.capture-demo > div { margin-top:35px; padding-top:13px; border-top:1px solid rgba(38,35,31,.08); display:flex; align-items:center; justify-content:space-between; color:#9a9085; font-size:8px; }.capture-demo kbd { padding:4px 6px; border:1px solid rgba(38,35,31,.1); border-radius:5px; }
    .plan-demo { padding:24px; border:1px solid rgba(38,35,31,.09); border-radius:16px; background:#fffdf8; box-shadow:0 22px 45px rgba(38,35,31,.13); transform:rotate(1.5deg); }.plan-demo > div strong,.plan-demo > div small { display:block; }.plan-demo > div strong { margin-top:4px; font:24px Georgia,serif; }.plan-demo > div small { margin-top:4px; color:#91877b; font-size:8px; }.plan-demo > p { display:grid; grid-template-columns:24px 1fr auto; align-items:center; gap:9px; padding:12px 0; border-top:1px solid rgba(38,35,31,.07); font-size:9px; }.plan-demo > p:first-of-type { margin-top:18px; }.plan-demo b { width:22px; height:22px; border-radius:7px; display:grid; place-items:center; color:#355644; background:#e3ebe4; }.plan-demo small { color:#978d81; }.plan-demo > button { width:100%; min-height:39px; margin-top:10px; border:0; border-radius:9px; display:flex; align-items:center; justify-content:center; gap:7px; color:#fff; background:#c98042; font-size:9px; font-weight:800; }
    .protect-demo { padding:31px; border:1px solid rgba(255,255,255,.1); border-radius:17px; color:#fff; background:rgba(255,255,255,.06); backdrop-filter:blur(16px); box-shadow:0 25px 50px rgba(0,0,0,.2); }.mini-ring { width:65px; height:65px; margin-bottom:25px; border-radius:21px; display:grid; place-items:center; color:#fff; background:#c98042; box-shadow:0 15px 30px rgba(0,0,0,.2); }.protect-demo > span { color:rgba(255,255,255,.4); }.protect-demo h4 { margin:7px 0 18px; font-size:25px; }.protect-demo > div:not(.mini-ring) { padding:11px 0; border-top:1px solid rgba(255,255,255,.09); display:flex; align-items:center; justify-content:space-between; color:rgba(255,255,255,.7); font-size:9px; }.protect-demo b { color:#efbd83; font-size:8px; text-transform:uppercase; }

    .focus-section { min-height:820px; padding:115px max(24px,calc((100vw - 1180px)/2)); display:grid; grid-template-columns:.92fr 1.08fr; gap:95px; align-items:center; color:#fff; background:#2d493a; position:relative; overflow:hidden; }.focus-section::before { content:""; position:absolute; width:700px; height:700px; right:-180px; top:50%; transform:translateY(-50%); border:1px solid rgba(255,255,255,.06); border-radius:50%; box-shadow:0 0 0 80px rgba(255,255,255,.018),0 0 0 160px rgba(255,255,255,.012); }.focus-copy,.focus-composition { position:relative; z-index:1; }.focus-copy h2 { margin-top:21px; font-size:clamp(48px,5vw,72px); line-height:.98; letter-spacing:-.048em; }.focus-copy h2 em { color:#e9ad70; font-style:normal; }.focus-copy > p { max-width:570px; margin-top:24px; color:rgba(255,255,255,.62); font-size:14px; line-height:1.75; }.focus-points { display:grid; gap:17px; margin-top:34px; }.focus-points > div { display:flex; align-items:center; gap:13px; }.focus-points > div > span { width:40px; height:40px; border:1px solid rgba(255,255,255,.11); border-radius:12px; display:grid; place-items:center; color:#e5a563; background:rgba(255,255,255,.04); }.focus-points strong,.focus-points small { display:block; }.focus-points strong { font-size:11px; }.focus-points small { margin-top:3px; color:rgba(255,255,255,.45); font-size:9px; }.focus-copy > a { display:inline-flex; align-items:center; gap:7px; margin-top:34px; color:#efbd83; text-decoration:none; font-size:11px; font-weight:800; }
    .focus-composition { min-height:550px; }.focus-window { width:83%; border:1px solid rgba(255,255,255,.12); border-radius:20px; overflow:hidden; background:#f4efe7; box-shadow:0 40px 85px rgba(0,0,0,.24); transform:rotate(-2deg); }.focus-window-top { height:42px; padding:0 14px; border-bottom:1px solid rgba(38,35,31,.08); display:flex; align-items:center; justify-content:space-between; color:#817568; background:#faf7f1; font-size:8px; font-weight:800; }.focus-window-top i { width:7px; height:7px; border-radius:50%; background:#c98042; box-shadow:0 0 0 4px rgba(201,128,66,.1); }.focus-window-body { min-height:320px; padding:43px; color:#26231f; }.focus-window-body > small { color:#9a8f83; font-size:7px; font-weight:850; letter-spacing:.11em; }.focus-window-body h3 { margin-top:11px; font-size:35px; line-height:1.05; }.focus-window-body > p { max-width:390px; margin-top:16px; color:#817568; font-size:11px; line-height:1.7; }.focus-window-body > div { margin-top:45px; padding-top:16px; border-top:1px solid rgba(38,35,31,.09); display:flex; align-items:center; justify-content:space-between; color:#a56b38; font-size:9px; font-weight:800; }.focus-window-body b { color:#817568; }
    .block-card { width:290px; padding:15px; border:1px solid rgba(255,255,255,.1); border-radius:14px; display:flex; align-items:center; gap:12px; position:absolute; top:55px; right:-6px; color:#fff; background:rgba(31,53,41,.94); box-shadow:0 18px 40px rgba(0,0,0,.22); }.block-card strong,.block-card span { display:block; }.block-card strong { font-size:9px; }.block-card span { margin-top:3px; color:rgba(255,255,255,.45); font-size:7px; }
    .site-block { width:285px; padding:22px; border:1px solid rgba(38,35,31,.11); border-radius:17px; position:absolute; right:5px; bottom:24px; color:#26231f; background:#fffdf8; box-shadow:0 24px 55px rgba(0,0,0,.22); transform:rotate(3deg); }.site-block > span { color:#a0968b; font-size:7px; font-weight:850; text-transform:uppercase; }.site-block strong { display:block; margin-top:11px; font:23px Georgia,serif; }.site-block p { margin-top:7px; color:#817568; font-size:9px; line-height:1.55; }.site-block button { width:100%; min-height:35px; margin-top:17px; border:0; border-radius:9px; color:#fff; background:#355644; font-size:8px; font-weight:800; }

    .feature-section { background:#faf7f1; }.section-header:not(.centered) { display:grid; grid-template-columns:1fr .7fr; gap:85px; align-items:end; }.section-header:not(.centered) > p { color:#817568; font-size:14px; line-height:1.75; }
    .feature-grid { margin-top:60px; display:grid; grid-template-columns:1fr 1fr; gap:14px; }.feature-grid article { min-height:390px; padding:33px; border:1px solid rgba(38,35,31,.09); border-radius:20px; background:#fffdf8; overflow:hidden; position:relative; }.feature-grid article.feature-wide { grid-column:1/-1; min-height:430px; display:grid; grid-template-columns:.82fr 1.18fr; gap:55px; align-items:center; }.feature-tag { color:#a56c38; font-size:8px; font-weight:850; letter-spacing:.11em; text-transform:uppercase; }.feature-grid h3 { max-width:500px; margin-top:13px; font-size:34px; line-height:1.06; letter-spacing:-.032em; }.feature-grid p { max-width:500px; margin-top:14px; color:#817568; font-size:12px; line-height:1.72; }.mini-checks { display:flex; flex-wrap:wrap; gap:8px; margin-top:24px; }.mini-checks span { padding:7px 9px; border-radius:999px; display:flex; align-items:center; gap:5px; color:#486050; background:#e7eee8; font-size:7px; font-weight:800; }
    .handoff-art { height:250px; display:grid; grid-template-columns:1fr auto 1fr auto 1fr; align-items:center; gap:12px; }.handoff-art > i { width:45px; height:1px; background:linear-gradient(90deg,rgba(53,86,68,.15),rgba(53,86,68,.45)); position:relative; }.handoff-art > i::after { content:""; width:5px; height:5px; border-top:1px solid #65806d; border-right:1px solid #65806d; position:absolute; right:0; top:-2px; transform:rotate(45deg); }.handoff-node { min-height:130px; padding:20px 12px; border:1px solid rgba(38,35,31,.09); border-radius:15px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; background:#fff; box-shadow:0 14px 30px rgba(38,35,31,.07); }.handoff-icon,.handoff-node > .web-mark { margin-bottom:13px; }.handoff-node > span:not(.web-mark) { font:18px Georgia,serif; }.handoff-node small { margin-top:4px; color:#998f83; font-size:7px; }.handoff-node.web { transform:translateY(-18px); background:#f0e3d4; }.handoff-node.iphone { background:#e4ebe5; }
    .calendar-art { margin-top:33px; padding:13px; border:1px solid rgba(38,35,31,.07); border-radius:14px; background:#faf7f1; }.calendar-art > div { min-height:58px; display:grid; grid-template-columns:38px 1fr; align-items:center; gap:9px; border-top:1px solid rgba(38,35,31,.06); color:#958b80; font-size:8px; }.calendar-art > div:first-child { border:0; }.calendar-art b { height:37px; padding:0 10px; border-radius:8px; display:flex; align-items:center; color:#486050; background:#e3ebe4; font-size:8px; }.calendar-art b.amber { color:#8b6038; background:#efddc7; }.calendar-art b.open { color:#a0968b; background:#f2eee8; font-weight:600; }
    .privacy-feature { background:#2d493a!important; color:#fff; }.privacy-feature .feature-tag { color:#efbd83; }.privacy-feature p { color:rgba(255,255,255,.5); }.privacy-seal { width:180px; height:180px; margin:34px auto 0; border:1px solid rgba(255,255,255,.12); border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#efbd83; box-shadow:0 0 0 24px rgba(255,255,255,.025),0 0 0 48px rgba(255,255,255,.014); }.privacy-seal strong { margin-top:13px; color:#fff; font:17px Georgia,serif; }.privacy-seal span { margin-top:4px; color:rgba(255,255,255,.4); font-size:7px; }

    .audience-strip { min-height:110px; padding:24px max(24px,calc((100vw - 1180px)/2)); border-top:1px solid rgba(38,35,31,.09); border-bottom:1px solid rgba(38,35,31,.09); display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:16px; color:#817568; }.audience-strip > span { color:#a56c38; font-size:8px; font-weight:850; letter-spacing:.12em; text-transform:uppercase; }.audience-strip p { font:18px Georgia,serif; }.audience-strip i { width:4px; height:4px; border-radius:50%; background:#c98042; opacity:.55; }

    .faq-section { display:grid; grid-template-columns:.72fr 1.28fr; gap:100px; }.faq-title h2 { margin-top:18px; font-size:clamp(42px,4.7vw,65px); line-height:1; letter-spacing:-.045em; }.faq-title p { margin-top:19px; color:#817568; font-size:13px; line-height:1.7; }.faq-list { border-top:1px solid rgba(38,35,31,.12); }.faq-item { border-bottom:1px solid rgba(38,35,31,.12); }.faq-item button { width:100%; padding:23px 0; border:0; display:flex; align-items:center; justify-content:space-between; text-align:left; color:#26231f; background:transparent; font:700 18px Georgia,serif; }.faq-item button i { width:29px; height:29px; border:1px solid rgba(38,35,31,.1); border-radius:50%; display:grid; place-items:center; color:#817568; font:normal 17px Inter,sans-serif; transition:transform .2s; }.faq-item button i.open { transform:rotate(45deg); }.faq-item > p { max-width:680px; padding:0 50px 22px 0; color:#817568; font-size:12px; line-height:1.75; }

    .final-cta { min-height:560px; margin:0 max(16px,calc((100vw - 1280px)/2)) 16px; padding:90px 25px; border-radius:28px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#fff; background:#26231f; position:relative; overflow:hidden; }.cta-orbit { position:absolute; border:1px solid rgba(255,255,255,.06); border-radius:50%; }.cta-orbit.one { width:550px; height:550px; top:-365px; box-shadow:0 0 0 75px rgba(201,128,66,.03),0 0 0 150px rgba(201,128,66,.018); background:rgba(201,128,66,.08); }.cta-orbit.two { width:220px; height:220px; left:-110px; bottom:-110px; box-shadow:0 0 0 45px rgba(255,255,255,.015); }.final-cta > *:not(.cta-orbit) { position:relative; z-index:1; }.final-cta h2 { margin-top:18px; font-size:clamp(50px,6vw,82px); line-height:.94; letter-spacing:-.05em; }.final-cta > p { margin-top:20px; color:rgba(255,255,255,.55); font-size:14px; }.final-actions { display:flex; gap:10px; margin-top:29px; }.amber-cta { color:#26231f; background:#d69350; }.quiet-cta { color:#fff; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.04); }.final-cta > small { margin-top:18px; color:rgba(255,255,255,.3); font-size:8px; letter-spacing:.05em; }

    @media(max-width:980px) {
        .hero-section { min-height:1050px; }.product-stage { height:560px; }.browser-card { width:92%; }.phone-card { right:1%; }.extension-card { left:1%; }
        .journey-content,.focus-section,.feature-grid article.feature-wide,.section-header:not(.centered),.faq-section { grid-template-columns:1fr; }.journey-copy { padding:52px; }.journey-visual { min-height:500px; }.focus-section { gap:70px; }.focus-composition { max-width:650px; width:100%; margin:auto; }.section-header:not(.centered),.faq-section { gap:30px; }.handoff-art { margin-top:20px; }
    }
    @media(max-width:700px) {
        .hero-section { min-height:auto; padding:124px 18px 74px; }.announcement { font-size:8px; }.hero-copy h1 { font-size:51px; }.hero-lede { font-size:15px; }.hero-actions { flex-direction:column; }.hero-actions a { width:100%; }.trust-row { gap:10px; }
        .product-stage { height:520px; margin-top:55px; }.browser-card { width:100%; height:425px; }.browser-bar { grid-template-columns:1fr 2fr 1fr; }.browser-body { height:380px; grid-template-columns:62px 1fr; }.browser-body aside { padding:12px 6px; }.side-item { padding:6px 4px; font-size:6px; }.mini-brand { margin-bottom:20px; }.today-view { padding:24px 14px; }.today-top h2 { font-size:19px; }.today-top button { display:none; }.thought-input { margin-top:15px; }.plan-card { grid-template-columns:4px 1fr 37px; gap:8px; }.plan-card > button { display:none; }.mini-timeline { display:none; }.phone-card { width:150px; right:-3px; bottom:5px; }.phone-screen { min-height:270px; padding:17px 10px 12px; }.focus-ring { width:88px; height:88px; margin:14px auto; }.focus-ring strong { font-size:18px; }.phone-screen h3 { font-size:12px; }.blocked-pill { font-size:5px; }.extension-card { width:170px; left:-2px; bottom:30px; }.extension-card > p { font-size:9px; }.proof-chip { display:none; }
        .platform-strip { padding:24px 18px; align-items:flex-start; flex-direction:column; gap:14px; }.platform-strip > div { flex-wrap:wrap; gap:16px; }
        .journey-section,.feature-section,.faq-section { padding:85px 18px; }.section-header h2,.faq-title h2 { font-size:42px; }.journey-shell { margin-top:40px; }.stage-tabs { min-height:63px; }.stage-tabs button { flex-direction:column; gap:2px; font-size:9px; }.journey-copy { padding:38px 25px; }.journey-copy h3 { font-size:36px; }.journey-visual { min-height:410px; }.capture-demo,.plan-demo,.protect-demo { width:84%; }
        .focus-section { min-height:auto; padding:85px 18px; }.focus-copy h2 { font-size:43px; }.focus-composition { min-height:480px; }.focus-window { width:94%; }.focus-window-body { min-height:280px; padding:32px 25px; }.focus-window-body h3 { font-size:28px; }.block-card { width:235px; top:35px; right:-5px; }.site-block { width:240px; right:0; bottom:16px; }
        .feature-grid { grid-template-columns:1fr; }.feature-grid article.feature-wide { grid-column:auto; padding:25px; }.feature-grid article { min-height:350px; padding:25px; }.handoff-art { height:auto; grid-template-columns:1fr; gap:8px; }.handoff-art > i { width:1px; height:28px; margin:auto; background:linear-gradient(rgba(53,86,68,.15),rgba(53,86,68,.45)); }.handoff-art > i::after { right:-2px; top:auto; bottom:0; transform:rotate(135deg); }.handoff-node { min-height:90px; }.handoff-node.web { transform:none; }.privacy-seal { width:160px; height:160px; }
        .audience-strip { justify-content:flex-start; }.audience-strip p { font-size:15px; }
        .faq-item button { font-size:16px; }.final-cta { min-height:480px; padding:70px 18px; }.final-actions { width:100%; flex-direction:column; }.final-actions a { width:100%; }
    }
    @media(prefers-reduced-motion:reduce) { * { transition:none!important; }.phone-card,.extension-card,.focus-window,.site-block,.capture-demo,.plan-demo { transform:none; } }
</style>
