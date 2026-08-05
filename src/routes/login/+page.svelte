<script lang="ts">
    import { Apple, Check, LockKeyhole } from 'lucide-svelte';
    import { page } from '$app/stores';
    export let form;
    $: next = $page.url.searchParams.get('next') ?? '/?tab=notes';
</script>

<svelte:head><title>Sign in | Resin</title></svelte:head>

<main class="login-page">
    <section class="login-story">
        <div class="story-brand"><img src="/logo.png" alt=""><span>Resin</span></div>
        <div class="story-copy"><div class="story-kicker"><span></span> Your calm workspace</div><h1>Pick up the thread<br>you left behind.</h1><p>Your notes, plans, focus sessions, and browser protection stay together across devices.</p><ul><li><Check size={14}/>Private notes with row-level security</li><li><Check size={14}/>Encrypted in transit and at rest</li><li><Check size={14}/>No ads or sale of personal data</li></ul></div>
        <div class="story-preview"><div><span class="preview-label">Next up</span><strong>Polish the launch page</strong><small>25 minutes · focus protected</small></div><span class="preview-lock"><LockKeyhole size={17}/></span></div>
    </section>

    <section class="login-panel">
        <div class="login-card">
            <div class="mobile-brand"><img src="/logo.png" alt=""><span>Resin</span></div>
            <span class="login-kicker">Welcome back</span><h2>Sign in to continue.</h2><p class="login-copy">Use the account connected to your Resin app.</p>
            {#if $page.url.searchParams.get('error')}<p class="notice error" role="alert">That sign-in link expired or could not be completed. Please try again.</p>{/if}
            {#if $page.url.searchParams.get('deleted')}<p class="notice success" role="status">Your Resin account has been deleted. You can sign in again whenever you want a fresh start.</p>{/if}
            <div class="auth-actions">
                <form method="POST" action="?/signInWithApple"><input type="hidden" name="next" value={next}><button class="apple-button"><Apple size={19}/> Continue with Apple</button></form>
                <form method="POST" action="?/signInWithGoogle"><input type="hidden" name="next" value={next}><button class="google-button"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Continue with Google</button></form>
            </div>
            <div class="calendar-note"><span>Google Calendar is optional until you schedule a plan.</span><a href="/privacy">How access works</a></div>
            {#if form?.error}<p class="notice error" role="alert">{form.error}</p>{/if}
            <p class="legal">By continuing, you agree to Resin’s <a href="/terms">Terms</a> and acknowledge the <a href="/privacy">Privacy Policy</a>.</p>
            <a class="back-link" href="/">← Back to home</a>
        </div>
    </section>
</main>

<style>
    .login-page{min-height:100vh!important;padding:0!important;display:grid;grid-template-columns:1.05fr .95fr;background:#f5f0e8}.login-story{min-height:100vh;padding:34px max(40px,calc((100vw - 1160px)/2));padding-right:7vw;display:flex;flex-direction:column;color:#fff;background:#2d493a;position:relative;overflow:hidden}.login-story::after{content:"";position:absolute;width:600px;height:600px;right:-360px;top:-180px;border:1px solid rgba(255,255,255,.08);border-radius:50%;box-shadow:0 0 0 70px rgba(255,255,255,.025),0 0 0 140px rgba(255,255,255,.016)}.story-brand,.mobile-brand{display:flex;align-items:center;gap:10px}.story-brand img,.mobile-brand img{width:36px;height:36px;border-radius:11px}.story-brand span,.mobile-brand span{font-family:Georgia,serif;font-size:20px;font-weight:700}.story-copy{max-width:600px;margin:auto 0}.story-kicker{display:flex;align-items:center;gap:9px;color:rgba(255,255,255,.55);font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.story-kicker span{width:30px;height:1px;background:#d79753}.story-copy h1{margin-top:20px;color:#fff!important;font-size:clamp(50px,5vw,72px);line-height:.98}.story-copy>p{max-width:540px;margin-top:22px;color:rgba(255,255,255,.62);font-size:14px;line-height:1.75}.story-copy ul{display:grid;gap:11px;margin-top:28px;list-style:none}.story-copy li{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.72);font-size:10px}.story-copy li :global(svg){color:#e3a968}.story-preview{margin-top:auto;padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:14px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.05)}.story-preview strong,.story-preview small{display:block}.preview-label{color:#e4aa69;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.story-preview strong{margin-top:5px;font-family:Georgia,serif;font-size:16px}.story-preview small{margin-top:4px;color:rgba(255,255,255,.42);font-size:8px}.preview-lock{width:39px;height:39px;border-radius:11px;display:grid;place-items:center;color:#fff;background:#c98042}.login-panel{min-height:100vh;padding:110px 30px 50px;display:grid;place-items:center}.login-card{width:min(100%,430px)}.mobile-brand{display:none}.login-kicker{color:#a56c38;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.login-card h2{margin-top:9px;font-size:39px}.login-copy{margin-top:9px;color:#817568;font-size:12px}.auth-actions{display:grid;gap:9px;margin-top:29px}.auth-actions button{width:100%;min-height:48px;border-radius:11px;display:flex;align-items:center;justify-content:center;gap:9px;font-size:11px;font-weight:800}.apple-button{border:0;color:#fff;background:#25231f}.google-button{border:1px solid rgba(37,35,31,.12);color:#25231f;background:#fff}.calendar-note{margin-top:14px;padding:12px 13px;border:1px solid rgba(37,35,31,.09);border-radius:10px;display:flex;justify-content:space-between;gap:12px;color:#817568;background:rgba(255,253,248,.6);font-size:8px}.calendar-note a,.legal a{color:#365744}.legal{margin-top:20px;color:#998f84;text-align:center;font-size:8px;line-height:1.6}.back-link{display:block;margin-top:24px;color:#817568;text-align:center;text-decoration:none;font-size:9px}.notice{margin-top:15px;padding:11px 12px;border-radius:10px;font-size:9px;line-height:1.5}.notice.error{color:#91483f;background:#f5e2de}.notice.success{color:#365744;background:#e2ebe3}@media(max-width:780px){.login-page{grid-template-columns:1fr}.login-story{display:none}.login-panel{padding:100px 20px 50px}.mobile-brand{display:flex;margin-bottom:52px}.login-card h2{font-size:34px}.calendar-note{flex-direction:column}}
</style>
