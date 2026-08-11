<script lang="ts">
    import {
        ArrowRight,
        Apple,
        CalendarDays,
        Check,
        ChevronDown,
        Chrome,
        Clock3,
        LockKeyhole,
        ShieldCheck,
        Sparkles
    } from 'lucide-svelte';

    let activeStage = $state(0);
    let openFaq = $state<number | null>(0);

    const stages = [
        {
            label: 'Capture',
            title: 'Write it the way it arrives.',
            copy: 'No folders, fields, or setup. Start with the unfinished thought from iPhone, web, or the Chrome extension.'
        },
        {
            label: 'Make a plan',
            title: 'Turn ambiguity into a first move.',
            copy: 'Resin breaks the thought into realistic steps, estimates the effort, and recommends what to do next.'
        },
        {
            label: 'Follow through',
            title: 'Give the work a protected start.',
            copy: 'Choose a time, begin focus, and keep distracting apps and sites out of reach while the current step stays visible.'
        }
    ];

    const faqs = [
        ['Is Resin another to-do list?', 'No. Resin is designed for the moment before a task belongs on a list: when the idea is still vague, emotionally heavy, or easy to postpone. It helps you define the next move and protect time to begin it.'],
        ['What does Resin block?', 'On iPhone, Resin uses Apple’s Screen Time APIs to shield the apps you choose. The Chrome extension blocks selected websites during an active focus session.'],
        ['Can I use Resin without AI?', 'Yes. Notes, calendars, manual focus sessions, and blocking work without generated plans. AI-assisted planning is an optional step, not the product’s front door.'],
        ['Do my devices stay in sync?', 'Your notes, plans, schedules, and active protection stay coordinated across the web app, iPhone app, and Chrome extension.']
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
    <section class="hero">
        <div class="hero-copy">
            <p class="kicker">Resin <span></span> Follow through</p>
            <h1>You know what matters.<br /><em>Now start it.</em></h1>
            <p class="hero-lede">Resin turns the thought you keep carrying into a realistic next action, finds room for it, and protects your attention long enough to begin.</p>
            <div class="hero-actions">
                <a class="button primary" href="/login?mode=start&next=/">Make my first plan <ArrowRight size={17} /></a>
                <a class="button secondary" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"><Apple size={17} /> Get the iPhone app</a>
            </div>
            <p class="hero-note"><Check size={14} /> Free unlimited local plans <span></span> No card required</p>
        </div>

        <div class="product-frame" aria-label="A plan moving from capture to protected focus in Resin">
            <div class="product-toolbar">
                <div class="window-dots"><i></i><i></i><i></i></div>
                <span>Today</span>
                <small><i></i> Synced</small>
            </div>
            <div class="product-body">
                <aside>
                    <div class="mini-logo">R</div>
                    <nav aria-label="Product preview navigation">
                        <b>Today</b><span>Plans</span><span>Notes</span><span>Focus</span><span>Calendar</span>
                    </nav>
                    <small>Resin for Web</small>
                </aside>
                <div class="product-content">
                    <div class="product-heading"><div><small>MONDAY, AUGUST 10</small><h2>Make room for what matters.</h2></div><button>New thought</button></div>
                    <div class="capture-field"><Sparkles size={17} class="capture-icon" /><span>Finish the launch page without spending all night on it.</span><kbd>⌘ ↵</kbd></div>
                    <div class="today-label"><span>Now</span><i></i><small>One clear next step</small></div>
                    <article class="active-plan">
                        <div class="plan-mark"></div>
                        <div class="plan-main"><small>LAUNCH PAGE · STEP 2 OF 4</small><h3>Polish the mobile story</h3><p>Keep the proof visible and test the primary action at 390px.</p></div>
                        <div class="plan-duration"><strong>24</strong><span>min left</span></div>
                        <button><LockKeyhole size={14} /> Begin focus</button>
                    </article>
                    <div class="day-row"><span>10:00</span><div class="event muted">Team standup <small>30m</small></div></div>
                    <div class="day-row"><span>10:30</span><div class="event resin">Polish mobile story <small>24m</small></div></div>
                </div>
            </div>
            <div class="phone-preview">
                <div class="phone-top"><span>9:41</span><i></i><span>•••</span></div>
                <small>PROTECTED FOCUS</small>
                <div class="timer"><strong>24:18</strong><span>remaining</span></div>
                <h3>Polish the mobile story</h3>
                <p>Launch page · step 2 of 4</p>
                <div class="shield-row"><ShieldCheck size={14} /> 4 distractions blocked</div>
                <button>Pause focus</button>
            </div>
        </div>

        <div class="platform-row">
            <p>One current step, wherever you work.</p>
            <div><span><Apple size={16} /> iPhone</span><span><Chrome size={16} /> Chrome</span><span class="web-icon">↗</span><span>Web</span><span><CalendarDays size={16} /> Calendar</span></div>
        </div>
    </section>

    <section class="problem-section">
        <div class="section-index">01 / WHY RESIN</div>
        <div class="problem-heading">
            <h2>Most productivity tools begin <em>after</em> the hardest part.</h2>
            <p>They assume the work is already clear, scheduled, and easy to start. Resin is built for the murky part in between.</p>
        </div>
        <div class="comparison-list">
            <div><span>To-do apps</span><p>Store the task</p><small>But leave it vague</small></div>
            <div><span>Smart calendars</span><p>Reserve the time</p><small>But cannot make you begin</small></div>
            <div><span>App blockers</span><p>Remove distraction</p><small>But forget what it was for</small></div>
            <div class="resin-row"><span>Resin</span><p>Clarify, place, and protect</p><small>The whole path to starting</small></div>
        </div>
    </section>

    <section class="workflow-section">
        <div class="section-index">02 / THE WORKFLOW</div>
        <div class="workflow-heading"><h2>From “I should” to<br />“I started.”</h2><p>A short loop designed for overloaded days—not ideal ones.</p></div>
        <div class="workflow-shell">
            <div class="workflow-tabs" role="tablist" aria-label="How Resin works">
                {#each stages as stage, index}
                    <button class:active={activeStage === index} onclick={() => activeStage = index} role="tab" aria-selected={activeStage === index}><span>0{index + 1}</span>{stage.label}</button>
                {/each}
            </div>
            <div class="workflow-detail">
                <div class="workflow-copy"><p>0{activeStage + 1}</p><h3>{stages[activeStage].title}</h3><div>{stages[activeStage].copy}</div></div>
                <div class="workflow-demo">
                    {#if activeStage === 0}
                        <div class="note-demo"><small>INBOX · JUST NOW</small><p>I need to finish the launch page, reply to Maya, and stop avoiding mobile QA.</p><span>Saved. Sort it out later.</span></div>
                    {:else if activeStage === 1}
                        <div class="steps-demo"><header><span>Launch the new page</span><small>52 min total</small></header><p><b><Check size={12} /></b><span>Review final copy</span><small>12m</small></p><p><b>2</b><span>Polish mobile sections</span><small>25m</small></p><p><b>3</b><span>Run final checks</span><small>15m</small></p><button>Place this in my day <ArrowRight size={14} /></button></div>
                    {:else}
                        <div class="protect-demo"><div><LockKeyhole size={25} /></div><small>READY WHEN YOU ARE</small><h4>25 minutes protected</h4><p><span>Instagram</span><b>Blocked</b></p><p><span>Reddit</span><b>Blocked</b></p><p><span>YouTube</span><b>Blocked</b></p></div>
                    {/if}
                </div>
            </div>
        </div>
    </section>

    <section class="focus-section">
        <div class="focus-copy">
            <div class="section-index light">03 / PROTECTED ATTENTION</div>
            <h2>A focus timer tells you to try harder.<br /><em>Resin changes the room.</em></h2>
            <p>Your current step stays visible while chosen apps and sites step out of reach. When focus ends, protection ends with it.</p>
            <div class="focus-points">
                <div><Clock3 size={19} /><span><strong>Start in seconds</strong><small>Use the recommended duration or choose your own.</small></span></div>
                <div><ShieldCheck size={19} /><span><strong>Protect across devices</strong><small>Apple Screen Time and synced website blocking.</small></span></div>
                <div><Sparkles size={19} /><span><strong>Return to the reason</strong><small>Blocked pages point back to the step you chose.</small></span></div>
            </div>
            <a href="/focus">See how focus works <ArrowRight size={16} /></a>
        </div>
        <div class="focus-preview">
            <div class="focus-card"><small>CURRENT FOCUS</small><h3>Polish the mobile story</h3><p>Keep the proof visible and test the primary action at 390px.</p><div><span>24:18 remaining</span><b>Step 2 of 4</b></div></div>
            <div class="blocked-card"><span>reddit.com</span><ShieldCheck size={23} class="blocked-icon" /><h4>Not right now.</h4><p>You chose to focus on “Polish the mobile story.”</p><button>Return to Resin</button></div>
        </div>
    </section>

    <section class="details-section">
        <div class="section-index">04 / BUILT FOR REAL DAYS</div>
        <div class="details-heading"><h2>Structure without the performance.</h2><p>Resin works when you are focused, scattered, motivated, or somewhere in between.</p></div>
        <div class="details-grid">
            <article><span><CalendarDays size={20} /></span><small>SCHEDULING</small><h3>A plan that respects your calendar.</h3><p>See the meetings already in your day, keep honest task lengths, and schedule around the time you actually have.</p></article>
            <article><span><Chrome size={20} /></span><small>CONTINUITY</small><h3>Capture here. Continue there.</h3><p>Your notes, plans, current step, and focus state stay coordinated across iPhone, web, and Chrome.</p></article>
            <article><span><ShieldCheck size={20} /></span><small>RESTRAINT</small><h3>Useful without becoming a scoreboard.</h3><p>No ads. No guilt dashboard. AI is optional, and unlimited local planning is free.</p></article>
        </div>
    </section>

    <section class="faq-section">
        <div class="faq-heading"><div class="section-index">05 / QUESTIONS</div><h2>Before you begin.</h2><p>Clear answers about what Resin does—and what it does not.</p></div>
        <div class="faq-list">
            {#each faqs as faq, index}
                <div class="faq-item">
                    <button onclick={() => openFaq = openFaq === index ? null : index} aria-expanded={openFaq === index}><span>{faq[0]}</span><ChevronDown size={18} class={openFaq === index ? 'faq-icon open' : 'faq-icon'} /></button>
                    {#if openFaq === index}<p>{faq[1]}</p>{/if}
                </div>
            {/each}
        </div>
    </section>

    <section class="final-cta">
        <p>Resin · Follow through</p>
        <h2>Carry less.<br /><em>Start one thing.</em></h2>
        <div class="final-actions"><a class="button amber" href="/login?mode=start&next=/">Make my first plan <ArrowRight size={17} /></a><a class="button dark-quiet" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"><Apple size={17} /> Get Resin for iPhone</a></div>
        <small>Free unlimited local plans · No card required · AI optional</small>
    </section>
</main>

<style>
    :global(body) { background:#f3eee6; }
    .landing-shell { --ink:#27231f; --muted:#786f65; --amber:#c67f3d; --green:#355744; color:var(--ink); overflow:hidden; background:#f3eee6; }
    h1,h2,h3,h4,p { margin:0; } h1,h2,h3,h4 { font-family:var(--font-serif),Georgia,serif; font-weight:400; } button,a { transition:background .18s ease,border-color .18s ease,transform .18s ease; } a:hover,button:hover { transform:translateY(-1px); } a:focus-visible,button:focus-visible { outline:2px solid var(--amber); outline-offset:3px; }
    .hero { padding:166px max(24px,calc((100vw - 1180px)/2)) 54px; }
    .hero-copy { max-width:880px; margin:0 auto; text-align:center; }
    .kicker,.section-index { color:#8b8176; font-size:10px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }.kicker { display:flex; align-items:center; justify-content:center; gap:10px; }.kicker span { width:30px; height:1px; background:#b9afa4; }
    .hero h1 { margin-top:27px; font-size:clamp(64px,7.2vw,102px); line-height:.9; letter-spacing:-.058em; text-wrap:balance; }.hero h1 em,.final-cta h2 em { color:var(--amber); font-style:normal; }
    .hero-lede { max-width:650px; margin:29px auto 0; color:var(--muted); font-size:18px; line-height:1.65; text-wrap:balance; }
    .hero-actions,.final-actions { display:flex; justify-content:center; gap:10px; margin-top:30px; }.button { min-height:52px; padding:0 24px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:9px; text-decoration:none; font-size:14px; font-weight:750; }.primary { color:#fff; background:var(--ink); box-shadow:0 12px 26px rgba(39,35,31,.14); }.primary:hover { background:var(--green); }.secondary { border:1px solid rgba(39,35,31,.13); color:var(--ink); background:#fbf8f2; }
    .hero-note { margin-top:17px; display:flex; align-items:center; justify-content:center; gap:9px; color:#80776d; font-size:10px; }.hero-note span { width:3px; height:3px; border-radius:50%; background:#b9afa4; }
    .product-frame { max-width:1110px; height:660px; margin:78px auto 0; border:1px solid rgba(39,35,31,.13); border-radius:18px; position:relative; background:#fffdf9; box-shadow:0 35px 80px rgba(61,46,31,.13); }
    .product-toolbar { height:48px; padding:0 18px; border-bottom:1px solid rgba(39,35,31,.08); display:grid; grid-template-columns:1fr 1fr 1fr; align-items:center; color:#9b9288; font-size:8px; }.product-toolbar > span { text-align:center; }.product-toolbar > small { justify-self:end; display:flex; align-items:center; gap:5px; }.product-toolbar > small i { width:6px; height:6px; border-radius:50%; background:#6a8a72; }.window-dots { display:flex; gap:5px; }.window-dots i { width:7px; height:7px; border-radius:50%; background:#d9d1c7; }
    .product-body { height:calc(100% - 48px); display:grid; grid-template-columns:170px 1fr; }.product-body aside { padding:28px 20px 20px; border-right:1px solid rgba(39,35,31,.08); display:flex; flex-direction:column; background:#faf7f1; }.mini-logo { width:34px; height:34px; border-radius:10px; display:grid; place-items:center; color:#ebb16f; background:var(--ink); font:18px Georgia,serif; }.product-body nav { display:grid; gap:8px; margin-top:42px; }.product-body nav span,.product-body nav b { padding:10px 12px; border-radius:7px; color:#8d847a; font-size:10px; }.product-body nav b { color:#3f5948; background:#e5ece6; }.product-body aside > small { margin-top:auto; color:#aaa198; font-size:7px; }
    .product-content { padding:54px 56px; }.product-heading { display:flex; align-items:flex-end; justify-content:space-between; }.product-heading small,.active-plan small { color:#9b9187; font-size:8px; font-weight:800; letter-spacing:.12em; }.product-heading h2 { margin-top:9px; font-size:37px; letter-spacing:-.035em; }.product-heading button { min-height:34px; padding:0 13px; border:1px solid rgba(39,35,31,.11); border-radius:8px; color:#fff; background:var(--ink); font-size:9px; font-weight:700; }
    .capture-field { min-height:62px; margin-top:27px; padding:0 18px; border:1px solid rgba(39,35,31,.1); border-radius:10px; display:flex; align-items:center; gap:12px; color:#8d8379; box-shadow:0 9px 24px rgba(39,35,31,.06); font-size:11px; }:global(.capture-icon) { color:var(--amber); }.capture-field kbd { margin-left:auto; padding:4px 6px; border:1px solid rgba(39,35,31,.1); border-radius:5px; color:#a39a90; background:#f8f5ef; font:7px inherit; }
    .today-label { margin-top:35px; display:flex; align-items:center; gap:10px; color:#786f65; font-size:8px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }.today-label i { height:1px; flex:1; background:rgba(39,35,31,.09); }.today-label small { color:#aaa198; font-size:7px; letter-spacing:0; text-transform:none; }
    .active-plan { min-height:128px; margin-top:13px; padding:18px; border:1px solid rgba(39,35,31,.1); border-radius:11px; display:grid; grid-template-columns:4px 1fr 54px auto; align-items:center; gap:16px; background:#fff; box-shadow:0 12px 28px rgba(39,35,31,.06); }.plan-mark { width:4px; height:76px; border-radius:4px; background:var(--amber); }.plan-main h3 { margin-top:7px; font-size:21px; }.plan-main p { margin-top:5px; color:#8d847a; font-size:9px; }.plan-duration { text-align:center; }.plan-duration strong,.plan-duration span { display:block; }.plan-duration strong { font:25px Georgia,serif; }.plan-duration span { color:#999087; font-size:7px; }.active-plan > button { min-height:34px; padding:0 11px; border:0; border-radius:8px; display:flex; align-items:center; gap:6px; color:#fff; background:var(--green); font-size:8px; font-weight:750; }
    .day-row { display:grid; grid-template-columns:42px 1fr; align-items:center; gap:12px; margin-top:12px; color:#aaa198; font-size:8px; }.event { min-height:38px; padding:0 12px; border-left:3px solid #a9b7ad; display:flex; align-items:center; justify-content:space-between; color:#5f7365; background:#edf1ed; font-weight:700; }.event small { font-weight:500; }.event.resin { border-color:var(--amber); color:#8a5d33; background:#f1e4d5; }
    .phone-preview { width:210px; min-height:410px; padding:13px 14px 17px; border:7px solid var(--ink); border-radius:34px; position:absolute; right:-38px; bottom:-28px; color:#fff; text-align:center; background:#2f4f3d; box-shadow:0 30px 60px rgba(39,35,31,.26); transform:rotate(2deg); }.phone-top { display:flex; justify-content:space-between; color:rgba(255,255,255,.65); font-size:7px; }.phone-top i { width:46px; height:13px; border-radius:10px; background:#1f3328; }.phone-preview > small { display:block; margin-top:32px; color:#e4b57e; font-size:7px; font-weight:800; letter-spacing:.13em; }.timer { width:132px; height:132px; margin:18px auto; border:1px solid rgba(255,255,255,.16); border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:inset 0 0 0 8px rgba(255,255,255,.04); }.timer strong { font:27px Georgia,serif; }.timer span { margin-top:3px; color:rgba(255,255,255,.48); font-size:7px; }.phone-preview h3 { font-size:17px; }.phone-preview > p { margin-top:4px; color:rgba(255,255,255,.5); font-size:7px; }.shield-row { margin:18px auto 0; display:flex; align-items:center; justify-content:center; gap:6px; color:#dbbe9b; font-size:7px; }.phone-preview > button { width:100%; min-height:36px; margin-top:20px; border:1px solid rgba(255,255,255,.17); border-radius:8px; color:#fff; background:rgba(255,255,255,.08); font-size:8px; }
    .platform-row { max-width:1110px; margin:58px auto 0; padding-top:25px; border-top:1px solid rgba(39,35,31,.1); display:flex; align-items:center; justify-content:space-between; color:#857c72; }.platform-row p { font:16px Georgia,serif; }.platform-row > div { display:flex; align-items:center; gap:24px; }.platform-row span { display:flex; align-items:center; gap:6px; font-size:9px; font-weight:700; }.platform-row .web-icon { width:17px; height:17px; border:1px solid currentColor; border-radius:5px; display:grid; place-items:center; }
    .problem-section,.workflow-section,.details-section,.faq-section { padding:112px max(24px,calc((100vw - 1110px)/2)); }.problem-section { border-top:1px solid rgba(39,35,31,.1); }.problem-heading,.workflow-heading,.details-heading { margin-top:38px; display:grid; grid-template-columns:1.3fr .7fr; gap:90px; align-items:end; }.problem-heading h2,.workflow-heading h2,.details-heading h2 { font-size:clamp(48px,5vw,70px); line-height:.98; letter-spacing:-.045em; }.problem-heading h2 em { color:var(--amber); font-style:normal; }.problem-heading p,.workflow-heading p,.details-heading p { color:var(--muted); font-size:14px; line-height:1.75; }
    .comparison-list { margin-top:72px; border-top:1px solid rgba(39,35,31,.12); }.comparison-list > div { min-height:84px; border-bottom:1px solid rgba(39,35,31,.12); display:grid; grid-template-columns:.65fr 1fr .75fr; align-items:center; gap:20px; }.comparison-list span { color:#8c8379; font-size:10px; font-weight:800; letter-spacing:.11em; text-transform:uppercase; }.comparison-list p { font:24px Georgia,serif; }.comparison-list small { color:#8b8278; font-size:11px; }.comparison-list .resin-row { margin:0 -20px; padding:0 20px; border-color:transparent; color:#fff; background:var(--green); }.comparison-list .resin-row span,.comparison-list .resin-row small { color:rgba(255,255,255,.6); }
    .workflow-section { background:#faf7f1; }.workflow-shell { margin-top:66px; border:1px solid rgba(39,35,31,.11); background:#fffdf9; }.workflow-tabs { min-height:74px; border-bottom:1px solid rgba(39,35,31,.1); display:grid; grid-template-columns:repeat(3,1fr); }.workflow-tabs button { border:0; border-right:1px solid rgba(39,35,31,.09); display:flex; align-items:center; justify-content:center; gap:12px; color:#8d847a; background:transparent; font-size:11px; font-weight:750; }.workflow-tabs button:last-child { border-right:0; }.workflow-tabs button span { color:#b0a79e; font-size:8px; }.workflow-tabs button.active { color:#fff; background:var(--green); }.workflow-tabs button.active span { color:#e8be90; }
    .workflow-detail { min-height:500px; display:grid; grid-template-columns:.85fr 1.15fr; }.workflow-copy { padding:78px 60px; }.workflow-copy > p { color:var(--amber); font-size:10px; font-weight:800; letter-spacing:.12em; }.workflow-copy h3 { max-width:380px; margin-top:24px; font-size:45px; line-height:1.03; letter-spacing:-.04em; }.workflow-copy > div { max-width:420px; margin-top:22px; color:var(--muted); font-size:14px; line-height:1.75; }.workflow-demo { display:flex; align-items:center; justify-content:center; background:#eee7dd; }
    .note-demo,.steps-demo,.protect-demo { width:76%; border:1px solid rgba(39,35,31,.1); border-radius:12px; background:#fff; box-shadow:0 20px 50px rgba(39,35,31,.12); }.note-demo { padding:30px; transform:rotate(-1.5deg); }.note-demo small,.protect-demo > small { color:#a0764e; font-size:8px; font-weight:800; letter-spacing:.12em; }.note-demo p { margin-top:24px; font:27px/1.4 Georgia,serif; }.note-demo span { display:block; margin-top:30px; padding-top:16px; border-top:1px solid rgba(39,35,31,.08); color:#968d84; font-size:9px; }
    .steps-demo { overflow:hidden; }.steps-demo header { padding:20px; display:flex; justify-content:space-between; border-bottom:1px solid rgba(39,35,31,.08); }.steps-demo header span { font:19px Georgia,serif; }.steps-demo header small,.steps-demo p small { color:#998f85; font-size:8px; }.steps-demo p { min-height:55px; padding:0 20px; border-bottom:1px solid rgba(39,35,31,.07); display:grid; grid-template-columns:25px 1fr auto; align-items:center; gap:9px; font-size:10px; }.steps-demo p b { width:20px; height:20px; border-radius:50%; display:grid; place-items:center; color:#fff; background:var(--green); font-size:8px; }.steps-demo button { min-height:38px; margin:16px 20px; padding:0 13px; border:0; border-radius:8px; display:flex; align-items:center; gap:8px; color:#fff; background:var(--ink); font-size:8px; font-weight:750; }
    .protect-demo { padding:35px; color:#fff; text-align:center; background:var(--green); }.protect-demo > div { width:58px; height:58px; margin:0 auto 20px; border:1px solid rgba(255,255,255,.16); border-radius:50%; display:grid; place-items:center; color:#e6b67e; }.protect-demo > small { color:#e6b67e; }.protect-demo h4 { margin:11px 0 25px; font-size:27px; }.protect-demo p { min-height:38px; border-top:1px solid rgba(255,255,255,.1); display:flex; align-items:center; justify-content:space-between; color:rgba(255,255,255,.65); font-size:9px; }.protect-demo p b { color:#e7be91; }
    .focus-section { min-height:760px; padding:110px max(24px,calc((100vw - 1110px)/2)); display:grid; grid-template-columns:.9fr 1.1fr; gap:95px; align-items:center; color:#fff; background:#263d31; }.section-index.light { color:rgba(255,255,255,.45); }.focus-copy h2 { margin-top:35px; font-size:clamp(48px,5vw,68px); line-height:.98; letter-spacing:-.045em; }.focus-copy h2 em { color:#e0a261; font-style:normal; }.focus-copy > p { max-width:560px; margin-top:25px; color:rgba(255,255,255,.56); font-size:14px; line-height:1.75; }.focus-points { margin-top:34px; display:grid; gap:18px; }.focus-points > div { display:flex; gap:14px; color:#e2ad72; }.focus-points span strong,.focus-points span small { display:block; }.focus-points strong { color:#fff; font-size:11px; }.focus-points small { margin-top:4px; color:rgba(255,255,255,.47); font-size:9px; line-height:1.5; }.focus-copy > a { width:max-content; margin-top:33px; padding-bottom:5px; border-bottom:1px solid rgba(255,255,255,.25); display:flex; align-items:center; gap:8px; color:#fff; text-decoration:none; font-size:11px; font-weight:750; }
    .focus-preview { min-height:520px; position:relative; }.focus-card { width:82%; min-height:360px; padding:45px; border-radius:14px; color:var(--ink); background:#fffdf9; box-shadow:0 30px 70px rgba(0,0,0,.22); transform:rotate(-2deg); }.focus-card small { color:#a1744a; font-size:8px; font-weight:800; letter-spacing:.12em; }.focus-card h3 { max-width:420px; margin-top:20px; font-size:38px; line-height:1.03; }.focus-card p { max-width:390px; margin-top:18px; color:#82786e; font-size:11px; line-height:1.7; }.focus-card > div { margin-top:75px; padding-top:17px; border-top:1px solid rgba(39,35,31,.1); display:flex; justify-content:space-between; color:#9f6b3d; font-size:9px; font-weight:800; }.focus-card b { color:#847b71; }
    .blocked-card { width:295px; padding:25px; border:1px solid rgba(39,35,31,.12); border-radius:12px; position:absolute; right:0; bottom:0; color:var(--ink); background:#f3eee6; box-shadow:0 24px 55px rgba(0,0,0,.25); }.blocked-card > span { color:#91887e; font-size:8px; }:global(.blocked-icon) { display:block; margin-top:28px; color:var(--amber); }.blocked-card h4 { margin-top:12px; font-size:26px; }.blocked-card p { margin-top:7px; color:#7d746a; font-size:9px; line-height:1.6; }.blocked-card button { width:100%; min-height:38px; margin-top:21px; border:0; border-radius:8px; color:#fff; background:var(--green); font-size:8px; font-weight:750; }
    .details-heading { grid-template-columns:1fr .6fr; }.details-grid { margin-top:70px; border-top:1px solid rgba(39,35,31,.12); display:grid; grid-template-columns:repeat(3,1fr); }.details-grid article { min-height:340px; padding:36px 30px; border-right:1px solid rgba(39,35,31,.12); }.details-grid article:first-child { padding-left:0; }.details-grid article:last-child { padding-right:0; border-right:0; }.details-grid article > span { width:42px; height:42px; border:1px solid rgba(39,35,31,.12); border-radius:10px; display:grid; place-items:center; color:var(--green); background:#faf7f1; }.details-grid small { display:block; margin-top:50px; color:#a07146; font-size:8px; font-weight:800; letter-spacing:.13em; }.details-grid h3 { margin-top:15px; font-size:29px; line-height:1.08; }.details-grid p { margin-top:15px; color:var(--muted); font-size:11px; line-height:1.75; }
    .faq-section { border-top:1px solid rgba(39,35,31,.1); display:grid; grid-template-columns:.7fr 1.3fr; gap:100px; }.faq-heading h2 { margin-top:35px; font-size:58px; letter-spacing:-.04em; }.faq-heading > p { max-width:300px; margin-top:18px; color:var(--muted); font-size:12px; line-height:1.7; }.faq-list { border-top:1px solid rgba(39,35,31,.14); }.faq-item { border-bottom:1px solid rgba(39,35,31,.14); }.faq-item button { width:100%; min-height:74px; padding:0; border:0; display:flex; align-items:center; justify-content:space-between; color:var(--ink); background:transparent; text-align:left; font:20px Georgia,serif; }:global(.faq-icon) { color:#8f867c; transition:transform .2s ease; }:global(.faq-icon.open) { transform:rotate(180deg); }.faq-item > p { max-width:660px; padding:0 45px 24px 0; color:var(--muted); font-size:12px; line-height:1.75; }
    .final-cta { min-height:570px; margin:0 16px 16px; padding:85px 24px; border-radius:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; text-align:center; background:var(--ink); }.final-cta > p { color:#d8a56d; font-size:9px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }.final-cta h2 { margin-top:24px; font-size:clamp(56px,6.5vw,88px); line-height:.92; letter-spacing:-.05em; }.amber { color:var(--ink); background:#d59351; }.dark-quiet { border:1px solid rgba(255,255,255,.18); color:#fff; background:rgba(255,255,255,.05); }.final-cta > small { margin-top:19px; color:rgba(255,255,255,.36); font-size:8px; letter-spacing:.04em; }
    @media(max-width:980px) { .product-frame { margin-right:25px; }.phone-preview { right:-25px; }.problem-heading,.workflow-heading,.details-heading,.focus-section,.faq-section { grid-template-columns:1fr; gap:32px; }.workflow-detail { grid-template-columns:1fr; }.workflow-demo { min-height:440px; }.focus-section { gap:70px; }.focus-preview { max-width:650px; width:100%; }.details-grid { grid-template-columns:1fr; }.details-grid article,.details-grid article:first-child,.details-grid article:last-child { min-height:0; padding:34px 0; border-right:0; border-bottom:1px solid rgba(39,35,31,.12); }.details-grid small { margin-top:28px; } }
    @media(max-width:700px) {
        .hero { padding:124px 18px 42px; }.hero h1 { margin-top:22px; font-size:52px; line-height:.94; }.hero-lede { font-size:15px; line-height:1.6; }.hero-actions,.final-actions { width:100%; flex-direction:column; }.button { width:100%; }.hero-note { flex-wrap:wrap; }
        .product-frame { height:500px; margin:58px 0 0; border-radius:13px; }.product-toolbar { height:38px; }.product-body { height:calc(100% - 38px); grid-template-columns:58px 1fr; }.product-body aside { padding:15px 7px; }.mini-logo { width:28px; height:28px; margin:auto; }.product-body nav { margin-top:25px; }.product-body nav span,.product-body nav b { padding:7px 3px; text-align:center; font-size:6px; }.product-body aside > small { display:none; }.product-content { padding:30px 14px; }.product-heading h2 { font-size:21px; }.product-heading button { display:none; }.capture-field { min-height:50px; margin-top:18px; padding:0 10px; font-size:7px; }.capture-field kbd { display:none; }.today-label { margin-top:25px; }.active-plan { min-height:112px; padding:12px 10px; grid-template-columns:3px 1fr 34px; gap:8px; }.plan-mark { height:67px; }.plan-main h3 { font-size:14px; }.plan-main p { font-size:6px; line-height:1.4; }.plan-duration strong { font-size:18px; }.active-plan > button { display:none; }.day-row { grid-template-columns:30px 1fr; }.phone-preview { width:145px; min-height:280px; right:-10px; bottom:-20px; padding:9px; border-width:5px; border-radius:25px; }.phone-preview > small { margin-top:16px; }.timer { width:82px; height:82px; margin:12px auto; }.timer strong { font-size:19px; }.phone-preview h3 { font-size:11px; }.shield-row { margin-top:10px; font-size:5px; }.phone-preview > button { min-height:29px; margin-top:10px; }.platform-row { margin-top:45px; align-items:flex-start; flex-direction:column; gap:16px; }.platform-row > div { flex-wrap:wrap; gap:14px; }
        .problem-section,.workflow-section,.details-section,.faq-section { padding:82px 18px; }.problem-heading,.workflow-heading,.details-heading { margin-top:27px; }.problem-heading h2,.workflow-heading h2,.details-heading h2 { font-size:43px; }.comparison-list { margin-top:48px; }.comparison-list > div { min-height:108px; grid-template-columns:1fr 1fr; gap:7px 12px; }.comparison-list small { grid-column:2; }.comparison-list p { font-size:19px; }.comparison-list .resin-row { margin:0 -10px; padding:0 10px; }
        .workflow-shell { margin-top:45px; }.workflow-tabs { min-height:65px; }.workflow-tabs button { flex-direction:column; gap:4px; font-size:8px; }.workflow-detail { min-height:0; }.workflow-copy { padding:42px 25px; }.workflow-copy h3 { margin-top:17px; font-size:37px; }.workflow-demo { min-height:390px; }.note-demo,.steps-demo,.protect-demo { width:86%; }.note-demo { padding:24px; }.note-demo p { font-size:21px; }
        .focus-section { min-height:0; padding:82px 18px; }.focus-copy h2 { margin-top:28px; font-size:43px; }.focus-preview { min-height:450px; }.focus-card { width:94%; min-height:310px; padding:32px 25px; }.focus-card h3 { font-size:30px; }.focus-card > div { margin-top:52px; }.blocked-card { width:245px; padding:21px; }.details-grid { margin-top:45px; }.faq-heading h2 { margin-top:27px; font-size:43px; }.faq-item button { min-height:70px; font-size:17px; }.final-cta { min-height:500px; padding:70px 18px; }.final-cta h2 { font-size:54px; }
    }
    @media(prefers-reduced-motion:reduce) { * { transition:none!important; }.phone-preview,.note-demo,.focus-card { transform:none; } }
</style>
