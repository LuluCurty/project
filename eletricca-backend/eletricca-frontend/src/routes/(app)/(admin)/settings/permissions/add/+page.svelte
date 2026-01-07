<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    
    // UI Components
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Separator } from '$lib/components/ui/separator';
    import { Badge } from '$lib/components/ui/badge';
    
    // Icons
    import { ArrowLeft, PackagePlus, CheckCircle2, AlertCircle } from 'lucide-svelte';

    let { data } = $props();
    let newModules = $derived(data.newModules);

    // Estado local para loading dos botões individuais
    let creatingModule = $state<string | null>(null);
</script>

<div class="max-w-2xl mx-auto space-y-6 pt-6">
    
    <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" onclick={() => goto('/settings/permissions')}>
            <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
            <h1 class="text-2xl font-bold">Adicionar Módulos</h1>
            <p class="text-muted-foreground">Sincronização automática com pastas do sistema.</p>
        </div>
    </div>

    <Card.Root>
        <Card.Header>
            <Card.Title class="flex items-center gap-2">
                <PackagePlus class="h-5 w-5 text-primary" />
                Módulos Detectados
            </Card.Title>
            <Card.Description>
                O sistema escaneou a pasta <code>src/routes/(app)</code> e encontrou os seguintes Route Groups sem permissões cadastradas.
            </Card.Description>
        </Card.Header>
        
        <Card.Content class="space-y-4">
            {#if newModules.length === 0}
                <div class="flex flex-col items-center justify-center py-8 text-center space-y-3 bg-muted/20 rounded-lg border border-dashed">
                    <CheckCircle2 class="h-10 w-10 text-green-500" />
                    <div>
                        <h3 class="font-medium">Tudo sincronizado!</h3>
                        <p class="text-sm text-muted-foreground">Todos os módulos das pastas já estão cadastrados no banco.</p>
                    </div>
                    <Button variant="outline" onclick={() => goto('/settings/permissions')}>
                        Voltar para Lista
                    </Button>
                </div>
            {:else}
                <div class="grid gap-4">
                    {#each newModules as mod}
                        <div class="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-lg capitalize">{mod}</span>
                                    <Badge variant="outline" class="font-mono text-[10px]">/{mod}</Badge>
                                </div>
                                <p class="text-xs text-muted-foreground">
                                    Criará: <span class="font-mono">{mod}.view, {mod}.create, {mod}.edit, {mod}.delete, {mod}.manage</span>
                                </p>
                            </div>

                            <form 
                                action="?/createStandard" 
                                method="POST" 
                                use:enhance={() => {
                                    creatingModule = mod;
                                    return async ({ update }) => {
                                        await update();
                                        creatingModule = null;
                                    };
                                }}
                            >
                                <input type="hidden" name="module_name" value={mod}>
                                <Button type="submit" disabled={creatingModule === mod}>
                                    {#if creatingModule === mod}
                                        Salvando...
                                    {:else}
                                        Adicionar Módulo
                                    {/if}
                                </Button>
                            </form>
                        </div>
                    {/each}
                </div>
            {/if}
        </Card.Content>
    </Card.Root>

    <div class="flex items-start gap-3 p-4 bg-yellow-500/10 text-yellow-600 rounded-md text-sm border border-yellow-500/20">
        <AlertCircle class="h-5 w-5 shrink-0" />
        <p>
            Módulos são detectados baseados nos nomes das pastas entre parênteses, ex: <code>(projects)</code>. 
            Se você criar uma nova pasta no código, ela aparecerá aqui automaticamente.
        </p>
    </div>
</div>