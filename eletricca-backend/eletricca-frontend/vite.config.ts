import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';

if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		proxy: {
			'/api': {
				target: 'https://localhost:54445',
				secure: false,
				changeOrigin: true
			}
		},
		allowedHosts: [
			"porta2escritorio.eletricca.com.br",
			"intranet.eletricca.com.br"
		],
		https: {
			key: fs.readFileSync('/etc/letsencrypt/live/intranet.eletricca.com.br/privkey.pem'),
			cert: fs.readFileSync('/etc/letsencrypt/live/intranet.eletricca.com.br/fullchain.pem')
		}
	},
	ssr: {
		noExternal: ['bits-ui']
	},
	
});


