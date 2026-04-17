<script lang="ts">
    import { C } from './landingTheme';
</script>

<section class="py-20 px-6 overflow-hidden" style="background:{C.bgSecondary}; border-bottom:1px solid rgba(46,42,38,0.08);">
    <div class="max-w-6xl mx-auto">

        <div class="flex items-center gap-4 mb-12">
            <span class="section-label" style="color:{C.earth};">// first run</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
            <span class="mono" style="font-size:10px; color:{C.earthLight};">setup takes 60 seconds</span>
        </div>

        <div class="carousel">

            <!-- 01: Write anything -->
            <div class="card-wrap">
                <div class="card-label mono" style="color:{C.amber};">
                    <span class="font-bold">01</span>
                    <span style="color:{C.earth};">write anything</span>
                </div>
                <div class="phone">
                    <div class="notch"></div>
                    <div class="screen-content">
                        <p class="mono hint">what's on your mind?</p>
                        <div class="note-input">
                            finish the landing page redesign and push to testflight before end of week
                        </div>
                        <div class="tag-row">
                            <span class="chip" style="background:rgba(200,136,74,0.1); color:{C.amberDark};">work</span>
                            <span class="chip" style="background:rgba(77,102,82,0.1); color:{C.forestDark};">design</span>
                        </div>
                    </div>
                    <div class="home-bar"></div>
                </div>
            </div>

            <!-- 02: AI builds the plan -->
            <div class="card-wrap">
                <div class="card-label mono" style="color:{C.forest};">
                    <span class="font-bold">02</span>
                    <span style="color:{C.earth};">ai builds the plan</span>
                </div>
                <div class="phone">
                    <div class="notch"></div>
                    <div class="screen-content">
                        <p class="mono hint" style="color:{C.forest};">→ plan generated (6.1s)</p>
                        <p class="plan-title">landing page redesign</p>
                        <div class="task-list">
                            <div class="task-row">
                                <span class="step-num" style="background:rgba(77,102,82,0.15); color:{C.forest};">1</span>
                                Finalize copy + section order
                            </div>
                            <div class="task-row">
                                <span class="step-num" style="background:rgba(77,102,82,0.15); color:{C.forest};">2</span>
                                Push build · test on device
                            </div>
                            <div class="task-row done">
                                <span class="step-num" style="background:rgba(46,42,38,0.06); color:{C.earthLight};">3</span>
                                Submit to TestFlight
                            </div>
                        </div>
                        <p class="mono hint" style="margin-top:10px;">today · 9:00 – 10:15am</p>
                    </div>
                    <div class="home-bar"></div>
                </div>
            </div>

            <!-- 03: Set your hours -->
            <div class="card-wrap">
                <div class="card-label mono" style="color:{C.amberDark};">
                    <span class="font-bold">03</span>
                    <span style="color:{C.earth};">set your hours</span>
                </div>
                <div class="phone">
                    <div class="notch"></div>
                    <div class="screen-content">
                        <p class="mono hint">when do you do deep work?</p>
                        <div class="time-row">
                            <div class="time-block">
                                <span class="mono hint" style="font-size:9px;">from</span>
                                <span class="time-val">9<span style="font-size:13px;">am</span></span>
                            </div>
                            <div class="time-divider"></div>
                            <div class="time-block">
                                <span class="mono hint" style="font-size:9px;">to</span>
                                <span class="time-val">6<span style="font-size:13px;">pm</span></span>
                            </div>
                        </div>
                        <div class="day-chips">
                            {#each ['S','M','T','W','T','F','S'] as day, i}
                                <span class="day-chip"
                                      style="background:{i >= 1 && i <= 5 ? 'rgba(200,136,74,0.15)' : 'rgba(46,42,38,0.05)'};
                                             color:{i >= 1 && i <= 5 ? C.amberDark : C.earthLight};">
                                    {day}
                                </span>
                            {/each}
                        </div>
                    </div>
                    <div class="home-bar"></div>
                </div>
            </div>

            <!-- 04: Block the noise -->
            <div class="card-wrap">
                <div class="card-label mono" style="color:{C.forest};">
                    <span class="font-bold">04</span>
                    <span style="color:{C.earth};">block the noise</span>
                </div>
                <div class="phone">
                    <div class="notch"></div>
                    <div class="screen-content">
                        <p class="mono hint">// screen time access</p>
                        <div class="app-list">
                            {#each ['Instagram','TikTok','Twitter','YouTube'] as app}
                                <div class="app-row">
                                    <span>{app}</span>
                                    <span class="mono" style="font-size:10px; color:{C.forest};">blocked ✓</span>
                                </div>
                            {/each}
                        </div>
                        <div class="os-badge">OS-level · no override</div>
                    </div>
                    <div class="home-bar"></div>
                </div>
            </div>

            <!-- 05: Personalize -->
            <div class="card-wrap">
                <div class="card-label mono" style="color:{C.amber};">
                    <span class="font-bold">05</span>
                    <span style="color:{C.earth};">personalize</span>
                </div>
                <div class="phone">
                    <div class="notch"></div>
                    <div class="screen-content">
                        <p class="name-heading">What should we<br/>call you?</p>
                        <p class="mono hint">optional — you can skip this</p>
                        <div class="name-input" style="border-color:rgba(200,136,74,0.3);">
                            Alex<span class="cursor"></span>
                        </div>
                        <p class="greeting">Hey, Alex 👋</p>
                    </div>
                    <div class="home-bar"></div>
                </div>
            </div>

        </div>

        <p class="mono mt-4 text-center lg:hidden" style="font-size:10px; color:{C.earthLight};">← scroll to see all steps →</p>
    </div>
</section>

<style>
    .carousel {
        display: flex;
        gap: 20px;
        overflow-x: auto;
        padding-bottom: 16px;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .carousel::-webkit-scrollbar { display: none; }

    .card-wrap {
        flex-shrink: 0;
        width: 200px;
        scroll-snap-align: start;
    }

    .card-label {
        font-size: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
    }

    .phone {
        position: relative;
        background: #F5EFE7;
        border: 1.5px solid rgba(46,42,38,0.18);
        border-radius: 20px;
        padding: 10px 10px 16px;
        box-shadow: 0 8px 24px -8px rgba(46,42,38,0.15);
        min-height: 340px;
    }

    .notch {
        width: 48px; height: 5px;
        background: rgba(46,42,38,0.15);
        border-radius: 3px;
        margin: 0 auto 14px;
    }

    .home-bar {
        position: absolute;
        bottom: 8px; left: 50%;
        transform: translateX(-50%);
        width: 40px; height: 3px;
        background: rgba(46,42,38,0.2);
        border-radius: 2px;
    }

    .screen-content { font-size: 12px; }

    .mono { font-family: 'JetBrains Mono', monospace; }
    .hint { font-size: 10px; color: #8B847D; margin-bottom: 8px; }

    /* Screen 01 */
    .note-input {
        background: rgba(255,255,255,0.7);
        border: 1px solid rgba(200,136,74,0.25);
        border-radius: 6px;
        padding: 10px;
        font-size: 11px;
        color: #2E2A26;
        line-height: 1.6;
        min-height: 80px;
    }
    .tag-row { display: flex; gap: 6px; margin-top: 10px; }
    .chip {
        font-size: 10px;
        padding: 3px 8px;
        border-radius: 3px;
        font-family: 'JetBrains Mono', monospace;
    }

    /* Screen 02 */
    .plan-title { font-size: 12px; font-weight: 700; color: #2E2A26; margin-bottom: 8px; }
    .task-list { display: flex; flex-direction: column; gap: 5px; }
    .task-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: #2E2A26;
    }
    .task-row.done { color: #8B847D; text-decoration: line-through; }
    .step-num {
        width: 16px; height: 16px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 9px;
        flex-shrink: 0;
    }

    /* Screen 03 */
    .time-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }
    .time-block { text-align: center; display: flex; flex-direction: column; gap: 2px; }
    .time-val { font-size: 22px; font-weight: 800; color: #2E2A26; font-family: 'JetBrains Mono', monospace; }
    .time-divider { flex: 1; height: 1px; background: rgba(46,42,38,0.12); margin: 0 12px; }
    .day-chips { display: flex; gap: 4px; justify-content: center; }
    .day-chip {
        width: 24px; height: 24px;
        border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        font-size: 10px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 600;
    }

    /* Screen 04 */
    .app-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .app-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: #2E2A26;
    }
    .os-badge {
        font-size: 10px;
        color: #4D6652;
        font-family: 'JetBrains Mono', monospace;
        background: rgba(77,102,82,0.08);
        padding: 6px 8px;
        border-radius: 4px;
    }

    /* Screen 05 */
    .name-heading { font-size: 15px; font-weight: 800; color: #2E2A26; margin-bottom: 4px; line-height: 1.3; }
    .name-input {
        background: rgba(255,255,255,0.8);
        border: 1px solid;
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 14px;
        color: #2E2A26;
        font-weight: 600;
        margin-bottom: 10px;
    }
    .cursor {
        display: inline-block;
        width: 2px; height: 14px;
        background: #C8884A;
        margin-left: 2px;
        vertical-align: middle;
        animation: blink 1s step-end infinite;
    }
    .greeting { font-size: 13px; color: #2E2A26; font-weight: 700; }

    @keyframes blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
    }
</style>
