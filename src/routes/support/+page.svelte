<script lang="ts">
    import { ArrowRight, Chrome, CircleUserRound, CreditCard, LockKeyhole, Mail, Smartphone } from 'lucide-svelte';
    const topics=[
        {icon:Smartphone,title:'iPhone app',copy:'Screen Time, focus sessions, notes, and calendar.'},
        {icon:Chrome,title:'Chrome extension',copy:'Site access, blocking, sync, and block lists.'},
        {icon:CreditCard,title:'Billing and Pro',copy:'Trials, renewals, and getting your purchase back.'},
        {icon:CircleUserRound,title:'Account and data',copy:'Sign-in, syncing, privacy, and deleting your account.'}
    ];
    const answers=[
        ['Why does Resin ask for Screen Time access?','Apple makes apps ask before they can block other apps. The apps you pick stay on your phone — Resin never sees your app list or your Screen Time history.'],
        ['Why does Chrome ask for site access?','The add-on needs your OK once so it can block the sites you picked while you focus. It never reads your pages, forms, cookies, passwords, typing, or history. If you say no, focus still works — it just will not block sites in the browser.'],
        ['Why does Chrome say protection needs setup?','Usually it means site access is off, Pro is not active, or the browser has not caught up yet. Open the popup, tap Retry sync, and Resin will turn on, keep checking, or tell you the one thing to fix.'],
        ['How do I manage or cancel Pro?','Apple handles Pro. Open iPhone Settings → your name → Subscriptions to change or cancel it.'],
        ['Can I delete my account?','Yes. Go to Account → Privacy and tap Delete Account. That will not cancel your Apple subscription, so cancel Pro in iPhone Settings too. Cannot get into the app? Email support@noteresin.com.']
    ];
</script>

<svelte:head><title>Support | Resin</title><meta name="description" content="Get help with Resin — the iPhone app, web app, and Chrome extension."/></svelte:head>
<main class="support-page">
    <header><h1>How can we help?</h1><p>Pick a topic below, or email a real person on our team.</p><a href="mailto:support@noteresin.com?subject=Resin%20support"><Mail size={16}/> Email support</a><small>We usually reply within two business days.</small></header>
    <section class="topic-grid">{#each topics as topic}{@const Icon = topic.icon}<article><Icon size={19}/><h2>{topic.title}</h2><p>{topic.copy}</p><a href="mailto:support@noteresin.com?subject=Resin%20support%20-%20{encodeURIComponent(topic.title)}">Ask about this <ArrowRight size={13}/></a></article>{/each}</section>
    <section class="quick-help"><div><h2>A few things worth knowing.</h2></div><div class="answers">{#each answers as a}<details><summary>{a[0]}</summary><p>{a[1]}</p></details>{/each}</div></section>
    <section class="support-trust"><LockKeyhole size={20}/><div><h2>Have a privacy or security question?</h2><p>We will never ask for your password, Apple ID, Google password, or the contents of your notes.</p></div><a href="/privacy">Read the privacy policy →</a></section>
</main>
<style>
    .support-page{padding:150px max(22px,calc((100vw - 1080px)/2)) 95px;color:#25231f}
    .support-page h1,.support-page h2{font-family:'Manrope','Inter',system-ui,sans-serif!important;font-weight:800!important;letter-spacing:-.03em}
    .support-page>header{text-align:center}.support-page h1{font-size:clamp(52px,6vw,76px)}.support-page>header>p{margin-top:16px;color:#6f665d;font-size:16px}.support-page>header>a{min-height:48px;margin-top:26px;padding:0 20px;border-radius:13px;display:inline-flex;align-items:center;gap:8px;color:#fff;background:#25231f;text-decoration:none;font-size:13px;font-weight:800}.support-page>header>small{display:block;margin-top:12px;color:#9a9085;font-size:11px}.topic-grid{margin-top:68px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.topic-grid article{padding:28px;border:1px solid rgba(37,35,31,.1);border-radius:18px;background:rgba(255,253,248,.72)}.topic-grid article>:global(svg){color:#c98042}.topic-grid h2{margin-top:22px;font-size:19px}.topic-grid p{min-height:58px;margin-top:10px;color:#6f665d;font-size:12px;line-height:1.6}.topic-grid a{display:inline-flex;align-items:center;gap:6px;color:#365744;text-decoration:none;font-size:12px;font-weight:800}.quick-help{margin-top:100px;display:grid;grid-template-columns:.6fr 1.4fr;gap:64px}.quick-help h2{font-size:clamp(32px,3.6vw,42px);line-height:1.04}.answers{border-top:1px solid rgba(37,35,31,.1)}.answers details{border-bottom:1px solid rgba(37,35,31,.1)}.answers summary{padding:22px 0;cursor:pointer;font-family:'Manrope',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.02em}.answers p{padding:0 30px 22px 0;color:#6f665d;font-size:14px;line-height:1.7}.support-trust{margin-top:95px;padding:32px;border-radius:18px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px;color:#fff;background:#2d493a}.support-trust>:global(svg){color:#e4aa69}.support-trust h2{font-size:20px}.support-trust p{margin-top:6px;color:rgba(255,255,255,.62);font-size:12px}.support-trust a{color:#efb773;text-decoration:none;font-size:12px;font-weight:800}@media(max-width:800px){.topic-grid{grid-template-columns:1fr 1fr}.quick-help{grid-template-columns:1fr;gap:32px}.support-trust{grid-template-columns:auto 1fr}.support-trust a{grid-column:2}}@media(max-width:520px){.support-page{padding:120px 18px 70px}.topic-grid{grid-template-columns:1fr}.topic-grid p{min-height:auto}.support-trust{padding:24px}}
</style>
