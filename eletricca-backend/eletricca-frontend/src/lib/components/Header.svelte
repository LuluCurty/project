<script lang="ts">
    import { layoutState } from "$lib/state/layoutState.svelte";
    import { Menu, Megaphone, Sun, Moon }from "@lucide/svelte";
    import { themeState } from "$lib/state/themeState.svelte";
    import { Button } from "$lib/components/ui/button/index.js";

    import { onMount } from "svelte";

    let systemMessage = $state<string>('');

	async function loadAnnouncement() {
		try {
			const res = await fetch(`/api/ann`, {
				credentials: 'include'
			});
			if (!res.ok) return '';

			const { message } = await res.json();
            return message;            
		} catch (error) {
			console.error(error);
			// futuramente vai fazer um evento de erro de tela.
		}
	}

	onMount(async () => {
		systemMessage = await loadAnnouncement();
	});

</script>

<header class="flex h-16 items-center justify-between border-b px-4 bg-background transition-all duration-300">
    <div class="flex items-center gap-4">
        <button 
            type="button"
            class="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
            onclick={() => layoutState.toggle()}
            aria-label="Alternar Menu"
        >
            <Menu size={20}/>
        </button>

        <h2 class="font-medium text-sm text-muted-foreground hidden md:block">
            Painel de Controle
        </h2>
    </div>

    <div class="flex-1 flex justify-center px-4">
        {#if systemMessage}
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border
                border-blue-100 text-xs font-medium animate-in fade-in slide-in-from-top-2"
            >
                <Megaphone size={14}/>
                <span class="truncate max-w-[200px] md:max-w-md">
                    {systemMessage}
                </span>
            </div>
        {/if}
    </div>

    <div class="flex items-center gap-2">
        <Button class="p-2 rounded-full hover:bg-muted transition-colors text-foreground"
            onclick={() => themeState.toggle()}
            aria-label="Trocar Tema"
        >
            {#if themeState.isDark}
                <Moon size={20} class="text-blue-400"/>
            {:else}
                <Sun size={20} class="text-orange-500"/>
            {/if}
        </Button>
    </div>

</header>