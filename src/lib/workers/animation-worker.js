// src/lib/workers/animation-worker.js

// Handle messages from main thread
self.onmessage = function (e) {
	const { type, data } = e.data;

	if (type === 'generateStars') {
		const { count } = data;
		const stars = generateStars(count);

		// Send stars back to main thread
		self.postMessage({
			type: 'starsGenerated',
			data: { stars }
		});
	}
};

// Generate stars efficiently
function generateStars(count) {
	const stars = [];

	for (let i = 0; i < count; i++) {
		// Optimize calculations with bitwise operations where possible
		const size = (Math.random() * 2 + 1) | 0;
		const x = Math.random() * 100;
		const y = Math.random() * 100;
		const opacity = Math.random() * 0.7 + 0.3;
		const z = (Math.random() * 100) | 0;

		stars.push({
			id: `star-${i}`,
			style: `width: ${size}px; height: ${size}px; opacity: ${opacity}; left: ${x}%; top: ${y}%; transform: translateZ(${-z}px);`
		});
	}

	return stars;
}
