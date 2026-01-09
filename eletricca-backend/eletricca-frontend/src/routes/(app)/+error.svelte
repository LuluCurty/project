<script lang="ts">
    import { page } from '$app/state';
    import { Button } from '$lib/components/ui/button';
    import { Ban, FileExclamationPoint, TriangleAlert, ArrowLeft, House, ServerCrash } from '@lucide/svelte';

    let status = $derived(page.status);
    let message = $derived(page.error?.message || 'Erro desconhecido');

    // Configuração visual simples baseada no status
    let iconConfig = $derived.by(() => {
        switch (status) {
            case 403: return { icon: Ban, color: 'text-red-500', bg: 'bg-red-500/10' };
            case 404: return { icon: FileExclamationPoint, color: 'text-orange-500', bg: 'bg-orange-500/10' };
            case 500: return { icon: ServerCrash, color: 'text-destructive', bg: 'bg-destructive/10' };
            default: return { icon: TriangleAlert, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
        }
    });

    let Icon = $derived(iconConfig.icon);
</script>

<div class="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
    
    <div class={`p-4 rounded-full ${iconConfig.bg}`}>
        <Icon class={`size-12 ${iconConfig.color}`} />
    </div>

    <div class="space-y-2 max-w-md">
        <h2 class="text-2xl font-bold tracking-tight">
            {#if status === 403}Acesso Negado
            {:else if status === 404}Página não encontrada
            {:else}Algo deu errado ({status}){/if}
        </h2>
        <p class="text-muted-foreground">
            {message}
        </p>
    </div>
    
    <div class="flex items-center gap-3">
        <Button variant="outline" onclick={() => history.back()}>
            <ArrowLeft class="mr-2 size-4" /> Voltar
        </Button>

        <Button variant="default" href="/">
            <House class="mr-2 size-4" /> Início
        </Button>
    </div>
</div>