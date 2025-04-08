export const prerender = true;
export const csr = true;
export const ssr = true;

export const load = ({ url, params }) => {
	return {
		seo: {
			title: 'Jo Pearson | Design Engineer',
			description: 'Personal design and development web portfolio',
			image: '/assets/images/seo/social-share.png',
			url: 'https://jopearsondesigner.com'
		},
		currentPath: url.pathname,
		params
	};
};
