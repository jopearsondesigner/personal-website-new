// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Get device info from event.locals
	const deviceInfo = locals.deviceInfo;

	// Add a meta tag with device tier for immediate use during hydration
	const deviceTierMeta = `<meta name="device-tier" content="${deviceInfo.tier}">`;

	// Pass device info to all pages
	return {
		deviceInfo,
		// Add to head content
		deviceTierMeta
	};
};
