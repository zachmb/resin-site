/**
 * scrollLock — a Svelte action that freezes background page scroll while an overlay
 * (modal / sheet / command palette) is open, then restores it exactly. Every Resin
 * overlay is a hand-rolled `fixed inset-0` with NO scroll-lock, so the page behind
 * scrolls under them (visible bleed, especially on mobile). Add `use:scrollLock={isOpen}`
 * to any overlay's root to fix it consistently.
 *
 * It compensates for the scrollbar width (padding-right) so locking doesn't cause a
 * horizontal layout shift, and it reference-counts across concurrently-open overlays
 * so the first-open sets the lock and the last-close restores it (no premature unlock
 * when two overlays overlap).
 */

let _locks = 0;
let _prevOverflow = '';
let _prevPaddingRight = '';

function engage() {
	if (typeof document === 'undefined') return;
	if (_locks === 0) {
		const body = document.body;
		_prevOverflow = body.style.overflow;
		_prevPaddingRight = body.style.paddingRight;
		// Reserve the gap the scrollbar leaves so content doesn't jump.
		const sbw = window.innerWidth - document.documentElement.clientWidth;
		if (sbw > 0) body.style.paddingRight = `${sbw}px`;
		body.style.overflow = 'hidden';
	}
	_locks += 1;
}

function release() {
	if (typeof document === 'undefined') return;
	_locks = Math.max(0, _locks - 1);
	if (_locks === 0) {
		document.body.style.overflow = _prevOverflow;
		document.body.style.paddingRight = _prevPaddingRight;
	}
}

export function scrollLock(_node: HTMLElement, enabled: boolean = true) {
	let active = false;
	const sync = (on: boolean) => {
		if (on && !active) { engage(); active = true; }
		else if (!on && active) { release(); active = false; }
	};
	sync(enabled);
	return {
		update(next: boolean) { sync(next); },
		destroy() { sync(false); },
	};
}
