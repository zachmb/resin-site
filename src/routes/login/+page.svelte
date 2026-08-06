<script lang="ts">
    import { Apple, ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-svelte';
    import { page } from '$app/stores';

    export let form;
    $: next = $page.url.searchParams.get('next') ?? '/';
    $: isStarting = $page.url.searchParams.get('mode') === 'start';

    const steps = [
        { number: '01', label: 'Capture', copy: 'Write the messy thought.' },
        { number: '02', label: 'Plan', copy: 'See a clear next move.' },
        { number: '03', label: 'Protect', copy: 'Start with fewer distractions.' }
    ];
</script>

<svelte:head>
    <title>{isStarting ? 'Start free' : 'Sign in'} | Resin</title>
    <meta name="description" content="Start Resin free or sign back in. Turn one messy intention into a realistic next action and a protected start." />
</svelte:head>

<main class="login-page">
    <section class="login-story">
        <a class="story-brand" href="/" aria-label="Resin home"><img src="/logo.png" alt=""><span>Resin</span></a>
        <div class="story-copy">
            <div class="story-kicker"><span></span> The follow-through system</div>
            <h1>Turn what you mean to do<br><em>into what you actually start.</em></h1>
            <p>Shape one messy intention into a realistic next action, then protect the attention needed to begin.</p>
            <div class="journey" aria-label="How Resin works">
                {#each steps as step, index}
                    <div class="journey-step">
                        <span>{step.number}</span>
                        <div><strong>{step.label}</strong><small>{step.copy}</small></div>
                        {#if index < steps.length - 1}<ArrowRight size={14} />{/if}
                    </div>
                {/each}
            </div>
        </div>
        <div class="story-preview">
            <div class="preview-icon"><Sparkles size={17}/></div>
            <div><span>YOUR FIRST PROTECTED ACTION</span><strong>Ready in under a minute</strong><small>No setup maze. No productivity system to maintain.</small></div>
            <ShieldCheck size={19}/>
        </div>
    </section>

    <section class="login-panel">
        <div class="login-card">
            <a class="mobile-brand" href="/"><img src="/logo.png" alt=""><span>Resin</span></a>
            <span class="login-kicker">{isStarting ? 'Start free' : 'Welcome back'}</span>
            <h2>{isStarting ? 'Start the thing that matters.' : 'Pick up where you left off.'}</h2>
            <p class="login-copy">Create an account or sign in with one secure tap.</p>
            {#if $page.url.searchParams.get('error')}<p class="notice error" role="alert">That sign-in link expired or could not be completed. Please try again.</p>{/if}
            {#if $page.url.searchParams.get('deleted')}<p class="notice success" role="status">Your Resin account has been deleted. You can start fresh whenever you are ready.</p>{/if}
            <div class="auth-actions">
                <form method="POST" action="?/signInWithApple"><input type="hidden" name="next" value={next}><button class="apple-button"><Apple size={19}/> Continue with Apple</button></form>
                <form method="POST" action="?/signInWithGoogle"><input type="hidden" name="next" value={next}><button class="google-button"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Continue with Google</button></form>
            </div>
            <div class="trust-list">
                <span><Check size={13}/> No password to remember</span>
                <span><Check size={13}/> No credit card</span>
                <span><LockKeyhole size={13}/> Calendar access comes later, only if you connect it</span>
            </div>
            {#if form?.error}<p class="notice error" role="alert">{form.error}</p>{/if}
            <p class="legal">By continuing, you agree to Resin’s <a href="/terms">Terms</a> and acknowledge the <a href="/privacy">Privacy Policy</a>.</p>
            <a class="back-link" href="/">← Back to home</a>
        </div>
    </section>
</main>

<style>
    .login-page{min-height:100vh!important;padding:0!important;display:grid;grid-template-columns:1.08fr .92fr;background:#f5f0e8}.login-story{min-height:100vh;padding:34px max(40px,calc((100vw - 1160px)/2));padding-right:7vw;display:flex;flex-direction:column;color:#fff;background:#2d493a;position:relative;overflow:hidden}.login-story::after{content:"";position:absolute;width:620px;height:620px;right:-360px;top:-190px;border:1px solid rgba(255,255,255,.08);border-radius:50%;box-shadow:0 0 0 76px rgba(255,255,255,.025),0 0 0 152px rgba(255,255,255,.016)}.story-brand,.mobile-brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;position:relative;z-index:1}.story-brand img,.mobile-brand img{width:36px;height:36px;border-radius:11px}.story-brand span,.mobile-brand span{font-family:Georgia,serif;font-size:20px;font-weight:700}.story-copy{max-width:640px;margin:auto 0;position:relative;z-index:1}.story-kicker{display:flex;align-items:center;gap:9px;color:rgba(255,255,255,.56);font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.story-kicker span{width:30px;height:1px;background:#d79753}.story-copy h1{margin-top:20px;color:#fff!important;font-size:clamp(48px,4.7vw,70px);line-height:.98}.story-copy h1 em{color:#efb574;font-style:normal}.story-copy>p{max-width:560px;margin-top:22px;color:rgba(255,255,255,.64);font-size:14px;line-height:1.75}.journey{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:30px}.journey-step{min-width:0;padding:14px;border:1px solid rgba(255,255,255,.1);border-radius:13px;display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.045)}.journey-step>span{color:#e7ac68;font-size:8px;font-weight:800}.journey-step div{min-width:0}.journey-step strong,.journey-step small{display:block}.journey-step strong{font-size:10px}.journey-step small{margin-top:3px;color:rgba(255,255,255,.43);font-size:7px;white-space:nowrap}.journey-step :global(svg){margin-left:auto;color:rgba(255,255,255,.28);flex:none}.story-preview{margin-top:auto;padding:15px 17px;border:1px solid rgba(255,255,255,.1);border-radius:15px;display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.05);position:relative;z-index:1}.preview-icon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:#fff;background:#c98042}.story-preview div:nth-child(2){flex:1}.story-preview span,.story-preview strong,.story-preview small{display:block}.story-preview span{color:#e4aa69;font-size:7px;font-weight:800;letter-spacing:.1em}.story-preview strong{margin-top:4px;font-family:Georgia,serif;font-size:15px}.story-preview small{margin-top:3px;color:rgba(255,255,255,.43);font-size:8px}.story-preview>:global(svg){color:#91b59d}.login-panel{min-height:100vh;padding:100px 32px 50px;display:grid;place-items:center}.login-card{width:min(100%,430px)}.mobile-brand{display:none;color:#25231f}.login-kicker{color:#a56c38;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.login-card h2{max-width:410px;margin-top:10px;font-size:39px;line-height:1.04}.login-copy{margin-top:11px;color:#817568;font-size:12px}.auth-actions{display:grid;gap:9px;margin-top:28px}.auth-actions button{width:100%;min-height:50px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:9px;font-size:11px;font-weight:800;cursor:pointer}.apple-button{border:0;color:#fff;background:#25231f}.google-button{border:1px solid rgba(37,35,31,.12);color:#25231f;background:#fff}.auth-actions button:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(37,35,31,.1)}.trust-list{margin-top:16px;padding:14px;border:1px solid rgba(37,35,31,.08);border-radius:12px;display:grid;gap:9px;color:#817568;background:rgba(255,253,248,.55);font-size:8px}.trust-list span{display:flex;align-items:center;gap:7px}.trust-list :global(svg){color:#365744}.legal{margin-top:20px;color:#998f84;text-align:center;font-size:8px;line-height:1.6}.legal a{color:#365744}.back-link{display:block;margin-top:22px;color:#817568;text-align:center;text-decoration:none;font-size:9px}.notice{margin-top:15px;padding:11px 12px;border-radius:10px;font-size:9px;line-height:1.5}.notice.error{color:#91483f;background:#f5e2de}.notice.success{color:#365744;background:#e2ebe3}@media(max-width:850px){.login-page{grid-template-columns:1fr}.login-story{display:none}.login-panel{padding:62px 20px 44px}.mobile-brand{display:flex;margin-bottom:52px}.login-card h2{font-size:35px}}@media(max-width:430px){.login-panel{place-items:start center}.mobile-brand{margin-bottom:42px}.login-card h2{font-size:32px}.auth-actions button{min-height:52px}}
</style>
