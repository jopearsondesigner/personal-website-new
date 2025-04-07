// File: /src/lib/workers/star-field-worker.ts
// Create this new file

// Type definitions
interface Star {
	x: number;
	y: number;
	z: number;
	size: number;
	opacity: number;
}

// Listen for messages from the main thread
self.onmessage = (event) => {
	const { type, data } = event.data;

	if (type === 'updateStars') {
		const { stars, isDesktop } = data;
		const updatedStars = updateStarPositions(stars, isDesktop);
		self.postMessage({ type: 'starsUpdated', data: updatedStars });
	}
};

// Function to update star positions (moved from main thread)
function updateStarPositions(stars: Star[], isDesktop: boolean) {
	return stars.map((star) => {
		// Create a copy of the star to avoid mutation issues
		const updatedStar = { ...star };

		// Update z-position (depth)
		updatedStar.z -= 0.004;

		// Reset star if it goes too far
		if (updatedStar.z <= 0) {
			updatedStar.z = 0.8;
			updatedStar.x = Math.random() * 100;
			updatedStar.y = Math.random() * 100;
		}

		// Calculate size and opacity
		const sizeMultiplier = isDesktop ? 2.0 : 1.5;
		updatedStar.size = Math.max(updatedStar.z * sizeMultiplier, isDesktop ? 2 : 1);
		updatedStar.opacity = Math.min(1, (Math.random() * 0.5 + 0.5) * (updatedStar.z * 3));

		return updatedStar;
	});
}
