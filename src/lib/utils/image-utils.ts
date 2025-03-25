// src/lib/utils/image-utils.ts
export const loadImage = (src) => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
};

export const preloadCriticalImages = async () => {
	if (!browser) return;

	const criticalImages = [
		'/images/logo.svg'
		// Add other critical images
	];

	try {
		await Promise.all(criticalImages.map(loadImage));
	} catch (error) {
		console.error('Failed to preload images:', error);
	}
};
