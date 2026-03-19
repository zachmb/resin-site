import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			runtime: 'nodejs20.x'
		}),
		alias: {
			'@resin/contracts': './src/lib/contracts/index.ts',
			'@resin/core': './src/lib/core/index.ts'
		}
	}
};

export default config;
