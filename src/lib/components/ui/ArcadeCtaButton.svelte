<!-- src/lib/components/ui/ArcadeCtaButton.svelte -->
<script lang="ts">
	// Fixed-size container = max sprite size, so no layout shift on hover.
	export let buttonSize: number = 0.45;
	let isHovered = false;

	// Intrinsic sprite sizes
	const DEFAULT_W = 301;
	const DEFAULT_H = 96;
	const HOVER_W = 349;
	const HOVER_H = 144;

	// Fixed container uses the larger (hover) sprite box
	const MAX_W = Math.max(DEFAULT_W, HOVER_W);
	const MAX_H = Math.max(DEFAULT_H, HOVER_H);

	// Container dims (lock layout)
	$: containerW = MAX_W * buttonSize;
	$: containerH = MAX_H * buttonSize;

	// Each sprite draws at its own intrinsic size, centered in the fixed box
	$: defaultW = DEFAULT_W * buttonSize;
	$: defaultH = DEFAULT_H * buttonSize;
	$: hoverW = HOVER_W * buttonSize;
	$: hoverH = HOVER_H * buttonSize;

	function onEnter() {
		isHovered = true;
	}
	function onLeave() {
		isHovered = false;
	}
	function onKey(e: KeyboardEvent) {
		// Keyboard "press" feedback
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			isHovered = true;
			setTimeout(() => (isHovered = false), 160);
		}
	}
</script>

<button
	type="button"
	aria-label="Hire me"
	class="cta"
	style="--w:{containerW}px; --h:{containerH}px;"
	data-hovered={isHovered}
	on:pointerenter={onEnter}
	on:pointerleave={onLeave}
	on:focus={onEnter}
	on:blur={onLeave}
	on:keydown={onKey}
>
	<!-- GLOW LAYER (outside the sprites; subtle neon rim that pulses) -->
	<span class="neon" aria-hidden="true"></span>

	<!-- DEFAULT sprite layer (centered inside fixed container) -->
	<span class="sprite-layer sprite-default" style="--sw:{defaultW}px; --sh:{defaultH}px;">
		<!-- DEFAULT: ArcadeCtaButton default (transparent background) -->
		<svg
			width="100%"
			height="100%"
			viewBox="0 0 301 96"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				opacity="0.33"
				d="M277 16H285V24H293V72H285V80H277V88H24V80H16V72H8V24H16V16H24V8H277V16Z"
				fill="url(#paint0_linear_2003_1192)"
			/>
			<g filter="url(#filter0_d_2003_1192)">
				<path
					d="M50 60.5V36H57V46.5H67.5V36H74.5V60.5H67.5V50H57V60.5H50ZM82.9 60.5V57H89.9V39.5H82.9V36H103.9V39.5H96.9V57H103.9V60.5H82.9ZM108.8 60.5V36H129.8V39.5H133.3V50H126.3V53.5H129.8V57H133.3V60.5H122.8V57H119.3V53.5H115.8V60.5H108.8ZM115.8 50H122.8V46.5H126.3V39.5H115.8V50ZM138.2 60.5V36H162.7V39.5H145.2V46.5H159.2V50H145.2V57H162.7V60.5H138.2ZM197 60.5V36H204V39.5H207.5V43H211V39.5H214.5V36H221.5V60.5H214.5V46.5H211V53.5H207.5V46.5H204V60.5H197ZM226.4 60.5V36H250.9V39.5H233.4V46.5H247.4V50H233.4V57H250.9V60.5H226.4Z"
					fill="#27FF99"
				/>
			</g>
			<rect x="16" y="80" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.4" x="8" y="80" width="8" height="8" fill="#27FF99" />
			<rect x="8" y="72" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.3" y="72" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.7" y="64" width="8" height="8" fill="#27FF99" />
			<rect y="56" width="8" height="8" fill="#27FF99" />
			<rect y="48" width="8" height="8" fill="#27FF99" />
			<rect y="40" width="8" height="8" fill="#27FF99" />
			<rect y="32" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.7" y="24" width="8" height="8" fill="#27FF99" />
			<rect x="8" y="16" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.3" y="16" width="8" height="8" fill="#27FF99" />
			<rect x="16" y="8" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.4" x="8" y="8" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.7" x="24" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.3" x="16" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.7" x="24" y="88" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.3" x="16" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="72" width="8" height="8" fill="#27FF99" />
			<rect x="80" width="8" height="8" fill="#27FF99" />
			<rect x="88" width="8" height="8" fill="#27FF99" />
			<rect x="96" width="8" height="8" fill="#27FF99" />
			<rect x="104" width="8" height="8" fill="#27FF99" />
			<rect x="112" width="8" height="8" fill="#27FF99" />
			<rect x="120" width="8" height="8" fill="#27FF99" />
			<rect x="128" width="8" height="8" fill="#27FF99" />
			<rect x="136" width="8" height="8" fill="#27FF99" />
			<rect x="144" width="8" height="8" fill="#27FF99" />
			<rect x="152" width="8" height="8" fill="#27FF99" />
			<rect x="160" width="8" height="8" fill="#27FF99" />
			<rect x="168" width="8" height="8" fill="#27FF99" />
			<rect x="176" width="8" height="8" fill="#27FF99" />
			<rect x="184" width="8" height="8" fill="#27FF99" />
			<rect x="192" width="8" height="8" fill="#27FF99" />
			<rect x="200" width="8" height="8" fill="#27FF99" />
			<rect x="208" width="8" height="8" fill="#27FF99" />
			<rect x="216" width="8" height="8" fill="#27FF99" />
			<rect x="224" width="8" height="8" fill="#27FF99" />
			<rect x="232" width="8" height="8" fill="#27FF99" />
			<rect x="240" width="8" height="8" fill="#27FF99" />
			<rect x="248" width="8" height="8" fill="#27FF99" />
			<rect x="256" width="8" height="8" fill="#27FF99" />
			<rect x="264" width="5" height="8" fill="#27FF99" />
			<rect x="32" width="8" height="8" fill="#27FF99" />
			<rect x="40" width="8" height="8" fill="#27FF99" />
			<rect x="48" width="8" height="8" fill="#27FF99" />
			<rect x="56" width="8" height="8" fill="#27FF99" />
			<rect x="64" width="8" height="8" fill="#27FF99" />
			<rect x="72" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="80" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="88" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="96" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="104" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="112" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="120" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="128" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="136" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="144" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="152" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="160" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="168" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="176" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="184" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="192" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="200" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="208" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="216" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="224" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="232" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="240" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="248" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="256" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="264" y="88" width="5" height="8" fill="#27FF99" />
			<rect opacity="0.7" x="269" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="32" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="40" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="48" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="56" y="88" width="8" height="8" fill="#27FF99" />
			<rect x="64" y="88" width="8" height="8" fill="#27FF99" />
			<rect width="8" height="8" transform="matrix(-1 0 0 1 285 80)" fill="#27FF99" />
			<rect opacity="0.4" width="8" height="8" transform="matrix(-1 0 0 1 293 80)" fill="#27FF99" />
			<rect width="8" height="8" transform="matrix(-1 0 0 1 293 72)" fill="#27FF99" />
			<rect opacity="0.3" width="8" height="8" transform="matrix(-1 0 0 1 301 72)" fill="#27FF99" />
			<rect opacity="0.3" width="8" height="8" transform="matrix(-1 0 0 1 285 88)" fill="#27FF99" />
			<line x1="277" y1="80.5" x2="285" y2="80.5" stroke="white" />
			<line x1="285" y1="72.5" x2="293" y2="72.5" stroke="white" />
			<rect width="8" height="8" transform="matrix(0 -1 -1 0 285 16)" fill="#27FF99" />
			<rect
				opacity="0.4"
				width="8"
				height="8"
				transform="matrix(0 -1 -1 0 293 16)"
				fill="#27FF99"
			/>
			<rect width="8" height="8" transform="matrix(0 -1 -1 0 293 24)" fill="#27FF99" />
			<rect opacity="0.3" x="277" y="8" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.3" x="277" y="8" width="8" height="8" fill="#27FF99" />
			<line x1="277" y1="8.5" x2="285" y2="8.5" stroke="white" />
			<rect
				opacity="0.3"
				width="8"
				height="8"
				transform="matrix(0 -1 -1 0 301 24)"
				fill="#27FF99"
			/>
			<rect opacity="0.3" width="8" height="8" transform="matrix(0 -1 -1 0 285 8)" fill="#27FF99" />
			<line x1="285" y1="16.5" x2="293" y2="16.5" stroke="white" />
			<rect opacity="0.7" x="269" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.7" x="293" y="64" width="8" height="8" fill="#27FF99" />
			<rect x="293" y="56" width="8" height="8" fill="#27FF99" />
			<rect opacity="0.7" x="293" y="24" width="8" height="8" fill="#27FF99" />
			<rect x="293" y="32" width="8" height="8" fill="#27FF99" />
			<rect x="293" y="40" width="8" height="8" fill="#27FF99" />
			<rect x="293" y="48" width="8" height="8" fill="#27FF99" />
			<line x1="8" y1="72.5" x2="16" y2="72.5" stroke="white" />
			<line x1="16" y1="80.5" x2="24" y2="80.5" stroke="white" />
			<line x1="8" y1="16.5" x2="16" y2="16.5" stroke="white" />
			<line opacity="0.7" y1="24.5" x2="8" y2="24.5" stroke="white" />
			<line x1="16" y1="8.5" x2="24" y2="8.5" stroke="white" />
			<line x1="32" y1="0.5" x2="269" y2="0.5" stroke="white" />
			<line x1="32" y1="88.5" x2="269" y2="88.5" stroke="white" />
			<line opacity="0.7" x1="293" y1="24.5" x2="301" y2="24.5" stroke="white" />
			<defs>
				<filter
					id="filter0_d_2003_1192"
					x="50"
					y="35"
					width="200.9"
					height="25.5"
					filterUnits="userSpaceOnUse"
					color-interpolation-filters="sRGB"
				>
					<feFlood flood-opacity="0" result="BackgroundImageFix" />
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset dy="-1" />
					<feComposite in2="hardAlpha" operator="out" />
					<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
					<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_2003_1192" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="effect1_dropShadow_2003_1192"
						result="shape"
					/>
				</filter>
				<linearGradient
					id="paint0_linear_2003_1192"
					x1="8"
					y1="48"
					x2="293"
					y2="48"
					gradientUnits="userSpaceOnUse"
				>
					<stop stop-color="#2B2B2B" />
					<stop offset="0.485" stop-color="#2B2B2B" />
					<stop offset="1" stop-color="#555555" />
				</linearGradient>
			</defs>
		</svg>
	</span>

	<!-- HOVER sprite layer -->
	<span class="sprite-layer sprite-hover" style="--sw:{hoverW}px; --sh:{hoverH}px;">
		<!-- HOVER: ArcadeCtaButtonHover (glow baked into art) -->
		<svg
			width="100%"
			height="100%"
			viewBox="0 0 349 144"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<g clip-path="url(#clip0_2003_1340)">
				<path
					opacity="0.33"
					d="M301 40H309V48H317V96H309V104H301V112H48V104H40V96H32V48H40V40H48V32H301V40Z"
					fill="url(#paint0_linear_2003_1340)"
				/>
				<g filter="url(#filter0_d_2003_1340)">
					<path
						d="M74 84.5V60H81V70.5H91.5V60H98.5V84.5H91.5V74H81V84.5H74ZM106.9 84.5V81H113.9V63.5H106.9V60H127.9V63.5H120.9V81H127.9V84.5H106.9ZM132.8 84.5V60H153.8V63.5H157.3V74H150.3V77.5H153.8V81H157.3V84.5H146.8V81H143.3V77.5H139.8V84.5H132.8ZM139.8 74H146.8V70.5H150.3V63.5H139.8V74ZM162.2 84.5V60H186.7V63.5H169.2V70.5H183.2V74H169.2V81H186.7V84.5H162.2ZM221 84.5V60H228V63.5H231.5V67H235V63.5H238.5V60H245.5V84.5H238.5V70.5H235V77.5H231.5V70.5H228V84.5H221ZM250.4 84.5V60H274.9V63.5H257.4V70.5H271.4V74H257.4V81H274.9V84.5H250.4Z"
						fill="#27FF99"
					/>
				</g>
				<rect x="40" y="104" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.4" x="32" y="104" width="8" height="8" fill="#27FF99" />
				<rect x="32" y="96" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.3" x="24" y="96" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.7" x="24" y="88" width="8" height="8" fill="#27FF99" />
				<rect x="24" y="80" width="8" height="8" fill="#27FF99" />
				<rect x="24" y="72" width="8" height="8" fill="#27FF99" />
				<rect x="24" y="64" width="8" height="8" fill="#27FF99" />
				<rect x="24" y="56" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.7" x="24" y="48" width="8" height="8" fill="#27FF99" />
				<rect x="32" y="40" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.3" x="24" y="40" width="8" height="8" fill="#27FF99" />
				<rect x="40" y="32" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.4" x="32" y="32" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.7" x="48" y="24" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.3" x="40" y="24" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.7" x="48" y="112" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.3" x="40" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="96" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="104" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="112" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="120" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="128" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="136" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="144" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="152" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="160" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="168" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="176" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="184" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="192" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="200" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="208" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="216" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="224" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="232" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="240" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="248" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="256" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="264" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="272" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="280" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="288" y="24" width="5" height="8" fill="#27FF99" />
				<rect x="56" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="64" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="72" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="80" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="88" y="24" width="8" height="8" fill="#27FF99" />
				<rect x="96" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="104" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="112" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="120" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="128" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="136" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="144" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="152" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="160" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="168" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="176" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="184" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="192" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="200" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="208" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="216" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="224" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="232" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="240" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="248" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="256" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="264" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="272" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="280" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="288" y="112" width="5" height="8" fill="#27FF99" />
				<rect opacity="0.7" x="293" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="56" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="64" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="72" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="80" y="112" width="8" height="8" fill="#27FF99" />
				<rect x="88" y="112" width="8" height="8" fill="#27FF99" />
				<rect width="8" height="8" transform="matrix(-1 0 0 1 309 104)" fill="#27FF99" />
				<rect
					opacity="0.4"
					width="8"
					height="8"
					transform="matrix(-1 0 0 1 317 104)"
					fill="#27FF99"
				/>
				<rect width="8" height="8" transform="matrix(-1 0 0 1 317 96)" fill="#27FF99" />
				<rect
					opacity="0.3"
					width="8"
					height="8"
					transform="matrix(-1 0 0 1 325 96)"
					fill="#27FF99"
				/>
				<rect
					opacity="0.3"
					width="8"
					height="8"
					transform="matrix(-1 0 0 1 309 112)"
					fill="#27FF99"
				/>
				<line x1="301" y1="104.5" x2="309" y2="104.5" stroke="white" />
				<line x1="309" y1="96.5" x2="317" y2="96.5" stroke="white" />
				<rect width="8" height="8" transform="matrix(0 -1 -1 0 309 40)" fill="#27FF99" />
				<rect
					opacity="0.4"
					width="8"
					height="8"
					transform="matrix(0 -1 -1 0 317 40)"
					fill="#27FF99"
				/>
				<rect width="8" height="8" transform="matrix(0 -1 -1 0 317 48)" fill="#27FF99" />
				<rect opacity="0.3" x="301" y="32" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.3" x="301" y="32" width="8" height="8" fill="#27FF99" />
				<line x1="301" y1="32.5" x2="309" y2="32.5" stroke="white" />
				<rect
					opacity="0.3"
					width="8"
					height="8"
					transform="matrix(0 -1 -1 0 325 48)"
					fill="#27FF99"
				/>
				<rect
					opacity="0.3"
					width="8"
					height="8"
					transform="matrix(0 -1 -1 0 309 32)"
					fill="#27FF99"
				/>
				<line x1="309" y1="40.5" x2="317" y2="40.5" stroke="white" />
				<rect opacity="0.7" x="293" y="24" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.7" x="317" y="88" width="8" height="8" fill="#27FF99" />
				<rect x="317" y="80" width="8" height="8" fill="#27FF99" />
				<rect opacity="0.7" x="317" y="48" width="8" height="8" fill="#27FF99" />
				<rect x="317" y="56" width="8" height="8" fill="#27FF99" />
				<rect x="317" y="64" width="8" height="8" fill="#27FF99" />
				<rect x="317" y="72" width="8" height="8" fill="#27FF99" />
				<line x1="32" y1="96.5" x2="40" y2="96.5" stroke="white" />
				<line x1="40" y1="104.5" x2="48" y2="104.5" stroke="white" />
				<line x1="32" y1="40.5" x2="40" y2="40.5" stroke="white" />
				<line opacity="0.7" x1="24" y1="48.5" x2="32" y2="48.5" stroke="white" />
				<line x1="40" y1="32.5" x2="48" y2="32.5" stroke="white" />
				<line x1="56" y1="24.5" x2="293" y2="24.5" stroke="white" />
				<line x1="56" y1="112.5" x2="293" y2="112.5" stroke="white" />
				<line opacity="0.7" x1="317" y1="48.5" x2="325" y2="48.5" stroke="white" />
				<path
					opacity="0.4"
					d="M301 128H48V120H301V128ZM48 120H40V112H48V120ZM309 120H301V112H309V120ZM40 112H32V104H40V112ZM317 112H309V104H317V112ZM32 104H24V96H32V104ZM325 104H317V96H325V104ZM24 96H16V48H24V96ZM333 96H325V48H333V96ZM32 48H24V40H32V48ZM325 48H317V40H325V48ZM40 40H32V32H40V40ZM317 40H309V32H317V40ZM48 32H40V24H48V32ZM309 32H301V24H309V32ZM301 24H48V16H301V24Z"
					fill="#27FF99"
				/>
				<path
					d="M301 136H48V128H301V136ZM48 128H40V120H48V128ZM309 128H301V120H309V128ZM40 120H32V112H40V120ZM317 120H309V112H317V120ZM32 112H24V104H32V112ZM325 112H317V104H325V112ZM24 104H16V96H24V104ZM333 104H325V96H333V104ZM16 96H8V48H16V96ZM341 96H333V48H341V96ZM24 48H16V40H24V48ZM333 48H325V40H333V48ZM32 40H24V32H32V40ZM325 40H317V32H325V40ZM40 32H32V24H40V32ZM317 32H309V24H317V32ZM48 24H40V16H48V24ZM309 24H301V16H309V24ZM301 16H48V8H301V16Z"
					fill="#27FF99"
					fill-opacity="0.2"
				/>
				<path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M48 0H56H64H72H80H88H96H104H112H120H128H136H144H152H160H168H176H184H192H200H208H216H224H232H240H248H256H264H272H280H288H293H296H301V8H296H293H288H280H272H264H256H248H240H232H224H216H208H200H192H184H176H168H160H152H144H136H128H120H112H104H96H88H80H72H64H56H48V0ZM40 16V8H48V16H40ZM32 24H40V16H32V24ZM24 32V24H32V32H24ZM16 40V32H24V40H16ZM8 48V40H16V48H8ZM8 96H0V88V80V72V64V56V48H8V56V64V72V80V88V96ZM16 104H8V96H16V104ZM24 112H16V104H24V112ZM32 120H24V112H32V120ZM40 128H32V120H40V128ZM48 136H40V128H48V136ZM301 136V144H296H293H288H280H272H264H256H248H240H232H224H216H208H200H192H184H176H168H160H152H144H136H128H120H112H104H96H88H80H72H64H56H48V136H56H64H72H80H88H96H104H112H120H128H136H144H152H160H168H176H184H192H200H208H216H224H232H240H248H256H264H272H280H288H293H296H301ZM309 128V136H301V128H309ZM317 120V128H309V120H317ZM325 112V120H317V112H325ZM333 104V112H325V104H333ZM341 96V104H333V96H341ZM341 48H349V56V64V72V80V88V96H341V88V80V72V64V56V48ZM333 40H341V48H333V40ZM325 32H333V40H325V32ZM317 24H325V32H317V24ZM309 16H317V24H309V16ZM309 16V8H301V16H309Z"
					fill="#27FF99"
					fill-opacity="0.07"
				/>
			</g>
			<defs>
				<filter
					id="filter0_d_2003_1340"
					x="74"
					y="59"
					width="200.9"
					height="25.5"
					filterUnits="userSpaceOnUse"
					color-interpolation-filters="sRGB"
				>
					<feFlood flood-opacity="0" result="BackgroundImageFix" />
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset dy="-1" />
					<feComposite in2="hardAlpha" operator="out" />
					<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
					<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_2003_1340" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="effect1_dropShadow_2003_1340"
						result="shape"
					/>
				</filter>
				<linearGradient
					id="paint0_linear_2003_1340"
					x1="32"
					y1="72"
					x2="317"
					y2="72"
					gradientUnits="userSpaceOnUse"
				>
					<stop stop-color="#2B2B2B" />
					<stop offset="0.485" stop-color="#2B2B2B" />
					<stop offset="1" stop-color="#555555" />
				</linearGradient>
				<clipPath id="clip0_2003_1340">
					<rect width="349" height="144" fill="white" />
				</clipPath>
			</defs>
		</svg>
	</span>
</button>

<style>
	/* -----------------------------------------------------------
	   Tweakables (arcade-authentic defaults)
	   ----------------------------------------------------------- */
	:global(:root) {
	}
	.cta {
		/* Dimensions come from inline style --w/--h */
		--neon: #27ff99;
		--pulse-scale: 1.03; /* peak zoom at idle */
		--hover-scale: 1.06; /* zoom when hovered/focused */
		--pulse-duration: 2200ms; /* idle loop speed */
		--neon-opacity-idle: 0.12; /* neon rim at idle */
		--neon-opacity-hover: 0.38; /* neon rim when hovered */
		--neon-blur: 6px; /* softness of rim */
	}

	/* Button container is a fixed box = larger sprite size to prevent layout shift */
	.cta {
		width: var(--w);
		height: var(--h);
		position: relative;
		display: inline-block;
		vertical-align: middle;
		background: transparent;
		border: 0;
		padding: 0;
		line-height: 0;
		cursor: pointer;

		/* Authentic attract-mode "breathing" zoom */
		animation: zoomPulse var(--pulse-duration) ease-in-out infinite;
		transform: translateZ(0);
		will-change: transform, filter;
		transition:
			transform 160ms cubic-bezier(0.2, 0.8, 0.15, 1),
			filter 160ms;
		outline: none;
	}
	.cta:focus-visible {
		outline: 2px solid #27ff99;
		outline-offset: 3px;
		border-radius: 6px;
	}

	@keyframes zoomPulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(var(--pulse-scale));
		}
		100% {
			transform: scale(1);
		}
	}

	/* Hover/focus: lean forward toward viewer + stronger neon; stop idle pulse */
	.cta[data-hovered='true'] {
		animation: none;
		transform: scale(var(--hover-scale)) translateY(0.5px);
		filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35));
	}

	/* Absolutely center each sprite inside the fixed box */
	.sprite-layer {
		position: absolute;
		left: 50%;
		top: 50%;
		width: var(--sw);
		height: var(--sh);
		transform: translate(-50%, -50%);
		pointer-events: none;

		/* crisp look if these were raster; harmless for SVGs */
		image-rendering: pixelated;
		-ms-interpolation-mode: nearest-neighbor;

		will-change: opacity, transform;
	}

	/* Crossfade between sprites with a tiny “spring” */
	.sprite-default {
		opacity: 1;
		transition:
			opacity 90ms linear,
			transform 140ms cubic-bezier(0.2, 0.9, 0.1, 1.2);
	}
	.sprite-hover {
		opacity: 0;
		transition:
			opacity 90ms linear,
			transform 140ms cubic-bezier(0.2, 0.9, 0.1, 1.2);
	}
	.cta[data-hovered='true'] .sprite-default {
		opacity: 0;
		transform: translate(-50%, -50%) scale(0.99);
	}
	.cta[data-hovered='true'] .sprite-hover {
		opacity: 1;
		transform: translate(-50%, -50%) scale(1.015);
	}

	/* NEW: Neon rim pulse (rectangle behind sprites, not a shimmer) */
	.neon {
		position: absolute;
		inset: 3%;
		border-radius: 10px;
		box-shadow: 0 0 0 1px color-mix(in oklab, var(--neon), transparent 40%);
		filter: blur(var(--neon-blur));
		background: radial-gradient(
			120% 90% at 50% 50%,
			color-mix(in oklab, var(--neon), transparent 80%) 0%,
			transparent 65%
		);
		opacity: var(--neon-opacity-idle);
		pointer-events: none;
		animation: neonPulse calc(var(--pulse-duration) * 1.05) ease-in-out infinite;
	}
	@keyframes neonPulse {
		0%,
		100% {
			opacity: var(--neon-opacity-idle);
		}
		50% {
			opacity: calc(var(--neon-opacity-idle) + 0.1);
		}
	}
	.cta[data-hovered='true'] .neon {
		opacity: var(--neon-opacity-hover);
		animation-duration: 1600ms;
	}

	/* Motion sensitivity */
	@media (prefers-reduced-motion: reduce) {
		.cta {
			animation: none;
			transition: none;
		}
		.sprite-default,
		.sprite-hover,
		.neon {
			transition: none;
			animation: none;
		}
	}
</style>
