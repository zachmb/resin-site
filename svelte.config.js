import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			'@resin/contracts': './src/lib/contracts/index.ts',
			'@resin/core': './src/lib/core/index.ts'
		}
	}
};

export default config;
