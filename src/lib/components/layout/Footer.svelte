<!-- src/lib/components/layout/Footer.svelte -->
<script lang="ts">
	import { theme } from '$lib/stores/theme';

	// Footer links
	const navLinks = [
		{ name: 'Home', url: '/' },
		{ name: 'About', url: '/#about' },
		{ name: 'Work', url: '/#work' },
		{ name: 'Contact', url: '/#contact' },
		{ name: 'Blog', url: '/blog' }
	];

	const socialLinks = [
		{ name: 'GitHub', url: 'https://github.com' },
		{ name: 'LinkedIn', url: 'https://linkedin.com' },
		{ name: 'Twitter', url: 'https://twitter.com' },
		{ name: 'Instagram', url: 'https://instagram.com' }
	];

	const currentYear = new Date().getFullYear();
</script>

<footer
	class="bg-arcadeBlack-200/10 dark:bg-arcadeBlack-700/30 border-t border-arcadeBlack-200/20 dark:border-arcadeBlack-600/40 mt-24"
>
	<div class="container mx-auto px-4 py-12">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<!-- Logo and tagline -->
			<div class="flex flex-col items-center md:items-start">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 mr-2 header-logo-pulse">
						<!-- Logo SVG -->
						<svg
							viewBox="0 0 40 40"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							class="w-full h-full"
						>
							<rect
								width="40"
								height="40"
								rx="4"
								fill={$theme === 'dark' ? '#27FF99' : '#2B2B2B'}
								fill-opacity="0.1"
							/>
							<path
								d="M10 8L30 8L30 32L10 32L10 8Z"
								stroke={$theme === 'dark' ? '#27FF99' : '#2B2B2B'}
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path
								d="M20 16V24"
								stroke={$theme === 'dark' ? '#27FF99' : '#2B2B2B'}
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path
								d="M16 20H24"
								stroke={$theme === 'dark' ? '#27FF99' : '#2B2B2B'}
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</div>
					<span
						class="text-xl md:text-2xl font-header text-arcadeBlack-500 dark:text-arcadeWhite-300 uppercase tracking-wider"
					>
						Jo Pearson
					</span>
				</div>
				<p
					class="text-center md:text-left text-arcadeBlack-500/80 dark:text-arcadeWhite-200/80 mb-4"
				>
					Arcade-inspired web development with a focus on interactive experiences.
				</p>
				<!-- Social links -->
				<div class="flex space-x-3 mt-2">
					{#each socialLinks as link}
						<a
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							class="w-8 h-8 flex items-center justify-center rounded-full
							bg-arcadeBlack-500/10 dark:bg-arcadeBlack-600/30
							text-arcadeBlack-500 dark:text-arcadeWhite-300
							hover:bg-arcadeNeonGreen-500/30 dark:hover:bg-arcadeNeonGreen-500/20
							transition-colors duration-300"
							aria-label={link.name}
						>
							<!-- Simple placeholder icon -->
							<span class="text-xs">{link.name.charAt(0)}</span>
						</a>
					{/each}
				</div>
			</div>

			<!-- Navigation -->
			<div class="text-center md:text-left">
				<h3 class="text-lg font-press-start text-arcadeBlack-500 dark:text-arcadeWhite-200 mb-4">
					Navigate
				</h3>
				<ul class="space-y-2">
					{#each navLinks as link}
						<li>
							<a
								href={link.url}
								class="text-arcadeBlack-500/80 dark:text-arcadeWhite-200/80 hover:text-arcadeNeonGreen-500 dark:hover:text-arcadeNeonGreen-500 transition-colors duration-300"
							>
								{link.name}
							</a>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Newsletter -->
			<div class="text-center md:text-left">
				<h3 class="text-lg font-press-start text-arcadeBlack-500 dark:text-arcadeWhite-200 mb-4">
					Stay Updated
				</h3>
				<p class="text-arcadeBlack-500/80 dark:text-arcadeWhite-200/80 mb-4">
					Subscribe to get notified about new projects and blog posts.
				</p>
				<form class="flex">
					<input
						type="email"
						placeholder="Your email"
						class="flex-1 px-3 py-2 bg-arcadeBlack-200/20 dark:bg-arcadeBlack-600/30
						border border-arcadeBlack-200/40 dark:border-arcadeBlack-600/60
						text-arcadeBlack-500 dark:text-arcadeWhite-300 rounded-l-md focus:outline-none
						focus:border-arcadeNeonGreen-500"
					/>
					<button
						type="submit"
						class="px-4 py-2 bg-arcadeBlack-500 dark:bg-arcadeBlack-700 text-arcadeWhite-200
						rounded-r-md border border-arcadeNeonGreen-500/30 hover:bg-arcadeNeonGreen-500/90
						hover:text-arcadeBlack-500 transition-colors duration-300"
					>
						Subscribe
					</button>
				</form>
			</div>
		</div>

		<!-- Copyright -->
		<div
			class="mt-12 pt-4 border-t border-arcadeBlack-200/20 dark:border-arcadeBlack-600/40 text-center text-arcadeBlack-500/60 dark:text-arcadeWhite-200/60"
		>
			<p>
				© {currentYear} Jo Pearson. All rights reserved.
				<span class="inline-block">
					Made with
					<span class="text-arcadeNeonGreen-500">♥</span>
					and SvelteKit
				</span>
			</p>
			<div class="mt-2 text-xs crt-scanline relative inline-block">
				<div class="px-2 py-1 inline-block relative z-10">PRESS START TO EXPLORE</div>
			</div>
		</div>
	</div>
</footer>

<style>
	.header-logo-pulse {
		animation: headerPulse 3s ease-in-out infinite;
	}

	@keyframes headerPulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	.crt-scanline {
		overflow: hidden;
	}

	.crt-scanline::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 300%;
		height: 100%;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(39, 255, 153, 0.2) 50%,
			transparent 100%
		);
		animation: scanline 2s linear infinite;
	}

	@keyframes scanline {
		0% {
			left: -100%;
		}
		100% {
			left: 100%;
		}
	}
</style>
