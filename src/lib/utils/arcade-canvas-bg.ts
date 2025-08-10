// src/lib/utils/arcade-canvas-bg.ts
// Brighter points; keeps integer math and zero per-frame allocations.

type FrameController = {
	shouldRenderFrame: () => boolean;
	subscribeQuality: (fn: (q: number) => void) => () => void;
	setTargetFPS: (fps: number) => void;
	setMaxSkippedFrames: (n: number) => void;
	setAdaptiveEnabled: (on: boolean) => void;
};

export function startCanvasBackground(opts: {
	canvas: HTMLCanvasElement;
	frameController: FrameController;
	qualityHint?: number;
}) {
	const { canvas, frameController, qualityHint = 1.0 } = opts;
	const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
	const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })!;

	function resize() {
		const r = canvas.getBoundingClientRect();
		canvas.width = Math.max(1, Math.round(r.width * dpr));
		canvas.height = Math.max(1, Math.round(r.height * dpr));
	}
	resize();

	const baseCount = ((canvas.width * canvas.height) / (1280 * 720)) * 120;
	const poolSize = Math.floor(baseCount) + 110;

	const xs = new Int16Array(poolSize);
	const ys = new Int16Array(poolSize);
	const vx = new Int8Array(poolSize);
	const vy = new Int8Array(poolSize);
	const col = new Uint8ClampedArray(poolSize); // brightness 180..255 (brighter)

	let s = 0x1234abcd >>> 0;
	const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff;

	const W = () => canvas.width,
		H = () => canvas.height;
	for (let i = 0; i < poolSize; i++) {
		xs[i] = (rnd() * W()) | 0;
		ys[i] = (rnd() * H()) | 0;
		vx[i] = (rnd() * 2) | 0 ? 1 : -1;
		vy[i] = (rnd() * 2) | 0 ? 0 : 1;
		col[i] = 180 + ((rnd() * 75) | 0); // 180..255
	}

	let rafId = 0;

	const ro = new ResizeObserver(() => {
		const rect = canvas.getBoundingClientRect();
		const newW = Math.max(1, Math.round(rect.width * dpr));
		const newH = Math.max(1, Math.round(rect.height * dpr));
		if (newW !== canvas.width || newH !== canvas.height) {
			const oldW = canvas.width,
				oldH = canvas.height;
			canvas.width = newW;
			canvas.height = newH;
			for (let i = 0; i < poolSize; i++) {
				xs[i] = Math.round(xs[i] * (newW / oldW)) | 0;
				ys[i] = Math.round(ys[i] * (newH / oldH)) | 0;
			}
		}
	});
	ro.observe(canvas);

	function step() {
		if (!frameController.shouldRenderFrame()) {
			rafId = requestAnimationFrame(step);
			return;
		}

		ctx.clearRect(0, 0, W(), H());

		const w = W(),
			h = H();

		for (let i = 0; i < poolSize; i++) {
			let x = xs[i] + vx[i];
			let y = ys[i] + vy[i];
			if (x < 0) x = w - 1;
			else if (x >= w) x = 0;
			if (y < 0) y = h - 1;
			else if (y >= h) y = 0;
			xs[i] = x;
			ys[i] = y;

			// Slightly brighter mapping; scale with qualityHint
			// alpha ≈ 0.28..1.0; multiplied by quality
			const a = Math.min(1, ((col[i] - 150) / 90) * qualityHint);
			ctx.globalAlpha = a;

			// Draw 1x1; every so often draw 2x2 for “big” star
			if ((i & 31) === 0) ctx.fillRect(x, y, 2, 2);
			else ctx.fillRect(x, y, 1, 1);
		}
		ctx.globalAlpha = 1;

		rafId = requestAnimationFrame(step);
	}

	// Pre-fill style once
	ctx.fillStyle = '#fff';
	rafId = requestAnimationFrame(step);

	const onVis = () => {
		// frame controller toggled by component; no-op here
	};
	document.addEventListener('visibilitychange', onVis, { passive: true });

	return {
		stop() {
			cancelAnimationFrame(rafId);
			document.removeEventListener('visibilitychange', onVis);
			ro.disconnect();
		}
	};
}
