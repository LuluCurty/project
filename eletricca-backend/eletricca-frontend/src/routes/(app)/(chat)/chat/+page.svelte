<script lang="ts">
    import { Search, MessageCircle, User } from '@lucide/svelte';
    import * as Avatar from '$lib/components/ui/avatar'; // Usando o componente que já tens
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // Estado para a busca
    let searchTerm = $state('');

    // Lista filtrada reativa (Svelte 5 Derived)
    let filteredUsers = $derived(
        data.users.filter((u) => {
            const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
            const email = u.email.toLowerCase();
            const term = searchTerm.toLowerCase();
            
            return fullName.includes(term) || email.includes(term);
        })
    );
</script>

<div class="max-w-4xl mx-auto p-4 space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight">Chat</h1>
            <p class="text-muted-foreground text-sm">
                Selecione um colega para iniciar uma conversa.
            </p>
        </div>

        <div class="relative w-full md:w-72">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
                type="text"
                bind:value={searchTerm}
                placeholder="Buscar por nome ou email..."
                class="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
        </div>
    </div>

    {#if filteredUsers.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each filteredUsers as user}
                <a 
                    href="/chat/{user.user_id}"
                    class="group relative flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/50 hover:bg-muted/30"
                >
                    <Avatar.Root class="h-12 w-12 border-2 border-transparent group-hover:border-primary/20 transition-colors">
                        <Avatar.Fallback class="bg-primary/10 text-primary font-bold text-lg">
                            {user.first_name[0].charAt(0).toUpperCase()}{user.last_name[0]?.charAt(0).toUpperCase()}
                        </Avatar.Fallback>
                    </Avatar.Root>

                    <div class="flex-1 overflow-hidden">
                        <h3 class="font-semibold truncate group-hover:text-primary transition-colors capitalize">
                            {user.first_name} {user.last_name}
                        </h3>
                        <p class="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <User size={10} />
                            {user.role_name || 'Usuário'}
                        </p>
                    </div>

                    <div class="text-muted-foreground/30 group-hover:text-primary transition-colors">
                        <MessageCircle size={20} />
                    </div>
                </a>
            {/each}
        </div>
    {:else}
        <div class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div class="rounded-full bg-muted p-4 mb-4">
                <Search size={32} />
            </div>
            <p class="text-lg font-medium">Nenhum usuário encontrado</p>
            <p class="text-sm">Tente buscar por outro termo.</p>
        </div>
    {/if}
</div>