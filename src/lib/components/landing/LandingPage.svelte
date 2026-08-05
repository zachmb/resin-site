<script lang="ts">
    import { ArrowRight, Apple, Check, Chrome, Clock3, LockKeyhole, Sparkles } from 'lucide-svelte';

    let openFaq = $state<number | null>(null);

    const steps = [
        { number: '01', title: 'Drop the thought', copy: 'Write naturally. Resin holds the fragments without asking you to organize first.' },
        { number: '02', title: 'Shape the next steps', copy: 'Turn a messy note into a clear, scheduled plan you can actually begin.' },
        { number: '03', title: 'Protect the time', copy: 'Start focus and block the apps and sites that usually pull you away.' }
    ];

    const faqs = [
        ['What does Resin block?', 'On iPhone, Resin uses Apple’s Screen Time APIs to shield selected apps. The Chrome extension protects the distracting domains you choose during active focus sessions.'],
        ['Where does planning happen?', 'Planning can run on-device on iOS. The web app and extension use Resin’s secure planning service so the same workflow is available from your laptop.'],
        ['Can I use Resin without AI?', 'Yes. Capture notes, start manual focus sessions, manage block lists, and use the calendar without turning a note into a generated plan.'],
        ['Do my devices stay in sync?', 'Your notes, focus sessions, schedules, and protection status stay coordinated across the web app, iOS app, and Chrome extension.']
    ];
</script>

<main class="landing-shell">
    <section class="hero-section">
        <div class="hero-copy">
            <div class="eyebrow"><span></span> One thought. One clear next step.</div>
            <h1>Capture anywhere.<br><em>Focus without drift.</em></h1>
            <p class="hero-lede">Start with a messy thought on web, iPhone, or Chrome. Resin shapes the plan, finds the time, and carries protected focus to the device where you work.</p>
            <div class="hero-actions">
                <a class="primary-cta" href="/login?next=/">Start on the web <ArrowRight size={17} /></a>
                <a class="secondary-cta" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"><Apple size={17} /> Get the iOS app</a>
            </div>
            <div class="trust-row">
                <span><Check size={13} /> Free on iOS</span>
                <span><Check size={13} /> No ads</span>
                <span><Check size={13} /> Private by design</span>
            </div>
        </div>

        <div class="hero-product" aria-label="Resin plan preview">
            <div class="product-window">
                <div class="window-bar">
                    <div class="window-dots"><span></span><span></span><span></span></div>
                    <div class="window-title">Today · Resin</div>
                    <div class="window-status"><span></span> synced</div>
                </div>
                <div class="window-body">
                    <aside>
                        <div class="mini-brand">R</div>
                        <div class="side-item active">Today</div>
                        <div class="side-item">Notes</div>
                        <div class="side-item">Focus</div>
                        <div class="side-item">Insights</div>
                    </aside>
                    <div class="plan-view">
                        <div class="plan-kicker">Wednesday, August 5</div>
                        <h2>Good afternoon, Alex.</h2>
                        <div class="capture-line"><span>What’s on your mind?</span><kbd>⌘ ↵</kbd></div>
                        <div class="plan-card featured">
                            <div class="plan-card-top"><span class="plan-label">Your focus plan</span><span class="time-chip">52 min</span></div>
                            <h3>Finish the launch page</h3>
                            <div class="task-row done"><span><Check size={12} /></span><p>Review the final product copy</p><small>12m</small></div>
                            <div class="task-row"><span>2</span><p>Polish mobile sections</p><small>25m</small></div>
                            <div class="task-row"><span>3</span><p>Run the final build</p><small>15m</small></div>
                            <button><LockKeyhole size={13} /> Start protected focus</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="floating-card floating-focus"><span class="float-icon"><LockKeyhole size={15} /></span><div><strong>Focus protected</strong><small>4 distractions blocked</small></div></div>
            <div class="floating-card floating-note"><span class="float-icon amber"><Sparkles size={15} /></span><div><strong>Plan ready</strong><small>3 steps · 52 minutes</small></div></div>
        </div>
    </section>

    <section class="platform-strip" aria-label="Available platforms">
        <span class="platform-intro">Capture here. Continue there. Stay protected.</span>
        <span><Apple size={16} /> iPhone</span><span><Chrome size={16} /> Chrome</span><span class="web-glyph">↗</span><span>Web app</span>
    </section>

    <section class="story-section">
        <header class="section-header">
            <div><div class="eyebrow"><span></span> The Resin rhythm</div><h2>From mental clutter<br>to protected time.</h2></div>
            <p>Borrowing the best parts of a notebook, a planner, and a focus tool—without making you maintain three separate systems.</p>
        </header>
        <div class="steps-grid">
            {#each steps as step, index}
                <article class:step-featured={index === 1}>
                    <div class="step-number">{step.number}</div>
                    <div class="step-art" class:planning={index === 1} class:protecting={index === 2}>
                        {#if index === 0}
                            <div class="note-paper"><span class="note-cursor"></span><p>Need to prep the launch, reply to Maya, and finally fix mobile…</p><div><span>work</span><span>today</span></div></div>
                        {:else if index === 1}
                            <div class="mini-plan"><div><span>Today</span><strong>Launch prep</strong></div><p><b>1</b> Tighten the headline <small>10m</small></p><p><b>2</b> Check responsive layout <small>25m</small></p><p><b>3</b> Ship the update <small>15m</small></p></div>
                        {:else}
                            <div class="protection-orbit"><div><LockKeyhole size={22} /></div><span class="orbit-dot one"></span><span class="orbit-dot two"></span><span class="orbit-dot three"></span></div>
                        {/if}
                    </div>
                    <h3>{step.title}</h3><p>{step.copy}</p>
                </article>
            {/each}
        </div>
    </section>

    <section class="focus-section">
        <div class="focus-copy">
            <div class="eyebrow light"><span></span> Focus with follow-through</div>
            <h2>The plan stays visible.<br>The noise disappears.</h2>
            <p>Start a sprint from any note or choose a quick duration. Resin keeps your next step close while shielding the usual escape hatches.</p>
            <div class="focus-points">
                <div><span><Clock3 size={17} /></span><div><strong>Start in seconds</strong><small>15 minutes, two hours, or anything between.</small></div></div>
                <div><span><LockKeyhole size={17} /></span><div><strong>Real interruption</strong><small>App and site blocking—not another ignorable timer.</small></div></div>
                <div><span><Sparkles size={17} /></span><div><strong>A gentler return</strong><small>Blocked pages point back to the task, without shame.</small></div></div>
            </div>
            <a href="/focus">Explore focus <ArrowRight size={16} /></a>
        </div>
        <div class="focus-demo">
            <div class="phone-shell">
                <div class="phone-top"><span>9:41</span><i></i><span>•••</span></div>
                <div class="phone-content">
                    <div class="phone-kicker">Quick focus</div><h3>How long do you<br>want to protect?</h3>
                    <div class="duration-wheel"><span>15m</span><span class="selected">45m</span><span>1h</span></div>
                    <div class="blocked-list"><span>Blocking</span><div><i>ig</i> Instagram <b>On</b></div><div><i>yt</i> YouTube <b>On</b></div><div><i>rd</i> Reddit <b>On</b></div></div>
                    <button>Begin 45 min focus</button>
                </div>
            </div>
        </div>
    </section>

    <section class="feature-section">
        <div class="feature-intro"><div class="eyebrow"><span></span> Built for the whole loop</div><h2>Everything between<br>“I should” and “done.”</h2></div>
        <div class="feature-grid">
            <article class="feature-wide"><div><span class="feature-tag">Continue anywhere</span><h3>Your next step follows you—not the distraction.</h3><p>Capture from Chrome, review the plan on web, then continue with protected focus on iPhone. Every surface shows the same task and the same current state.</p></div><div class="connection-map"><span class="node main">Next step · 25m</span><span class="node n1">Chrome capture</span><span class="node n2">Web plan</span><span class="node n3">iPhone focus</span><i class="line l1"></i><i class="line l2"></i><i class="line l3"></i></div></article>
            <article><span class="feature-tag">Schedule</span><h3>Plans that fit the day you actually have.</h3><p>Resin respects your working hours, existing calendar, and the time each step should take.</p><div class="calendar-art"><div><span>9</span><b>Deep work</b></div><div><span>10</span><b class="amber">Launch plan</b></div><div><span>11</span><b></b></div></div></article>
            <article><span class="feature-tag">Reflect</span><h3>See momentum, not a guilt dashboard.</h3><p>Simple focus and completion patterns help you understand what makes good days repeatable.</p><div class="bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></article>
        </div>
    </section>

    <section class="faq-section">
        <div class="faq-title"><div class="eyebrow"><span></span> Questions, answered</div><h2>Before you begin.</h2><p>Resin is designed to feel simple at the surface and trustworthy underneath.</p></div>
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
        <div class="cta-glow"></div>
        <div class="eyebrow light"><span></span> Start lighter today</div>
        <h2>Your thoughts deserve<br>a clear next step.</h2>
        <p>Capture the mess. Make a plan. Protect the time.</p>
        <div><a class="amber-cta" href="/login?next=/">Open Resin <ArrowRight size={17} /></a><a class="quiet-cta" href="/pricing">See pricing</a></div>
    </section>
</main>

<style>
    :global(body) { background:#f5f0e8; }
    .landing-shell { color:#26231f; overflow:hidden; background:#f5f0e8; }
    .hero-section { min-height:760px; padding:150px max(28px,calc((100vw - 1180px)/2)) 92px; display:grid; grid-template-columns:.86fr 1.14fr; gap:74px; align-items:center; position:relative; }
    .hero-section::before { content:""; position:absolute; width:520px; height:520px; right:-160px; top:-160px; border:1px solid rgba(201,128,66,.14); border-radius:50%; box-shadow:0 0 0 60px rgba(201,128,66,.025),0 0 0 120px rgba(201,128,66,.018); }
    .eyebrow { display:flex; align-items:center; gap:10px; color:#817568; font-size:11px; font-weight:850; letter-spacing:.13em; text-transform:uppercase; }
    .eyebrow > span { width:34px; height:1px; background:#c98042; }
    .eyebrow.light { color:rgba(255,255,255,.58); }.eyebrow.light > span { background:#dfa15d; }
    h1,h2,h3 { font-family:Georgia,"Times New Roman",serif; }
    .hero-copy h1 { margin-top:24px; font-size:clamp(58px,6.3vw,94px); line-height:.94; letter-spacing:-.052em; }
    .hero-copy h1 em { color:#c98042; font-style:normal; }
    .hero-lede { max-width:560px; margin-top:28px; color:#756b60; font-size:18px; line-height:1.7; }
    .hero-actions { display:flex; flex-wrap:wrap; gap:11px; margin-top:34px; }
    .hero-actions a,.final-cta a { min-height:49px; padding:0 20px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; gap:9px; text-decoration:none; font-size:13px; font-weight:800; }
    .primary-cta { background:#26231f; color:white; box-shadow:0 12px 30px rgba(38,35,31,.18); }.secondary-cta { color:#26231f; background:rgba(255,255,255,.58); border:1px solid rgba(38,35,31,.11); }
    .trust-row { display:flex; flex-wrap:wrap; gap:18px; margin-top:22px; color:#817568; font-size:10px; font-weight:650; }.trust-row span { display:flex; align-items:center; gap:5px; }
    .hero-product { position:relative; perspective:1200px; }
    .product-window { border:1px solid rgba(38,35,31,.11); border-radius:22px; overflow:hidden; background:#fffdf8; box-shadow:0 40px 90px rgba(38,35,31,.15); transform:rotateY(-3deg) rotateX(1deg); }
    .window-bar { height:45px; padding:0 16px; border-bottom:1px solid rgba(38,35,31,.08); display:grid; grid-template-columns:1fr auto 1fr; align-items:center; color:#8b8176; font-size:9px; }.window-dots { display:flex; gap:5px; }.window-dots span { width:7px; height:7px; border-radius:50%; background:#ddd4c8; }.window-title { font-weight:700; }.window-status { justify-self:end; display:flex; align-items:center; gap:5px; }.window-status span { width:6px; height:6px; border-radius:50%; background:#47705a; }
    .window-body { min-height:460px; display:grid; grid-template-columns:102px 1fr; }.window-body aside { padding:18px 12px; border-right:1px solid rgba(38,35,31,.07); background:#faf7f1; }.mini-brand { width:28px; height:28px; margin-bottom:28px; border-radius:9px; display:grid; place-items:center; background:#26231f; color:#d69350; font-family:Georgia,serif; font-weight:700; }.side-item { margin:7px 0; padding:8px 9px; border-radius:7px; color:#8b8176; font-size:8px; font-weight:750; }.side-item.active { color:#355644; background:#e5ebe4; }
    .plan-view { padding:38px 34px; }.plan-kicker,.plan-label { color:#94897d; font-size:8px; font-weight:850; letter-spacing:.11em; text-transform:uppercase; }.plan-view > h2 { margin:6px 0 22px; font-size:28px; letter-spacing:-.03em; }.capture-line { height:43px; padding:0 13px; border:1px solid rgba(38,35,31,.09); border-radius:10px; display:flex; align-items:center; justify-content:space-between; color:#a1978c; background:white; font-size:9px; box-shadow:0 5px 16px rgba(38,35,31,.04); }.capture-line kbd { padding:3px 5px; border:1px solid rgba(38,35,31,.1); border-radius:4px; font-size:7px; }
    .plan-card { margin-top:15px; padding:18px; border:1px solid rgba(38,35,31,.09); border-radius:14px; background:white; box-shadow:0 9px 24px rgba(38,35,31,.05); }.plan-card-top { display:flex; justify-content:space-between; }.time-chip { padding:3px 7px; border-radius:999px; color:#806a4f; background:#f3e6d5; font-size:7px; font-weight:800; }.plan-card h3 { margin:7px 0 12px; font-size:18px; }.task-row { display:grid; grid-template-columns:20px 1fr auto; align-items:center; gap:7px; padding:8px 0; border-top:1px solid rgba(38,35,31,.06); font-size:8px; }.task-row > span { width:18px; height:18px; border-radius:6px; display:grid; place-items:center; color:#31503f; background:#e4ebe4; font-weight:800; }.task-row small { color:#9b9186; }.task-row.done p { color:#9b9186; text-decoration:line-through; }.plan-card button { width:100%; min-height:34px; margin-top:10px; border:0; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px; color:white; background:#355644; font-size:8px; font-weight:800; }
    .floating-card { position:absolute; min-width:170px; padding:11px 13px; border:1px solid rgba(38,35,31,.09); border-radius:12px; display:flex; align-items:center; gap:9px; background:rgba(255,253,248,.95); box-shadow:0 14px 34px rgba(38,35,31,.12); }.floating-card strong,.floating-card small { display:block; }.floating-card strong { font-family:inherit; font-size:9px; }.floating-card small { margin-top:2px; color:#8b8176; font-size:7px; }.float-icon { width:29px; height:29px; border-radius:9px; display:grid; place-items:center; color:#fff; background:#355644; }.float-icon.amber { background:#c98042; }.floating-focus { right:-30px; top:70px; }.floating-note { left:-45px; bottom:48px; }
    .platform-strip { min-height:78px; padding:0 max(28px,calc((100vw - 1180px)/2)); border-top:1px solid rgba(38,35,31,.09); border-bottom:1px solid rgba(38,35,31,.09); display:flex; align-items:center; gap:28px; color:#746b62; font-size:11px; font-weight:700; }.platform-strip > span { display:flex; align-items:center; gap:7px; }.platform-intro { margin-right:auto; color:#9a9084; font-size:10px!important; font-weight:650!important; }.web-glyph { width:25px; height:25px; margin-right:-23px; border-radius:8px; display:grid!important; place-items:center; color:white; background:#26231f; }
    .story-section,.feature-section,.faq-section { padding:120px max(28px,calc((100vw - 1180px)/2)); }.section-header { display:grid; grid-template-columns:1fr .72fr; gap:80px; align-items:end; }.section-header h2,.feature-intro h2,.faq-title h2 { margin-top:17px; font-size:clamp(42px,4.5vw,66px); line-height:1; letter-spacing:-.045em; }.section-header > p { color:#817568; font-size:15px; line-height:1.75; }
    .steps-grid { margin-top:64px; display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }.steps-grid article { padding:18px; border:1px solid rgba(38,35,31,.1); border-radius:18px; background:rgba(255,253,248,.54); }.steps-grid article.step-featured { background:#fffdf8; box-shadow:0 18px 50px rgba(38,35,31,.08); transform:translateY(-12px); }.step-number { color:#a0968b; font-size:9px; font-weight:850; letter-spacing:.12em; }.step-art { height:240px; margin:15px 0 22px; border-radius:13px; display:grid; place-items:center; overflow:hidden; background:#e6ece5; }.step-art.planning { background:#efe4d5; }.step-art.protecting { background:#2f4e3e; }.steps-grid h3 { font-size:24px; letter-spacing:-.025em; }.steps-grid article > p { margin-top:9px; color:#817568; font-size:12px; line-height:1.65; }.note-paper,.mini-plan { width:79%; padding:17px; border:1px solid rgba(38,35,31,.08); border-radius:10px; background:#fffdf8; box-shadow:0 13px 25px rgba(38,35,31,.08); transform:rotate(-2deg); }.note-paper p { font-family:Georgia,serif; font-size:13px; line-height:1.5; }.note-paper > div { display:flex; gap:5px; margin-top:20px; }.note-paper > div span { padding:3px 6px; border-radius:999px; color:#7b6d5d; background:#f0e5d6; font-size:6px; font-weight:800; text-transform:uppercase; }.mini-plan { transform:rotate(1.5deg); }.mini-plan > div span,.mini-plan > div strong { display:block; }.mini-plan > div span { color:#9a8f81; font-size:7px; text-transform:uppercase; }.mini-plan > div strong { margin-top:4px; font-family:Georgia,serif; font-size:15px; }.mini-plan p { display:grid; grid-template-columns:17px 1fr auto; gap:6px; align-items:center; padding:8px 0; border-top:1px solid rgba(38,35,31,.07); font-size:7px; }.mini-plan p:first-of-type { margin-top:10px; }.mini-plan b { width:15px; height:15px; display:grid; place-items:center; border-radius:5px; color:#355644; background:#e4ebe4; }.mini-plan small { color:#9a8f81; }.protection-orbit { width:138px; height:138px; border:1px solid rgba(255,255,255,.14); border-radius:50%; display:grid; place-items:center; position:relative; box-shadow:0 0 0 28px rgba(255,255,255,.03),0 0 0 56px rgba(255,255,255,.02); }.protection-orbit > div { width:62px; height:62px; border-radius:20px; display:grid; place-items:center; color:#fff; background:#c98042; box-shadow:0 14px 30px rgba(0,0,0,.2); }.orbit-dot { position:absolute; width:9px; height:9px; border-radius:50%; background:#f3dfc7; }.orbit-dot.one { top:7px; left:27px; }.orbit-dot.two { right:-4px; top:62px; }.orbit-dot.three { bottom:10px; left:17px; }
    .focus-section { min-height:760px; padding:110px max(28px,calc((100vw - 1180px)/2)); display:grid; grid-template-columns:1fr .86fr; gap:90px; align-items:center; color:white; background:#2d493a; position:relative; overflow:hidden; }.focus-section::before { content:""; position:absolute; width:600px; height:600px; right:-80px; top:50%; transform:translateY(-50%); border:1px solid rgba(255,255,255,.07); border-radius:50%; box-shadow:0 0 0 70px rgba(255,255,255,.02),0 0 0 140px rgba(255,255,255,.014); }.focus-copy { position:relative; z-index:1; }.focus-copy h2 { margin-top:20px; font-size:clamp(46px,5vw,72px); line-height:.98; letter-spacing:-.045em; }.focus-copy > p { max-width:580px; margin-top:24px; color:rgba(255,255,255,.64); font-size:15px; line-height:1.75; }.focus-points { display:grid; gap:18px; margin-top:34px; }.focus-points > div { display:flex; align-items:center; gap:13px; }.focus-points > div > span { width:38px; height:38px; border:1px solid rgba(255,255,255,.12); border-radius:11px; display:grid; place-items:center; color:#e4a25e; background:rgba(255,255,255,.04); }.focus-points strong,.focus-points small { display:block; }.focus-points strong { font-size:12px; }.focus-points small { margin-top:3px; color:rgba(255,255,255,.48); font-size:10px; }.focus-copy > a { display:inline-flex; align-items:center; gap:7px; margin-top:36px; color:#efbd83; text-decoration:none; font-size:12px; font-weight:800; }.focus-demo { position:relative; z-index:1; display:grid; place-items:center; }.phone-shell { width:310px; padding:10px; border-radius:44px; background:#171a17; box-shadow:0 35px 80px rgba(0,0,0,.3); transform:rotate(3deg); }.phone-top { height:33px; padding:0 14px; display:flex; align-items:center; justify-content:space-between; color:white; font-size:8px; }.phone-top i { width:70px; height:20px; border-radius:999px; background:#050605; }.phone-content { min-height:540px; padding:27px 21px 22px; border-radius:34px; color:#26231f; background:#f5f0e8; }.phone-kicker { color:#817568; font-size:8px; font-weight:850; letter-spacing:.12em; text-transform:uppercase; }.phone-content h3 { margin-top:10px; font-size:29px; line-height:1.05; }.duration-wheel { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:27px; }.duration-wheel span { min-height:52px; border:1px solid rgba(38,35,31,.09); border-radius:13px; display:grid; place-items:center; color:#8e8479; background:rgba(255,255,255,.5); font-size:11px; font-weight:750; }.duration-wheel span.selected { color:#fff; background:#355644; box-shadow:0 10px 20px rgba(53,86,68,.18); }.blocked-list { margin-top:26px; padding:15px; border:1px solid rgba(38,35,31,.08); border-radius:15px; background:#fffdf8; }.blocked-list > span { color:#93887d; font-size:8px; font-weight:850; text-transform:uppercase; letter-spacing:.1em; }.blocked-list > div { display:grid; grid-template-columns:25px 1fr auto; align-items:center; gap:8px; padding:10px 0; border-top:1px solid rgba(38,35,31,.06); font-size:9px; font-weight:700; }.blocked-list > div:first-of-type { margin-top:8px; }.blocked-list i { width:23px; height:23px; border-radius:7px; display:grid; place-items:center; background:#f0e7db; font-style:normal; font-size:7px; }.blocked-list b { color:#47705a; font-size:7px; text-transform:uppercase; }.phone-content button { width:100%; min-height:45px; margin-top:22px; border:0; border-radius:12px; color:white; background:#c98042; font-size:10px; font-weight:850; box-shadow:0 12px 24px rgba(201,128,66,.2); }
    .feature-section { background:#faf7f1; }.feature-intro { max-width:650px; }.feature-grid { margin-top:58px; display:grid; grid-template-columns:1fr 1fr; gap:14px; }.feature-grid article { min-height:370px; padding:32px; border:1px solid rgba(38,35,31,.09); border-radius:19px; background:#fffdf8; overflow:hidden; position:relative; }.feature-grid article.feature-wide { grid-column:1/-1; min-height:390px; display:grid; grid-template-columns:.78fr 1.22fr; gap:60px; align-items:center; }.feature-tag { color:#a56c38; font-size:9px; font-weight:850; letter-spacing:.11em; text-transform:uppercase; }.feature-grid h3 { max-width:460px; margin-top:13px; font-size:32px; line-height:1.08; letter-spacing:-.03em; }.feature-grid p { max-width:490px; margin-top:13px; color:#817568; font-size:12px; line-height:1.7; }.connection-map { height:280px; position:relative; }.node { position:absolute; padding:10px 13px; border:1px solid rgba(38,35,31,.09); border-radius:10px; background:#fff; box-shadow:0 9px 20px rgba(38,35,31,.08); font-size:9px; font-weight:750; z-index:2; }.node.main { left:37%; top:40%; padding:15px 18px; color:#fff; background:#355644; }.node.n1 { left:5%; top:17%; }.node.n2 { right:5%; top:12%; }.node.n3 { right:10%; bottom:14%; }.line { position:absolute; height:1px; background:rgba(53,86,68,.22); transform-origin:left; }.l1 { width:170px; left:18%; top:29%; transform:rotate(23deg); }.l2 { width:155px; left:50%; top:47%; transform:rotate(-32deg); }.l3 { width:140px; left:51%; top:55%; transform:rotate(28deg); }.calendar-art { margin-top:36px; padding:12px; border:1px solid rgba(38,35,31,.07); border-radius:13px; background:#faf7f1; }.calendar-art > div { min-height:56px; display:grid; grid-template-columns:26px 1fr; gap:8px; border-top:1px solid rgba(38,35,31,.06); color:#958b80; font-size:8px; }.calendar-art > div:first-child { border:0; }.calendar-art b { height:36px; margin-top:7px; border-radius:8px; background:#e3ebe4; }.calendar-art b.amber { background:#efddc7; }.bars { height:150px; margin-top:48px; display:flex; align-items:end; gap:10px; }.bars i { flex:1; height:40%; border-radius:7px 7px 2px 2px; background:#dfe8df; }.bars i:nth-child(2) { height:68%; }.bars i:nth-child(3) { height:52%; }.bars i:nth-child(4) { height:88%; background:#c98042; }.bars i:nth-child(5) { height:72%; }.bars i:nth-child(6) { height:96%; background:#355644; }.bars i:nth-child(7) { height:78%; }
    .faq-section { display:grid; grid-template-columns:.72fr 1.28fr; gap:100px; }.faq-title p { margin-top:18px; color:#817568; font-size:13px; line-height:1.7; }.faq-list { border-top:1px solid rgba(38,35,31,.12); }.faq-item { border-bottom:1px solid rgba(38,35,31,.12); }.faq-item button { width:100%; padding:22px 0; border:0; display:flex; align-items:center; justify-content:space-between; text-align:left; color:#26231f; background:transparent; font-family:Georgia,serif; font-size:18px; font-weight:700; }.faq-item button i { width:28px; height:28px; border:1px solid rgba(38,35,31,.1); border-radius:50%; display:grid; place-items:center; color:#817568; font:normal 17px Inter,sans-serif; transition:transform .2s; }.faq-item button i.open { transform:rotate(45deg); }.faq-item > p { max-width:680px; padding:0 50px 22px 0; color:#817568; font-size:12px; line-height:1.75; }
    .final-cta { margin:0 max(18px,calc((100vw - 1280px)/2)) 18px; min-height:490px; padding:90px 28px; border-radius:25px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:white; background:#26231f; position:relative; overflow:hidden; }.cta-glow { position:absolute; width:520px; height:520px; top:-360px; border-radius:50%; background:rgba(201,128,66,.22); filter:blur(10px); box-shadow:0 0 0 80px rgba(201,128,66,.04),0 0 0 160px rgba(201,128,66,.025); }.final-cta > *:not(.cta-glow) { position:relative; }.final-cta h2 { margin-top:18px; font-size:clamp(46px,5.5vw,76px); line-height:.97; letter-spacing:-.045em; }.final-cta > p { margin-top:18px; color:rgba(255,255,255,.55); font-size:14px; }.final-cta > div:last-child { display:flex; gap:10px; margin-top:28px; }.amber-cta { color:#26231f; background:#d69350; }.quiet-cta { color:white; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.04); }
    a,button { transition:transform .18s ease,background .18s ease,box-shadow .18s ease; }a:hover,button:hover { transform:translateY(-1px); }a:focus-visible,button:focus-visible { outline:2px solid #d69350; outline-offset:3px; }
    @media(max-width:900px){.hero-section{grid-template-columns:1fr;padding-top:130px;gap:55px}.hero-copy{max-width:680px}.hero-product{max-width:680px}.section-header,.faq-section{grid-template-columns:1fr;gap:30px}.steps-grid{grid-template-columns:1fr}.steps-grid article.step-featured{transform:none}.focus-section{grid-template-columns:1fr;gap:60px}.feature-grid article.feature-wide{grid-template-columns:1fr}.connection-map{min-height:230px}}
    @media(max-width:640px){.hero-section{min-height:auto;padding:118px 20px 70px}.hero-copy h1{font-size:52px}.hero-lede{font-size:15px}.hero-actions{flex-direction:column}.hero-actions a{width:100%}.trust-row{gap:10px}.hero-product{margin:0 -2px}.window-body{grid-template-columns:62px 1fr;min-height:390px}.window-body aside{padding:13px 7px}.side-item{padding:7px 4px}.plan-view{padding:26px 16px}.plan-view>h2{font-size:21px}.floating-card{display:none}.platform-strip{padding:20px;flex-wrap:wrap;gap:16px}.platform-intro{width:100%}.story-section,.feature-section,.faq-section{padding:82px 20px}.section-header h2,.feature-intro h2,.faq-title h2{font-size:42px}.steps-grid{margin-top:40px}.focus-section{padding:82px 20px}.focus-copy h2{font-size:43px}.phone-shell{width:282px}.feature-grid{grid-template-columns:1fr}.feature-grid article.feature-wide{grid-column:auto;padding:24px}.feature-grid article{padding:24px;min-height:330px}.connection-map{display:none}.faq-item button{font-size:16px}.final-cta{min-height:430px;padding:70px 20px}.final-cta>div:last-child{flex-direction:column;width:100%}.final-cta a{width:100%}}
    @media(prefers-reduced-motion:reduce){*{transition:none!important}.product-window,.phone-shell{transform:none}}
</style>
