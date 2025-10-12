<script lang="ts">
        import { assets, base } from '$app/paths';

        export let title = 'Jo Pearson Design | Design Engineer';
        export let description =
                'A cutting-edge arcade-style interactive portfolio by Jo Pearson – Designer & Developer.';
        export let image = '/images/social-share.png'; // Recommended: 1200x630px
        export let url = 'https://jopearsondesigner.com';
        export let type = 'website'; // or 'article', 'profile', etc.
        export let twitterHandle = '@jopearsondev'; // optional

        const withAssets = (path: string) => {
                if (!path) return path;
                if (path.startsWith('http') || path.startsWith('data:')) {
                        return path;
                }

                const normalizedAssets = assets?.replace(/\/$/, '') ?? '';
                const normalizedPath = path.startsWith('/') ? path : `/${path}`;

                return `${normalizedAssets}${normalizedPath}` || normalizedPath;
        };

        const withBase = (path: string) => {
                if (!path) return base;
                if (path.startsWith('http') || path.startsWith('mailto:') || path.startsWith('tel:')) {
                        return path;
                }

                const normalizedBase = base?.replace(/\/$/, '') ?? '';
                const normalizedPath = path.startsWith('/') ? path : `/${path}`;

                return `${normalizedBase}${normalizedPath}` || normalizedPath;
        };

        $: resolvedImage = withAssets(image);
        $: canonicalUrl = url ? withBase(url) : withBase('/');
        $: faviconHref = withAssets('/favicon.ico');
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />

	<!-- Open Graph -->
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
        <meta property="og:image" content={resolvedImage} />
        <meta property="og:url" content={canonicalUrl} />
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content="Jo Pearson Design" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={resolvedImage} />
	{#if twitterHandle}
		<meta name="twitter:creator" content={twitterHandle} />
		<meta name="twitter:site" content={twitterHandle} />
	{/if}

	<!-- Favicons & Mobile Meta -->
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#000000" />
        <link rel="icon" href={faviconHref} />
</svelte:head>
