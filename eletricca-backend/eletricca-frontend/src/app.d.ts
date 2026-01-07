// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				user_id: number;
				email: string;
				first_name: string;
				last_name: string;
				user_role: string;
				permissions?: string[];
				role_id: number;
			} | null
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
