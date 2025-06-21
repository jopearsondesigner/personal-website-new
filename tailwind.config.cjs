// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class', // Enable class-based dark mode
	theme: {
		extend: {
			colors: {
				arcadeRed: {
					50: '#ffe8e0',
					100: '#ffc6b3',
					200: '#ff9b80',
					300: '#ff704d',
					400: '#ff5426',
					500: '#FF4500', // base color
					600: '#e63e00',
					700: '#cc3700',
					800: '#b33000',
					900: '#992900'
				},
				arcadeBlack: {
					50: '#eaeaea',
					100: '#d5d5d5',
					200: '#ababab',
					300: '#808080',
					400: '#555555',
					500: '#2b2b2b', // base color
					600: '#262626',
					700: '#1a1a1a',
					800: '#0d0d0d',
					900: '#000000'
				},
				arcadeWhite: {
					50: '#fafaf0',
					100: '#f7f7e6',
					200: '#f5f5dc', // base color
					300: '#ececce',
					400: '#e2e2bd',
					500: '#d9d9ab',
					600: '#c0c08d',
					700: '#a7a770',
					800: '#8d8d56',
					900: '#73733b'
				},
				arcadeLightGrey: '#e8eaed',
				arcadeElectricBlue: {
					50: '#e6f3ff',
					100: '#cce7ff',
					200: '#99cfff',
					300: '#66b8ff',
					400: '#339fff',
					500: '#1e90ff', // base color
					600: '#1a82e6',
					700: '#156bbf',
					800: '#104d99',
					900: '#0b3973'
				},
				arcadeBrightYellow: {
					50: '#FFF8E1',
					100: '#FFEEB2',
					200: '#FFE480',
					300: '#FFDA4E',
					400: '#FFD024',
					500: '#FFD700', // base color
					600: '#E6C200',
					700: '#B39A00',
					800: '#806F00',
					900: '#4D4600'
				},
				metallicGold: {
					50: '#f9f3e7',
					100: '#f0e1c2',
					200: '#e6cd96',
					300: '#dbb96a',
					400: '#cfa144',
					500: '#B6862C', // base color
					600: '#996d24',
					700: '#7a561d',
					800: '#5c4016',
					900: '#3e2a0e'
				},
				arcadeNeonGreen: {
					50: '#e3ffee',
					100: '#c7ffdd',
					200: '#9fffbf',
					300: '#77ffa1',
					400: '#4fffae',
					500: '#27ff99', // base color
					600: '#00ff80',
					700: '#00e670',
					800: '#00b35a',
					900: '#00804d'
				},
				arcadeMagenta: {
					50: '#FFE6FF',
					100: '#FFB3FF',
					200: '#FF80FF',
					300: '#FF4DFF',
					400: '#FF1AFF',
					500: '#FF00FF', // base color
					600: '#E600E6',
					700: '#B300B3',
					800: '#800080',
					900: '#4D004D'
				},
				teal: {
					50: '#E0F7F7',
					100: '#B3EFEF',
					200: '#80E7E7',
					300: '#4DDCDC',
					400: '#1AD1D1',
					500: '#00A8A8', // base color and brand color
					600: '#008F8F',
					700: '#006666',
					800: '#004D4D',
					900: '#003333'
				},
				darkModeBg: '#1a1a1a',
				lightModeBg: '#d0d0d0' // Adjusted light grey color
			},
			fontFamily: {
				arcade: ['"Press Start 2P"', 'sans-serif'],
				body: ['IBM Plex Sans', 'sans-serif'],
				gruppo: ['Gruppo', 'sans-serif'], // Now for branding only
				header: ['Orbitron', 'sans-serif'], // New header font
				ibmPlexMono: ['IBM Plex Sans', 'sans-serif'],
				bungee: ['Bungee', 'cursive'],
				orbitron: ['Orbitron', 'sans-serif'],
				pixelify: ['Pixelify Sans', 'sans-serif']
			},
			fontWeight: {
				// IBM Plex Sans variable weights (100-700)
				'ibm-thin': '200',
				'ibm-light': '300',
				'ibm-normal': '400',
				'ibm-medium': '500',
				'ibm-semibold': '600',
				'ibm-bold': '700',

				// Orbitron variable weights (400-900)
				'orbitron-light': '450',
				'orbitron-normal': '550',
				'orbitron-medium': '650',
				'orbitron-semibold': '750',
				'orbitron-bold': '850',
				'orbitron-black': '900',

				// Pixelify Sans variable weights (400-700)
				'pixelify-normal': '400',
				'pixelify-medium': '500',
				'pixelify-semibold': '600',
				'pixelify-bold': '700',

				// Responsive variable weights
				'light-medium': '350',
				'medium-semibold': '550',
				'bold-extra': '750'
			},
			fontSize: {
				base: ['16px', '1.75'], // Body text size and line height
				lg: ['18px', '1.75'], // Slightly larger body text
				h1: ['48px', '1.4'], // H1 size and line height
				h2: ['36px', '1.4'], // H2 size and line height
				h3: ['28px', '1.4'], // H3 size and line height
				h4: ['24px', '1.4'], // H4 size and line height
				h5: ['20px', '1.4'], // H5 size and line height
				h6: ['18px', '1.4'], // H6 size and line height
				link: ['11px', '1.4'] // link size and line height
			},
			spacing: {
				'section-padding': '80px', // Section padding
				'element-margin': '24px', // General element margin
				'container-padding': '12px', // Container padding
				'button-padding': '10px 20px' // Button padding
			},
			boxShadow: {
				header: '0 6px 12px -4px rgba(0, 0, 0, 0.41)',
				button: '0 4px #999',
				buttonPressed: '0 2px #666'
			},
			// Custom utilities for variable fonts
			fontVariationSettings: {
				'orbitron-light': '"wght" 450',
				'orbitron-normal': '"wght" 550',
				'orbitron-medium': '"wght" 650',
				'orbitron-semibold': '"wght" 750',
				'orbitron-bold': '"wght" 850',
				'orbitron-black': '"wght" 900',
				'ibm-thin': '"wght" 200',
				'ibm-light': '"wght" 300',
				'ibm-normal': '"wght" 400',
				'ibm-medium': '"wght" 500',
				'ibm-semibold': '"wght" 600',
				'ibm-bold': '"wght" 700'
			}
		}
	},
	plugins: [
		// Custom plugin to add variable font utilities
		function ({ addUtilities, theme }) {
			const fontVariationSettings = theme('fontVariationSettings');
			const fontVariationUtilities = Object.entries(fontVariationSettings).reduce(
				(acc, [key, value]) => {
					acc[`.font-variation-${key}`] = {
						'font-variation-settings': value
					};
					return acc;
				},
				{}
			);

			addUtilities(fontVariationUtilities);

			// Add responsive variable font utilities
			addUtilities({
				'.variable-font-smooth': {
					'font-variation-settings': '"wght" var(--font-weight, 400)',
					transition: 'font-variation-settings 0.3s ease'
				},
				'.orbitron-responsive': {
					'font-family': 'Orbitron, sans-serif',
					'font-weight': 'var(--orbitron-weight-normal)',
					'font-variation-settings': '"wght" var(--orbitron-weight-normal)'
				},
				'.ibm-responsive': {
					'font-family': 'IBM Plex Sans, sans-serif',
					'font-weight': 'var(--ibm-weight-normal)',
					'font-variation-settings': '"wght" var(--ibm-weight-normal)'
				}
			});
		}
	]
};
