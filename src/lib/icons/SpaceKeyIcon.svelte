<!-- src/lib/icons/SpaceKeyIcon.svelte -->
<script lang="ts">
	export let size = 24;
	export let color = 'currentColor';
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	class="instruction-icon"
>
	<!-- Improved Spacebar Key Background with better contrast - wider than regular keys -->
	<rect
		x="1"
		y="6"
		width="22"
		height="12"
		rx="3"
		fill="rgba(0, 0, 0, 0.6)"
		stroke={color}
		stroke-width="1.5"
	/>

	<!-- Highlight effect for 3D button appearance -->
	<path
		d="M1 9C1 7.34315 2.34315 6 4 6H20C21.6569 6 23 7.34315 23 9V9.5H1V9Z"
		fill="rgba(255, 255, 255, 0.15)"
	/>

	<!-- Shadow effect for 3D button appearance -->
	<path
		d="M1 15.5V15C1 16.6569 2.34315 18 4 18H20C21.6569 18 23 16.6569 23 15V15.5H1Z"
		fill="rgba(0, 0, 0, 0.3)"
	/>

	<!-- Spacebar line - thicker and more visible -->
	<line x1="6" y1="12" x2="18" y2="12" stroke={color} stroke-width="2.5" stroke-linecap="round" />
</svg>
