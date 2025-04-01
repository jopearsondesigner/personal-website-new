// /public/workers/star-field-worker.js
let stars = [];
let containerWidth = 0;
let containerHeight = 0;
let lastTimestamp = 0;

// Handle messages from main thread
self.onmessage = function (event) {
	const message = event.data;

	switch (message.type) {
		case 'init':
			// Initialize stars and container dimensions
			stars = message.stars;
			containerWidth = message.containerWidth;
			containerHeight = message.containerHeight;
			break;

		case 'animate':
			// Update stars based on timestamp
			updateStars(message.timestamp);

			// Send updated stars back to main thread
			self.postMessage({
				type: 'updateStars',
				stars: stars
			});
			break;

		case 'resize':
			// Update container dimensions
			containerWidth = message.width;
			containerHeight = message.height;
			break;

		case 'updateQuality':
			// Update quality settings
			updateQuality(message.qualityScale);
			break;
	}
};

function updateStars(timestamp) {
	const elapsed = timestamp - lastTimestamp;
	lastTimestamp = timestamp;

	// Update each star
	stars.forEach((star) => {
		// Update z-position (depth)
		star.z -= 0.004;

		// Reset star if it goes too far
		if (star.z <= 0) {
			star.z = 0.8;
			star.x = Math.random() * 100;
			star.y = Math.random() * 100;
		}
	});
}

function updateQuality(qualityScale) {
	const isDesktop = containerWidth >= 1024;
	const sizeMultiplier = isDesktop ? 2.0 : 1.5;

	// Update star sizes based on quality
	stars.forEach((star) => {
		star.size = Math.max(star.z * sizeMultiplier * qualityScale, isDesktop ? 2 : 1);
	});
}
