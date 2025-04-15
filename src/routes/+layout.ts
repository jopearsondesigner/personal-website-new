export const prerender = true;
export const csr = true;
export const ssr = true;

export const load = ({ url, params }) => {
	return {
		seo: {
			title: 'Jo Pearson | Design Engineer',
			description: 'Personal design and development web portfolio',
			// Make sure to update +layout.svelte when updating URL too!!!
			image:
				'https://jopearsondesigner.github.io/personal-website-new/assets/images/seo/social-share.png',
			url: 'https://jopearsondesigner.github.io/personal-website-new/#hero'
		},
		currentPath: url.pathname,
		params
	};
};
