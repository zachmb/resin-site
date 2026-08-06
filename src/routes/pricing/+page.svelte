<script lang="ts">
    import { Apple, Check, Chrome, Globe2, Sparkles } from 'lucide-svelte';
    const freeFeatures = ['Notes, maps, and calendar on iPhone','3 generated plans each day','OS-level app blocking','Focus streaks and rewards'];
    const proFeatures = ['Everything in Free','Unlimited generated plans','Web dashboard and Chrome sync','Website blocking during focus','Full focus history and insights'];
    const comparison = [
        ['Notes and planning','iPhone','Every device'],['App blocking','iPhone','iPhone'],['Website blocking','—','Chrome'],['Generated plans','3 / day','Unlimited'],['Focus insights','7 days','Full history']
    ];
</script>

<svelte:head><title>Pricing | Resin</title><meta name="description" content="Start Resin free on iPhone. Upgrade to Resin Pro for web and Chrome sync, browser blocking, and unlimited plans." /></svelte:head>

<main class="pricing-page">
    <header class="pricing-hero">
        <div class="pricing-kicker"><span></span> Simple by design</div>
        <h1>Start free.<br><em>Expand when you need it.</em></h1>
        <p>The iPhone app is a complete focus system. Pro brings the same plan and protection to your laptop.</p>
        <div class="platforms"><span><Apple size={15}/> iPhone</span><span><Globe2 size={15}/> Web</span><span><Chrome size={15}/> Chrome</span></div>
    </header>

    <section class="plans">
        <article>
            <div class="plan-heading"><div><span>For getting started</span><h2>Free</h2></div><div class="price"><strong>$0</strong><small>forever</small></div></div>
            <p class="plan-copy">Capture, plan, and block distracting apps from your iPhone.</p>
            <ul>{#each freeFeatures as feature}<li><Check size={14}/>{feature}</li>{/each}</ul>
            <a class="plan-button secondary" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"><Apple size={16}/> Get Resin for iPhone</a>
        </article>
        <article class="pro-plan">
            <div class="best-fit"><Sparkles size={12}/> Best for cross-device focus</div>
            <div class="plan-heading"><div><span>For deeper follow-through</span><h2>Pro</h2></div><div class="price"><strong>$2.50</strong><small>/ month, billed yearly</small></div></div>
            <p class="annual"><strong>Save 50%</strong> · $29.99 yearly · 7-day free trial</p>
            <p class="plan-copy">Keep your notes, plan, and browser protection aligned everywhere.</p>
            <ul>{#each proFeatures as feature}<li><Check size={14}/>{feature}</li>{/each}</ul>
            <a class="plan-button primary" href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer">Start 7-day Pro trial</a>
            <small class="purchase-note">Subscriptions are managed securely through Apple.</small>
        </article>
    </section>

    <section class="comparison">
        <div><span class="pricing-kicker"><span></span> Compare plans</span><h2>Choose the surface,<br>not a feature maze.</h2></div>
        <div class="comparison-table" role="table" aria-label="Plan comparison">
            <div class="comparison-row comparison-head" role="row"><span>Feature</span><strong>Free</strong><strong>Pro</strong></div>
            {#each comparison as row}<div class="comparison-row" role="row"><span>{row[0]}</span><span>{row[1]}</span><strong>{row[2]}</strong></div>{/each}
        </div>
    </section>

    <section class="pricing-note"><div><h2>Not ready for Pro?<br>Start with one thought.</h2><p>Use Resin free on the web with no credit card, then add iPhone and Chrome whenever the workflow earns a place in your day.</p></div><a href="/login?mode=start&next=/">Start free on the web →</a></section>
</main>

<style>
    .pricing-page{padding:150px max(24px,calc((100vw - 1080px)/2)) 90px;color:#25231f}.pricing-hero{text-align:center}.pricing-kicker{display:inline-flex;align-items:center;gap:9px;color:#817568;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.pricing-kicker>span{width:28px;height:1px;background:#c98042}.pricing-hero h1{margin-top:20px;font-size:clamp(48px,6vw,78px);line-height:.97}.pricing-hero h1 em{color:#c98042;font-style:normal}.pricing-hero>p{max-width:620px;margin:21px auto 0;color:#817568;font-size:15px;line-height:1.7}.platforms{display:flex;justify-content:center;gap:9px;margin-top:22px}.platforms span{padding:7px 10px;border:1px solid rgba(37,35,31,.1);border-radius:999px;display:flex;align-items:center;gap:6px;color:#6f665d;background:rgba(255,253,248,.6);font-size:9px;font-weight:700}.plans{margin-top:68px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.plans article{padding:32px;border:1px solid rgba(37,35,31,.1);border-radius:20px;background:rgba(255,253,248,.72)}.plans article.pro-plan{position:relative;border-color:rgba(201,128,66,.3);background:#fffdf8;box-shadow:0 22px 60px rgba(37,35,31,.1)}.best-fit{position:absolute;top:-14px;left:25px;padding:7px 10px;border-radius:999px;display:flex;align-items:center;gap:6px;color:#fff;background:#365744;font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.plan-heading{display:flex;justify-content:space-between;gap:20px}.plan-heading>div:first-child span{color:#817568;font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.08em}.plan-heading h2{margin-top:5px;font-size:34px}.price{text-align:right}.price strong,.price small{display:block}.price strong{font-size:25px}.price small{margin-top:3px;color:#817568;font-size:9px}.annual{margin-top:7px;color:#a56c38;text-align:right;font-size:9px;font-weight:700}.annual strong{padding:4px 7px;border-radius:999px;color:#365744;background:#e5eee6}.plan-copy{max-width:400px;margin-top:22px;color:#817568;font-size:12px;line-height:1.65}.plans ul{display:grid;gap:11px;margin:26px 0 30px;list-style:none}.plans li{display:flex;align-items:center;gap:9px;color:#625a52;font-size:11px}.plans li :global(svg){color:#365744}.plan-button{min-height:45px;border-radius:11px;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-size:11px;font-weight:800}.plan-button.primary{color:white;background:#25231f}.plan-button.secondary{color:#25231f;border:1px solid rgba(37,35,31,.12);background:white}.purchase-note{display:block;margin-top:10px;color:#91877c;text-align:center;font-size:8px}.comparison{margin-top:110px;display:grid;grid-template-columns:.7fr 1.3fr;gap:80px;align-items:start}.comparison h2{margin-top:16px;font-size:43px;line-height:1.03}.comparison-table{border:1px solid rgba(37,35,31,.1);border-radius:16px;overflow:hidden;background:rgba(255,253,248,.68)}.comparison-row{min-height:54px;padding:0 18px;border-top:1px solid rgba(37,35,31,.08);display:grid;grid-template-columns:1.5fr .75fr .75fr;align-items:center;color:#817568;font-size:10px}.comparison-row:first-child{border:0}.comparison-row strong{color:#365744}.comparison-head{min-height:42px;color:#817568;background:#faf7f1;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.comparison-head strong{color:#817568}.pricing-note{margin-top:110px;padding:42px;border-radius:20px;display:flex;align-items:center;justify-content:space-between;gap:40px;color:#fff;background:#2d493a}.pricing-note h2{font-size:34px;line-height:1.04}.pricing-note p{max-width:560px;margin-top:12px;color:rgba(255,255,255,.6);font-size:11px;line-height:1.65}.pricing-note a{flex:none;color:#f0b773;text-decoration:none;font-size:11px;font-weight:800}@media(max-width:760px){.pricing-page{padding:120px 18px 70px}.plans,.comparison{grid-template-columns:1fr}.comparison{gap:35px;margin-top:80px}.pricing-note{align-items:flex-start;flex-direction:column;padding:28px}.platforms{flex-wrap:wrap}.plans article{padding:25px}}
</style>
