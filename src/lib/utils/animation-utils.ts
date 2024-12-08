interface Star {
	x: number;
	y: number;
	z: number;
	opacity: number;
	style: string;
}

export const animations = {
	createGlitchEffect(element: HTMLElement | null) {
		if (!element || Math.random() >= 0.1) return;

		element.style.textShadow = `
		${Math.random() * 10 - 5}px ${Math.random() * 10 - 5}px ${Math.random() * 20}px rgba(39,255,153,0.8),
		${Math.random() * 10 - 5}px ${Math.random() * 10 - 5}px ${Math.random() * 20}px rgba(0,230,112,0.8)
	  `;

		setTimeout(() => {
			if (element) element.style.textShadow = '';
		}, 50);
	},

	initStars(count = 300): Star[] {
		return Array.from({ length: count }, () => ({
			x: Math.random() * 100,
			y: Math.random() * 100,
			z: Math.random() * 0.7 + 0.1,
			opacity: Math.random() * 0.5 + 0.5,
			style: ''
		}));
	},

	updateStars(stars: Star[]): Star[] {
		return stars.map((star) => {
			// Increase speed slightly
			const newZ = star.z - 0.004;
			const finalZ = newZ <= 0 ? 0.8 : newZ;
			const newX = newZ <= 0 ? Math.random() * 100 : star.x;
			const newY = newZ <= 0 ? Math.random() * 100 : star.y;

			// Adjust scale and visibility parameters
			const scale = 0.2 / finalZ; // Increased base scale
			const x = (newX - 50) * scale + 50;
			const y = (newY - 50) * scale + 50;
			const size = Math.max(scale * 1.5, 1); // Ensure minimum size
			const opacity = Math.min(1, star.opacity * (scale * 3));

			return {
				x: newX,
				y: newY,
				z: finalZ,
				opacity: star.opacity,
				style: `left: ${x}%; top: ${y}%; width: ${size}px; height: ${size}px; opacity: ${opacity}; transform: translateZ(${finalZ * 100}px);`
			};
		});
	}
};
