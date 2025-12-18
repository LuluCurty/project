import { browser } from "$app/environment";

class ThemeState {
    isDark = $state(false);

    constructor () {
        if (browser) {
            const savedTheme = localStorage.getItem('theme');

            const systemsPreferDark =  window.matchMedia('(prefers-color-scheme: dark)').matches;

            if (savedTheme === 'dark' || (!savedTheme && systemsPreferDark)) {
                this.isDark = true;
                document.documentElement.classList.add('dark');
            } else {
                this.isDark = false;
                document.documentElement.classList.remove('dark');
            }
        }
    }

    toggle() {
        this.isDark = !this.isDark;

        if (browser) {
            if (this.isDark) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
        }
    }
}


export const themeState = new ThemeState(); 