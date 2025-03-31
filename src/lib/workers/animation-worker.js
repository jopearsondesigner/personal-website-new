// Optimize worker communication and processing
let stars = [];
let isAnimating = false;
let updateInterval = 50;
let lastUpdateTime = 0;
let quadrantSize = 4;
let isDesktopView = false;

// Optimize star structure for more efficient serialization
const starStructureVersion = 1; // For future compatibility

// Handle messages from main thread with optimized communication
self.onmessage = function (e) {
	const { type, data } = e.data;

	switch (type) {
		case 'generateStars':
			const { count, quadrantSize: size, isDesktop, updateInterval: interval } = data;
			quadrantSize = size || 4;
			isDesktopView = isDesktop || false;
			if (interval) updateInterval = interval;

			stars = generateOptimizedStars(count, isDesktopView);

			// Send stars back to main thread with optimized structure
			self.postMessage({
				type: 'starsGenerated',
				data: {
					stars,
					version: starStructureVersion
				}
			});
			break;

		case 'startAnimation':
			updateInterval = data.updateInterval || 50;
			isDesktopView = data.isDesktop || false;
			if (!isAnimating) {
				isAnimating = true;
				lastUpdateTime = Date.now();
				animateStarsEfficiently();
			}
			break;

		case 'stopAnimation':
			isAnimating = false;
			break;

		case 'updateVisibleQuadrants':
			// Update which quadrants are currently visible
			updateVisibleQuadrants(data.visibleQuadrants);
			break;

		case 'setDeviceType':
			// Update the device type
			isDesktopView = data.isDesktop || false;
			break;
	}
};

// Generate stars with optimized structure for serialization
function generateOptimizedStars(count, isDesktop = false) {
	const generatedStars = [];

	// Use different star generation parameters for desktop vs mobile
	const zBase = isDesktop ? 0.05 : 0.1;
	const zRange = isDesktop ? 0.6 : 0.7;
	const sizeMultiplier = isDesktop ? 2.0 : 1.5;

	for (let i = 0; i < count; i++) {
		const x = Math.random() * 100;
		const y = Math.random() * 100;
		const z = Math.random() * zRange + zBase;
		const size = Math.max(z * sizeMultiplier, isDesktop ? 2 : 1);
		const opacity = Math.min(1, (Math.random() * 0.5 + 0.5) * (z * 3));

		// Calculate quadrant with efficient math
		const quadX = Math.floor((x / 100) * quadrantSize);
		const quadY = Math.floor((y / 100) * quadrantSize);
		const quadrant = quadY * quadrantSize + quadX;

		generatedStars.push({
			id: `star-${i}`,
			x,
			y,
			z,
			size,
			opacity,
			quadrant,
			isDesktop, // Required for proper updates
			style: generateOptimizedStarStyle(x, y, z, size, opacity)
		});
	}

	return generatedStars;
}

// Generate more efficient style string
function generateOptimizedStarStyle(x, y, z, size, opacity) {
	// Combine all CSS properties in one string to avoid multiple concatenations
	return `width:${size}px;height:${size}px;opacity:${opacity};left:${x}%;top:${y}%;transform:translateZ(${-z * 100}px)`;
}

// More efficient animation loop with batched updates
function animateStarsEfficiently() {
	if (!isAnimating) return;

	const now = Date.now();
	const elapsed = now - lastUpdateTime;

	if (elapsed >= updateInterval) {
		lastUpdateTime = now;

		// Process stars in batches for better performance
		for (let i = 0; i < stars.length; i++) {
			updateStarEfficiently(stars[i]);
		}

		// Send updated stars back to main thread
		self.postMessage({
			type: 'starsUpdated',
			data: {
				stars,
				version: starStructureVersion,
				timestamp: now
			}
		});
	}

	// Using setTimeout instead of requestAnimationFrame in workers
	// But with dynamic timing to better match the desired interval
	const nextInterval = Math.max(1, updateInterval - (Date.now() - now));
	setTimeout(animateStarsEfficiently, nextInterval);
}

// More efficient star update with fewer calculations
function updateStarEfficiently(star) {
	// Adjust speed for desktop vs mobile
	const zSpeed = star.isDesktop ? 0.003 : 0.004;

	// Update z-position (depth)
	star.z -= zSpeed;

	// Reset star if it goes too far
	if (star.z <= 0) {
		star.z = star.isDesktop ? 0.65 : 0.8;
		star.x = Math.random() * 100;
		star.y = Math.random() * 100;

		// Recalculate quadrant
		const quadX = Math.floor((star.x / 100) * quadrantSize);
		const quadY = Math.floor((y / 100) * quadrantSize);
		star.quadrant = quadY * quadrantSize + quadX;
	}

	// Calculate visual properties with fewer operations
	const scaleBase = star.isDesktop ? 0.15 : 0.2;
	const scale = scaleBase / star.z;

	// Calculate x,y with fewer operations
	const x = (star.x - 50) * scale + 50;
	const y = (star.y - 50) * scale + 50;

	// Calculate size and opacity with fewer operations
	const sizeMultiplier = star.isDesktop ? 2.0 : 1.5;
	const size = Math.max(scale * sizeMultiplier, star.isDesktop ? 2 : 1);
	const opacity = Math.min(1, star.opacity * (scale * 3));

	// Update style string directly
	star.style = generateOptimizedStarStyle(x, y, star.z, size, opacity);
}

// Efficient visible quadrants tracking
let visibleQuadrants = new Set();

function updateVisibleQuadrants(quadrants) {
	visibleQuadrants = new Set(quadrants);
}
