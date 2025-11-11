import { writable } from 'svelte/store'

export const sideBarCollapsed = writable(false);
export const userName = writable('');