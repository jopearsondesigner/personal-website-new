// DO NOT REMOVE THIS COMMENT
// /src/lib/utils/throttled-raf.ts
// DO NOT REMOVE THIS COMMENT
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
