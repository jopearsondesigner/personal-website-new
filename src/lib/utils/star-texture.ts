// src/lib/utils/star-texture.ts
// Denser tiles + occasional 2x2 bright pixels for visibility.

export function makeStarDataURIs() {
	const make = (seed: number, density = 0.26, bigPct = 0.12) => {
		const c = document.createElement('canvas');
		c.width = 16;
		c.height = 16;
		const ctx = c.getContext('2d', { alpha: true })!;
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, 16, 16);

		let s = seed >>> 0;
		const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff;

		const count = Math.floor(16 * 16 * density);
		for (let i = 0; i < count; i++) {
			const x = (rnd() * 16) | 0;
			const y = (rnd() * 16) | 0;
			const bright = 195 + ((rnd() * 60) | 0); // 195..255 (brighter)
			ctx.fillStyle = `rgb(${bright},${bright},${bright})`;

			if (rnd() < bigPct && x < 15 && y < 15) {
				// 2x2 “big star” cluster
				ctx.fillRect(x, y, 2, 2);
			} else {
				ctx.fillRect(x, y, 1, 1);
			}

			// occasional pure white speckle
			if (rnd() < 0.14) {
				ctx.fillStyle = `rgb(255,255,255)`;
				ctx.fillRect(x, y, 1, 1);
			}
		}
		return c.toDataURL('image/png');
	};

	return {
		star1: make(0xa1b2c3d4, 0.3, 0.16), // denser & a touch more big pixels
		star2: make(0xc0ffee12, 0.18, 0.1) // sparser layer still brighter than before
	};
}
