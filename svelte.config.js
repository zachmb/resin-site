import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// Allows local builds even when the dev machine is on an unsupported Node version.
			// Vercel Serverless Functions support nodejs18.x/nodejs20.x/etc.
			runtime: 'nodejs20.x'
		}),
		alias: {
			'@resin/contracts': './src/lib/contracts/index.ts',
			'@resin/core': './src/lib/core/index.ts'
		}
	}
};

export default config;
