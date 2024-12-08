<script>
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	let isHovered = false;
	let buttonSize = 0.67; // Modify this value to adjust the size

	// Function to handle GSAP animations
	const animateButton = () => {
		gsap.fromTo(
			'.cta-button',
			{ opacity: 0.8, scale: 1, filter: 'drop-shadow(0 0 5px rgba(0,255,0,0.5))' },
			{
				opacity: 1,
				scale: 1.1,
				repeat: -1,
				yoyo: true,
				duration: 1,
				ease: 'power1.inOut',
				filter: 'drop-shadow(0 0 10px rgba(0,255,0,0.8))'
			}
		);
	};

	onMount(() => {
		animateButton();
	});
</script>

<button
	class="cta-button"
	on:mouseenter={() => (isHovered = true)}
	on:mouseleave={() => (isHovered = false)}
	style="--size-multiplier: {buttonSize};"
	class:hover={isHovered}
>
	{#if isHovered}
		<svg
			width={349 * buttonSize}
			height={144 * buttonSize}
			viewBox="0 0 349 144"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<g clip-path="url(#clip0_190_3682)">
				<path
					opacity="0.1"
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M184 16H176H168H160H152H144H136H128H120H112H104H96H88H80H72H64H56H48V24H40V32H32V40H24V48H16V56V64V72V80V88V96H24V104H32V112H40V120H48V128H56H64H72H80H88H96H104H112H120H128H136H144H152H160H168H176H184H192H200H208H216H224H232H240H248H256H264H272H280H288H293H296H301V120H309V112H317V104H325V96H333V88V80V72V64V56V48H325V40H317V32H309V24H301V16H296H293H288H280H272H264H256H248H240H232H224H216H208H200H192H184ZM301 24V32H309V40H317V48H325V56V64V72V80V88V96H317V104H309V112H301V120H296H293H288H280H272H264H256H248H240H232H224H216H208H200H192H184H176H168H160H152H144H136H128H120H112H104H96H88H80H72H64H56H48V112H40V104H32V96H24V88V80V72V64V56V48H32V40H40V32H48V24H56H64H72H80H88H96H104H112H120H128H136H144H152H160H168H176H184H192H200H208H216H224H232H240H248H256H264H272H280H288H293H296H301Z"
					fill="#27FF99"
				/>
				<path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M176 8H184H192H200H208H216H224H232H240H248H256H264H272H280H288H293H296H301V16H296H293H288H280H272H264H256H248H240H232H224H216H208H200H192H184H176H168H160H152H144H136H128H120H112H104H96H88H80H72H64H56H48V8H56H64H72H80H88H96H104H112H120H128H136H144H152H160H168H176ZM40 24V16H48V24H40ZM32 32V24H40V32H32ZM24 40V32H32V40H24ZM16 48V40H24V48H16ZM16 96H8V88V80V72V64V56V48H16V56V64V72V80V88V96ZM24 104H16V96H24V104ZM32 112H24V104H32V112ZM40 120V112H32V120H40ZM48 128H40V120H48V128ZM301 128V136H296H293H288H280H272H264H256H248H240H232H224H216H208H200H192H184H176H168H160H152H144H136H128H120H112H104H96H88H80H72H64H56H48V128H56H64H72H80H88H96H104H112H120H128H136H144H152H160H168H176H184H192H200H208H216H224H232H240H248H256H264H272H280H288H293H296H301ZM309 120V128H301V120H309ZM317 112V120H309V112H317ZM325 104V112H317V104H325ZM333 96V104H325V96H333ZM333 48H341V56V64V72V80V88V96H333V88V80V72V64V56V48ZM325 40H333V48H325V40ZM317 32H325V40H317V32ZM309 24H317V32H309V24ZM309 24V16H301V24H309Z"
					fill="#27FF99"
					fill-opacity="0.05"
				/>
				<path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M48 0H56H64H72H80H88H96H104H112H120H128H136H144H152H160H168H176H184H192H200H208H216H224H232H240H248H256H264H272H280H288H293H296H301V8H296H293H288H280H272H264H256H248H240H232H224H216H208H200H192H184H176H168H160H152H144H136H128H120H112H104H96H88H80H72H64H56H48V0ZM40 16V8H48V16H40ZM32 24H40V16H32V24ZM24 32V24H32V32H24ZM16 40V32H24V40H16ZM8 48V40H16V48H8ZM8 96H0V88V80V72V64V56V48H8V56V64V72V80V88V96ZM16 104H8V96H16V104ZM24 112H16V104H24V112ZM32 120H24V112H32V120ZM40 128H32V120H40V128ZM48 136H40V128H48V136ZM301 136V144H296H293H288H280H272H264H256H248H240H232H224H216H208H200H192H184H176H168H160H152H144H136H128H120H112H104H96H88H80H72H64H56H48V136H56H64H72H80H88H96H104H112H120H128H136H144H152H160H168H176H184H192H200H208H216H224H232H240H248H256H264H272H280H288H293H296H301ZM309 128V136H301V128H309ZM317 120V128H309V120H317ZM325 112V120H317V112H325ZM333 104V112H325V104H333ZM341 96V104H333V96H341ZM341 48H349V56V64V72V80V88V96H341V88V80V72V64V56V48ZM333 40H341V48H333V40ZM325 32H333V40H325V32ZM317 24H325V32H317V24ZM309 16H317V24H309V16ZM309 16V8H301V16H309Z"
					fill="#27FF99"
					fill-opacity="0.025"
				/>
				<path
					opacity="1"
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M48 32H301V40H309V48H317V96H309V104H301V112H48V104H40V96H32V48H40V40H48V32Z"
					fill="url(#paint0_linear_190_3682)"
				/>
				<g filter="url(#filter0_d_190_3682)">
					<path
						d="M92 80.5V75.5H94.5V73H97V70.5H102V68H104.5V65.5H97V68H92V65.5H94.5V63H107V65.5H109.5V70.5H107V73H104.5V75.5H99.5V78H109.5V80.5H92ZM113 80.5V63H128V65.5H130.5V73H128V75.5H118V80.5H113ZM118 73H125.5V65.5H118V73ZM157.5 80.5V78H155V75.5H160V78H167.5V73H157.5V70.5H155V65.5H157.5V63H170V65.5H172.5V68H167.5V65.5H160V70.5H170V73H172.5V78H170V80.5H157.5ZM183.5 80.5V65.5H178.5V63H193.5V65.5H188.5V80.5H183.5ZM197 80.5V68H199.5V65.5H202V63H209.5V65.5H212V68H214.5V80.5H209.5V75.5H202V80.5H197ZM202 73H209.5V68H207V65.5H204.5V68H202V73ZM218 80.5V63H233V65.5H235.5V73H230.5V75.5H233V78H235.5V80.5H228V78H225.5V75.5H223V80.5H218ZM223 73H228V70.5H230.5V65.5H223V73ZM246.5 80.5V65.5H241.5V63H256.5V65.5H251.5V80.5H246.5Z"
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
				<line x1="24" y1="48.5" x2="32" y2="48.5" stroke="white" />
				<line x1="40" y1="32.5" x2="48" y2="32.5" stroke="white" />
				<line x1="56" y1="24.5" x2="293" y2="24.5" stroke="white" />
				<line x1="56" y1="112.5" x2="293" y2="112.5" stroke="white" />
				<line x1="317" y1="48.5" x2="325" y2="48.5" stroke="white" />
			</g>
			<defs>
				<filter
					id="filter0_d_190_3682"
					x="92"
					y="62"
					width="164.5"
					height="18.5"
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
					<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_190_3682" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="effect1_dropShadow_190_3682"
						result="shape"
					/>
				</filter>
				<linearGradient
					id="paint0_linear_190_3682"
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
				<clipPath id="clip0_190_3682">
					<rect width="349" height="144" fill="white" />
				</clipPath>
			</defs>
		</svg>
	{:else}
		<svg
			width={349 * buttonSize}
			height={144 * buttonSize}
			viewBox="0 0 349 144"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<g clip-path="url(#clip0_190_3531)">
				<path
					opacity="0.5"
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M48 32H301V40H309V48H317V96H309V104H301V112H48V104H40V96H32V48H40V40H48V32Z"
					fill="url(#paint0_linear_190_3531)"
				/>
				<g filter="url(#filter0_d_190_3531)">
					<path
						d="M92 80.5V75.5H94.5V73H97V70.5H102V68H104.5V65.5H97V68H92V65.5H94.5V63H107V65.5H109.5V70.5H107V73H104.5V75.5H99.5V78H109.5V80.5H92ZM113 80.5V63H128V65.5H130.5V73H128V75.5H118V80.5H113ZM118 73H125.5V65.5H118V73ZM157.5 80.5V78H155V75.5H160V78H167.5V73H157.5V70.5H155V65.5H157.5V63H170V65.5H172.5V68H167.5V65.5H160V70.5H170V73H172.5V78H170V80.5H157.5ZM183.5 80.5V65.5H178.5V63H193.5V65.5H188.5V80.5H183.5ZM197 80.5V68H199.5V65.5H202V63H209.5V65.5H212V68H214.5V80.5H209.5V75.5H202V80.5H197ZM202 73H209.5V68H207V65.5H204.5V68H202V73ZM218 80.5V63H233V65.5H235.5V73H230.5V75.5H233V78H235.5V80.5H228V78H225.5V75.5H223V80.5H218ZM223 73H228V70.5H230.5V65.5H223V73ZM246.5 80.5V65.5H241.5V63H256.5V65.5H251.5V80.5H246.5Z"
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
				<line x1="24" y1="48.5" x2="32" y2="48.5" stroke="white" />
				<line x1="40" y1="32.5" x2="48" y2="32.5" stroke="white" />
				<line x1="56" y1="24.5" x2="293" y2="24.5" stroke="white" />
				<line x1="56" y1="112.5" x2="293" y2="112.5" stroke="white" />
				<line x1="317" y1="48.5" x2="325" y2="48.5" stroke="white" />
			</g>
			<defs>
				<filter
					id="filter0_d_190_3531"
					x="92"
					y="62"
					width="164.5"
					height="18.5"
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
					<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_190_3531" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="effect1_dropShadow_190_3531"
						result="shape"
					/>
				</filter>
				<linearGradient
					id="paint0_linear_190_3531"
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
				<clipPath id="clip0_190_3531">
					<rect width="349" height="144" fill="white" />
				</clipPath>
			</defs>
		</svg>
	{/if}
</button>

<style>
	.cta-button {
		/* Button's size is now dependent on the size multiplier */
		transform: scale(var(--size-multiplier));
		/* You can add padding, margins, or other properties relative to the size here */
		transition: transform 0.2s ease-in-out;
	}

	.cta-button:hover {
		transform: scale(calc(var(--size-multiplier) * 1.1)); /* Slightly bigger on hover */
	}
</style>
