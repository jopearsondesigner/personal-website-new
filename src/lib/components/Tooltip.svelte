<!-- src/lib/components/Tooltip.svelte -->
<script lang="ts">
	export let text: string;
	export let position: 'top' | 'bottom' | 'left' | 'right' = 'top';

	const positionClasses = {
		top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
		bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
		left: 'right-full top-1/2 -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 -translate-y-1/2 ml-2'
	};

	const arrowClasses = {
		top: 'bottom-[-8px] left-1/2 -translate-x-1/2 border-t-arcadeBlack-700 dark:border-t-arcadeWhite-200 border-x-transparent border-b-transparent',
		bottom:
			'top-[-8px] left-1/2 -translate-x-1/2 border-b-arcadeBlack-700 dark:border-b-arcadeWhite-200 border-x-transparent border-t-transparent',
		left: 'right-[-8px] top-1/2 -translate-y-1/2 border-l-arcadeBlack-700 dark:border-l-arcadeWhite-200 border-y-transparent border-r-transparent',
		right:
			'left-[-8px] top-1/2 -translate-y-1/2 border-r-arcadeBlack-700 dark:border-r-arcadeWhite-200 border-y-transparent border-l-transparent'
	};
</script>

<div class="group relative inline-block">
	<slot />
	<div
		class="absolute pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 z-[9999] {positionClasses[
			position
		]}"
	>
		<div class="relative">
			<div
				class="bg-arcadeBlack-700 dark:bg-arcadeWhite-200 text-arcadeWhite-200 dark:text-arcadeBlack-700 px-2 py-1 rounded text-xs font-light tracking-wide whitespace-nowrap shadow-lg backdrop-blur-sm bg-opacity-95"
			>
				{text}
			</div>
			<div class="absolute w-0 h-0 border-[6px] {arrowClasses[position]}" />
		</div>
	</div>
</div>

<style>
	div {
		margin: 0;
		padding: 0;
	}
</style>
