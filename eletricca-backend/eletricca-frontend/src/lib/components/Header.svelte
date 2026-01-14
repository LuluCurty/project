<script lang="ts">
    import { layoutState } from "$lib/state/layoutState.svelte";
    import { themeState } from "$lib/state/themeState.svelte";
    import { Button } from "$lib/components/ui/button";
    import { Menu, Megaphone, Sun, Moon, ExternalLink } from "@lucide/svelte";

    interface Announcement {
        message: string;
        link: string | null;
    }

    interface HeaderProps {
        announcement: Announcement | null;
    }

    let { announcement }: HeaderProps = $props();

    function handleToggle() {
        if (window.innerWidth < 768) {
            layoutState.toggleMobile();
        } else {
            layoutState.toggleCollapsed();
        }
    }
</script>

{#snippet announcementBadge(text: string, hasLink: boolean)}
    <div class={`
        flex items-center gap-2 px-3 py-1.5 rounded-full 
        bg-blue-50 text-blue-700 border border-blue-100 
        text-xs font-medium animate-in fade-in slide-in-from-top-2
        ${hasLink ? 'hover:bg-blue-100 hover:border-blue-200 transition-colors cursor-pointer group' : ''}
    `}>
        <Megaphone size={14} class={hasLink ? 'group-hover:rotate-[-10deg] transition-transform' : ''}/>
        
        <span class="truncate max-w-[200px] md:max-w-md">
            {text}
        </span>

        {#if hasLink}
            <ExternalLink size={10} class="opacity-50 group-hover:opacity-100" />
        {/if}
    </div>
{/snippet}

<header class="flex h-16 items-center justify-between border-b px-4 bg-background transition-all duration-300">
    <div class="flex items-center gap-4">
        <button 
            type="button"
            class="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
            onclick={handleToggle}
            aria-label="Alternar Menu"
        >
            <Menu size={20}/>
        </button>

        <h2 class="font-medium text-sm text-muted-foreground hidden md:block">
            Painel de Controle
        </h2>
    </div>

    <div class="flex-1 flex justify-center px-4">
        {#if announcement?.message}
            {#if announcement.link}
                <a href={announcement.link} target="_blank" rel="noreferrer">
                    {@render announcementBadge(announcement.message, true)}
                </a>
            {:else}
                {@render announcementBadge(announcement.message, false)}
            {/if}
        {/if}
    </div>

    <div class="flex items-center gap-2">
        <Button variant="ghost" size="icon" class="rounded-full"
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