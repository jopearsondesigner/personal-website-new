// src/lib/utils/throttled-raf.ts
export function createThrottledRAF(callback: () => void): () => void {
	let ticking = false;
	return () => {
		if (!ticking) {
			ticking = true;
			requestAnimationFrame(() => {
				callback();
				ticking = false;
			});
		}
	};
}
