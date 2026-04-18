<script lang="ts">
    import { C } from './landingTheme';

    const durations = ['25m', '1h', '2h'];
    const apps = ['Instagram', 'TikTok', 'YouTube', 'Twitter'];
    const bullets = [
        { title: 'Instant start',   body: 'Zero-step focus session. No note, no plan required.' },
        { title: 'OS-level lock',   body: 'FamilyControls API. Apps are gone, not hidden.' },
        { title: 'You set the timer', body: '25 min · 1 hr · custom. Session ends, apps return.' },
    ];
</script>

<section class="py-24 px-6 overflow-hidden" style="background:{C.forestDark};">
    <div class="max-w-6xl mx-auto">

        <div class="flex items-center gap-4 mb-4">
            <span class="label">// quick focus</span>
            <div style="flex:1; height:1px; background:rgba(245,239,231,0.08);"></div>
        </div>

        <div class="grid lg:grid-cols-2 gap-16 items-center">

            <!-- Copy -->
            <div>
                <h2 class="headline">
                    No note needed.<br/>
                    <span style="color:{C.amberLight};">Just block and go.</span>
                </h2>
                <p class="subtext">
                    Open Resin. Tap Quick Focus.<br/>
                    Pick a duration. Apps lock.<br/>
                    No friction, no AI, no setup.
                </p>
                <div class="bullets">
                    {#each bullets as { title, body }}
                        <div class="bullet">
                            <div class="bullet-dot" style="background:{C.amber};"></div>
                            <div>
                                <div class="bullet-title">{title}</div>
                                <div class="bullet-body">{body}</div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Phone mock -->
            <div class="flex justify-center lg:justify-end">
                <div class="phone">
                    <div class="notch"></div>

                    <div class="phone-header">resin · quick focus</div>

                    <div class="duration-row">
                        {#each durations as dur, i}
                            <div class="dur-pill"
                                 style="background:{i === 1 ? C.amber : 'rgba(245,239,231,0.06)'};
                                        color:{i === 1 ? C.charcoal : 'rgba(245,239,231,0.4)'};">
                                {dur}
                            </div>
                        {/each}
                    </div>

                    <div class="app-panel">
                        <div class="app-panel-label">blocking</div>
                        {#each apps as app, i}
                            <div class="app-row"
                                 style="border-bottom:{i < apps.length - 1 ? '1px solid rgba(245,239,231,0.05)' : 'none'};">
                                <span class="app-name">{app}</span>
                                <svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true">
                                    <rect x="2" y="6" width="10" height="7" rx="2" fill="{C.amberLight}" opacity="0.6">
                                        <animate attributeName="opacity" values="0.6;1;0.6"
                                                 dur="{1.8 + i * 0.3}s" begin="{i * 0.2}s" repeatCount="indefinite" />
                                    </rect>
                                    <path d="M 4,6 L 4,4 A 3,3 0 0 1 10,4 L 10,6" fill="none"
                                          stroke="{C.amberLight}" stroke-width="1.5" opacity="0.6"
                                          stroke-linecap="round" />
                                </svg>
                            </div>
                        {/each}
                    </div>

                    <div class="start-btn" style="background:{C.amber}; color:{C.charcoal};">
                        Start Focus →
                    </div>

                    <div class="home-bar"></div>
                </div>
            </div>

        </div>
    </div>
</section>

<style>
    .label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px; font-weight: 500;
        letter-spacing: 0.12em; text-transform: uppercase;
        color: rgba(245,239,231,0.3);
    }

    .headline {
        font-size: clamp(32px, 4vw, 52px);
        font-weight: 800;
        line-height: 1.05;
        letter-spacing: -0.02em;
        color: rgba(245,239,231,0.95);
        margin-bottom: 20px;
    }

    .subtext {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        color: rgba(245,239,231,0.45);
        line-height: 1.8;
        margin-bottom: 40px;
    }

    .bullets { display: flex; flex-direction: column; gap: 16px; }
    .bullet { display: flex; align-items: flex-start; gap: 14px; }
    .bullet-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        margin-top: 6px;
        flex-shrink: 0;
    }
    .bullet-title { font-size: 14px; font-weight: 700; color: rgba(245,239,231,0.9); margin-bottom: 2px; }
    .bullet-body  { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: rgba(245,239,231,0.4); }

    .phone {
        width: 240px;
        background: rgba(245,239,231,0.04);
        border: 1.5px solid rgba(245,239,231,0.12);
        border-radius: 28px;
        padding: 12px 12px 20px;
        box-shadow: 0 24px 64px -16px rgba(0,0,0,0.5);
        position: relative;
    }

    .notch {
        width: 52px; height: 5px;
        background: rgba(245,239,231,0.15);
        border-radius: 3px;
        margin: 0 auto 20px;
    }

    .home-bar {
        width: 44px; height: 3px;
        background: rgba(245,239,231,0.15);
        border-radius: 2px;
        margin: 16px auto 0;
    }

    .phone-header {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        color: rgba(245,239,231,0.35);
        margin-bottom: 20px;
        padding: 0 4px;
    }

    .duration-row { display: flex; gap: 8px; margin-bottom: 20px; padding: 0 4px; }
    .dur-pill {
        flex: 1; text-align: center;
        padding: 8px 0;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px; font-weight: 700;
    }

    .app-panel {
        background: rgba(0,0,0,0.2);
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 14px;
    }
    .app-panel-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: rgba(245,239,231,0.3);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 10px;
    }
    .app-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 0;
    }
    .app-name { font-size: 13px; color: rgba(245,239,231,0.7); }

    .start-btn {
        border-radius: 12px;
        padding: 13px;
        text-align: center;
        font-size: 14px; font-weight: 800;
        font-family: 'JetBrains Mono', monospace;
        box-shadow: 0 4px 20px -4px rgba(200,136,74,0.5);
    }
</style>
