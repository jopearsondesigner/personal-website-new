// src/lib/workers/animation-worker.js

// Star array and animation state
let stars = [];
let isAnimating = false;
let updateInterval = 50;
let lastUpdateTime = 0;
let quadrantSize = 4;
let isDesktopView = false;

// Handle messages from main thread
self.onmessage = function (e) {
	const { type, data } = e.data;

	switch (type) {
		case 'generateStars':
			const { count, quadrantSize: size, isDesktop, updateInterval: interval } = data;
			quadrantSize = size || 4;
			isDesktopView = isDesktop || false;
			if (interval) updateInterval = interval;

			stars = generateStars(count, isDesktopView);

			// Send stars back to main thread
			self.postMessage({
				type: 'starsGenerated',
				data: { stars }
			});
			break;

		case 'startAnimation':
			updateInterval = data.updateInterval || 50;
			isDesktopView = data.isDesktop || false; // Update desktop flag if provided
			if (!isAnimating) {
				isAnimating = true;
				lastUpdateTime = Date.now();
				animateStars();
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

// Generate stars efficiently with device-specific parameters
function generateStars(count, isDesktop = false) {
	const generatedStars = [];

	// Use different star generation parameters for desktop vs mobile
	const zBase = isDesktop ? 0.05 : 0.1; // Start closer on desktop
	const zRange = isDesktop ? 0.6 : 0.7; // More depth range on desktop
	const sizeMultiplier = isDesktop ? 2.0 : 1.5; // Larger stars on desktop

	for (let i = 0; i < count; i++) {
		const x = Math.random() * 100;
		const y = Math.random() * 100;
		const z = Math.random() * zRange + zBase;
		const size = Math.max(z * sizeMultiplier, isDesktop ? 2 : 1); // Larger minimum size on desktop (2px vs 1px)
		const opacity = Math.min(1, (Math.random() * 0.5 + 0.5) * (z * 3));

		// Calculate which quadrant this star belongs to
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
			isDesktop, // Store whether this is for desktop view
			style: generateStarStyle(x, y, z, size, opacity)
		});
	}

	return generatedStars;
}

// Generate style string for a star
function generateStarStyle(x, y, z, size, opacity) {
	return `width: ${size}px; height: ${size}px; opacity: ${opacity}; left: ${x}%; top: ${y}%; transform: translateZ(${-z * 100}px);`;
}

// Animation loop with efficient batching
function animateStars() {
	if (!isAnimating) return;

	const now = Date.now();
	const elapsed = now - lastUpdateTime;

	if (elapsed >= updateInterval) {
		lastUpdateTime = now;

		// Update all star positions
		stars.forEach(updateStar);

		// Send updated stars back to main thread
		self.postMessage({
			type: 'starsUpdated',
			data: { stars }
		});
	}

	// Using setTimeout instead of requestAnimationFrame in workers
	setTimeout(animateStars, Math.max(1, updateInterval / 2));
}

// Update a single star's position with device-specific speeds
function updateStar(star) {
	// Adjust speed for desktop vs mobile
	const zSpeed = star.isDesktop ? 0.003 : 0.004; // Slower movement on desktop

	// Update z-position (depth)
	star.z -= zSpeed;

	// Reset star if it goes too far
	if (star.z <= 0) {
		star.z = star.isDesktop ? 0.65 : 0.8; // Different reset depth for desktop
		star.x = Math.random() * 100;
		star.y = Math.random() * 100;

		// Recalculate quadrant
		const quadX = Math.floor((star.x / 100) * quadrantSize);
		const quadY = Math.floor((star.y / 100) * quadrantSize);
		star.quadrant = quadY * quadrantSize + quadX;
	}

	// Calculate visual properties - adjust scale formula for desktop
	const scaleBase = star.isDesktop ? 0.15 : 0.2; // Less extreme scaling on desktop
	const scale = scaleBase / star.z;

	// Adjusted center point - use 50% as the vanishing point
	const x = (star.x - 50) * scale + 50;
	const y = (star.y - 50) * scale + 50;

	// Use larger size multiplier for desktop
	const sizeMultiplier = star.isDesktop ? 2.0 : 1.5;
	const size = Math.max(scale * sizeMultiplier, star.isDesktop ? 2 : 1); // Bigger minimum size for desktop
	const opacity = Math.min(1, star.opacity * (scale * 3));

	// Update style string
	star.style = generateStarStyle(x, y, star.z, size, opacity);
}

// Keep track of which quadrants are visible
let visibleQuadrants = new Set();

function updateVisibleQuadrants(quadrants) {
	visibleQuadrants = new Set(quadrants);
}

// Utility to group stars by quadrant
function getStarsByQuadrant() {
	const quadrants = {};

	stars.forEach((star) => {
		if (!quadrants[star.quadrant]) {
			quadrants[star.quadrant] = [];
		}
		quadrants[star.quadrant].push(star);
	});

	return quadrants;
}
