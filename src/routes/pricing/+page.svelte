<script lang="ts">
    import { Apple, Check, Chrome, Globe2, Sparkles } from 'lucide-svelte';
    const freeFeatures = ['Notes, calendar, and maps on iPhone','Make as many plans as you want','Block apps with Screen Time','Streaks and rewards'];
    const proFeatures = ['Everything in Free','Your plans on every device','Web app and Chrome, in sync','Block websites while you focus','See your full focus history'];
    const comparison = [
        ['Notes and plans','iPhone','Every device'],['Block apps','iPhone','iPhone'],['Block websites','—','Chrome'],['AI plans','As many as you want','Every device'],['Focus history','7 days','All of it']
    ];
</script>

<svelte:head><title>Pricing | Resin</title><meta name="description" content="Resin is free on iPhone. Go Pro for $2.50/month to use it on your laptop and Chrome too, all in sync." /></svelte:head>

<main class="pricing-page">
    <header class="pricing-hero">
        <h1>Start free.<br><em>Add the rest when you want.</em></h1>
        <p>Everything you need to start is free on your iPhone. Pro adds your laptop and Chrome, all kept in sync.</p>
        <div class="platforms"><span><Apple size={15}/> iPhone</span><span><Globe2 size={15}/> Web</span><span><Chrome size={15}/> Chrome</span></div>
    </header>

    <section class="plans">
        <article>
            <div class="plan-heading"><div><h2>Free</h2></div><div class="price"><strong>$0</strong><small>forever</small></div></div>
            <p class="plan-copy">Turn what's on your mind into a plan, then focus — right on your iPhone.</p>
            <ul>{#each freeFeatures as feature}<li><Check size={14}/>{feature}</li>{/each}</ul>
            <a class="plan-button secondary" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"><Apple size={16}/> Get Resin for iPhone</a>
        </article>
        <article class="pro-plan">
            <div class="best-fit"><Sparkles size={12}/> Best for phone + laptop</div>
            <div class="plan-heading"><div><h2>Pro</h2></div><div class="price"><strong>$2.50</strong><small>/ month, billed yearly</small></div></div>
            <p class="annual"><strong>Save 50%</strong> · $29.99 a year · 7-day free trial</p>
            <p class="plan-copy">Use Resin on your phone, laptop, and Chrome — all in sync, all the time.</p>
            <ul>{#each proFeatures as feature}<li><Check size={14}/>{feature}</li>{/each}</ul>
            <a class="plan-button primary" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer">Start 7-day free trial</a>
            <small class="purchase-note">Apple handles billing. Cancel anytime in iPhone Settings.</small>
        </article>
    </section>

    <section class="comparison">
        <div><h2>One price.<br>All your devices.</h2></div>
        <div class="comparison-table" role="table" aria-label="Plan comparison">
            <div class="comparison-row comparison-head" role="row"><span>Feature</span><strong>Free</strong><strong>Pro</strong></div>
            {#each comparison as row}<div class="comparison-row" role="row"><span>{row[0]}</span><span>{row[1]}</span><strong>{row[2]}</strong></div>{/each}
        </div>
    </section>

    <section class="pricing-note"><div><h2>Not ready for Pro?<br>Start free.</h2><p>Use Resin free on iPhone. No credit card. Add the web and Chrome whenever you want.</p></div><a href="/login?mode=start&next=/">Try it on the web →</a></section>
</main>

<style>
    .pricing-page{padding:150px max(24px,calc((100vw - 1080px)/2)) 90px;color:#25231f}
    .pricing-page h1,.pricing-page h2{font-family:'Manrope','Inter',system-ui,sans-serif!important;font-weight:800!important;letter-spacing:-.035em}
    .pricing-hero{text-align:center}.pricing-hero h1{font-size:clamp(48px,6vw,78px);line-height:.97}.pricing-hero h1 em{color:#c98042;font-style:normal}.pricing-hero>p{max-width:620px;margin:22px auto 0;color:#6f665d;font-size:16px;line-height:1.7}.platforms{display:flex;justify-content:center;gap:9px;margin-top:24px}.platforms span{padding:8px 12px;border:1px solid rgba(37,35,31,.1);border-radius:999px;display:flex;align-items:center;gap:6px;color:#6f665d;background:rgba(255,253,248,.6);font-size:10px;font-weight:700}.plans{margin-top:68px;display:grid;grid-template-columns:1fr 1fr;gap:16px}.plans article{padding:38px;border:1px solid rgba(37,35,31,.1);border-radius:22px;background:rgba(255,253,248,.72)}.plans article.pro-plan{position:relative;border-color:rgba(201,128,66,.3);background:#fffdf8;box-shadow:0 22px 60px rgba(37,35,31,.1)}.best-fit{position:absolute;top:-14px;left:30px;padding:8px 12px;border-radius:999px;display:flex;align-items:center;gap:6px;color:#fff;background:#365744;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}.plan-heading{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.plan-heading h2{font-size:36px}.price{text-align:right}.price strong,.price small{display:block}.price strong{font-size:26px;font-family:'Manrope',sans-serif;font-weight:800}.price small{margin-top:3px;color:#817568;font-size:10px}.annual{margin-top:9px;color:#a56c38;font-size:10px;font-weight:700}.annual strong{padding:4px 8px;border-radius:999px;color:#365744;background:#e5eee6}.plan-copy{max-width:400px;margin-top:20px;color:#6f665d;font-size:13px;line-height:1.65}.plans ul{display:grid;gap:13px;margin:28px 0 32px;list-style:none;padding:0}.plans li{display:flex;align-items:center;gap:10px;color:#4f483f;font-size:13px}.plans li :global(svg){color:#365744;flex-shrink:0}.plan-button{min-height:50px;border-radius:13px;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-size:13px;font-weight:800}.plan-button.primary{color:white;background:#25231f}.plan-button.secondary{color:#25231f;border:1px solid rgba(37,35,31,.14);background:white}.purchase-note{display:block;margin-top:12px;color:#91877c;text-align:center;font-size:10px}.comparison{margin-top:110px;display:grid;grid-template-columns:.7fr 1.3fr;gap:64px;align-items:start}.comparison h2{font-size:clamp(36px,4vw,52px);line-height:1.03}.comparison-table{border:1px solid rgba(37,35,31,.1);border-radius:18px;overflow:hidden;background:rgba(255,253,248,.68)}.comparison-row{min-height:58px;padding:0 22px;border-top:1px solid rgba(37,35,31,.08);display:grid;grid-template-columns:1.5fr .75fr .75fr;align-items:center;color:#6f665d;font-size:13px}.comparison-row:first-child{border:0}.comparison-row strong{color:#365744}.comparison-head{min-height:44px;color:#817568;background:#faf7f1;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.comparison-head strong{color:#817568}.pricing-note{margin-top:110px;padding:52px;border-radius:24px;display:flex;align-items:center;justify-content:space-between;gap:40px;color:#fff;background:#2d493a}.pricing-note h2{font-size:clamp(30px,3.4vw,40px);line-height:1.04}.pricing-note p{max-width:560px;margin-top:14px;color:rgba(255,255,255,.65);font-size:14px;line-height:1.65}.pricing-note a{flex:none;color:#f0b773;text-decoration:none;font-size:14px;font-weight:800}@media(max-width:760px){.pricing-page{padding:120px 18px 70px}.plans,.comparison{grid-template-columns:1fr}.comparison{gap:35px;margin-top:80px}.pricing-note{align-items:flex-start;flex-direction:column;padding:32px}.platforms{flex-wrap:wrap}.plans article{padding:28px}}
</style>
