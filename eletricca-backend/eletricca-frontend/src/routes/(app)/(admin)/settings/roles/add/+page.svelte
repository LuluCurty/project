<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    
    // UI Components
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    // 1. IMPORTAR O SWITCH
    import Switch from '$lib/components/ui/switch/switch.svelte';
    
    // Icons
    import { ArrowLeft, Save, ShieldCheck, Layers } from '@lucide/svelte';

    let { data, form } = $props();
    // Usamos $state.raw para performance se a lista for muito grande, ou $state normal
    let permissionsByModule = $derived(data.permissionsByModule);

    let isSubmitting = $state(false);

    // --- ESTADO LOCAL DAS PERMISSÕES ---
    // Array que armazena os IDs selecionados (ex: [1, 5, 10])
    let selectedPermissions = $state<number[]>([]);

    // Adiciona ou remove um ID do array
    function togglePermission(id: number) {
        if (selectedPermissions.includes(id)) {
            selectedPermissions = selectedPermissions.filter(p => p !== id);
        } else {
            selectedPermissions = [...selectedPermissions, id];
        }
    }

    // --- LÓGICA DE "SELECIONAR TODOS" ---
    // Verifica se todos do módulo estão marcados
    function isModuleFull(perms: any[]) {
        return perms.every(p => selectedPermissions.includes(p.id));
    }

    // Marca/Desmarca o módulo inteiro
    function toggleModuleAll(perms: any[]) {
        const ids = perms.map(p => p.id);
        const allSelected = isModuleFull(perms);

        if (allSelected) {
            // Remove todos desse módulo
            selectedPermissions = selectedPermissions.filter(id => !ids.includes(id));
        } else {
            // Adiciona os que faltam
            const toAdd = ids.filter(id => !selectedPermissions.includes(id));
            selectedPermissions = [...selectedPermissions, ...toAdd];
        }
    }
</script>

<div class="max-w-4xl mx-auto space-y-6">
    
    <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" onclick={() => goto('/settings/roles')}>
            <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
            <h1 class="text-2xl font-bold tracking-tight">Novo Cargo</h1>
            <p class="text-muted-foreground">Defina o nome e as capacidades deste perfil de acesso.</p>
        </div>
    </div>

    <form 
        method="POST" 
        use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => {
                await update();
                isSubmitting = false;
            };
        }}
        class="space-y-8"
    >
        <Card.Root>
            <Card.Header>
                <Card.Title>Informações Básicas</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-4">
                {#if form?.error}
                    <div class="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                        {form.error}
                    </div>
                {/if}

                <div class="grid gap-2">
                    <Label for="name">Nome do Cargo <span class="text-red-500">*</span></Label>
                    <Input id="name" name="name" placeholder="Ex: Gerente Financeiro" value={form?.name || ''} required />
                </div>

                <div class="grid gap-2">
                    <Label for="description">Descrição</Label>
                    <Textarea id="description" name="description" placeholder="Descreva as responsabilidades..." value={form?.description || ''} />
                </div>
            </Card.Content>
        </Card.Root>

        <div class="space-y-4">
            <div class="flex items-center justify-between px-1">
                <h3 class="text-lg font-medium flex items-center gap-2">
                    <ShieldCheck class="size-5 text-primary" />
                    Permissões de Acesso
                </h3>
            </div>

            {#each Object.entries(permissionsByModule) as [moduleName, perms]}
                <Card.Root>
                    <Card.Header class="pb-3 border-b">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <Layers class="size-4 text-muted-foreground" />
                                <Card.Title class="capitalize text-base">{moduleName}</Card.Title>
                            </div>
                            
                            <div class="flex items-center gap-2">
                                <Label 
                                    for={`all-${moduleName}`} 
                                    class="text-xs font-medium text-muted-foreground cursor-pointer"
                                >
                                    {isModuleFull(perms) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                </Label>
                                <Switch 
                                    id={`all-${moduleName}`}
                                    checked={isModuleFull(perms)}
                                    onCheckedChange={() => toggleModuleAll(perms)}
                                />
                            </div>
                        </div>
                    </Card.Header>
                    
                    <Card.Content class="pt-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {#each perms as p}
                                <div class="flex items-start gap-3">
                                    
                                    <Switch 
                                        id={`perm-${p.id}`}
                                        checked={selectedPermissions.includes(p.id)}
                                        onCheckedChange={() => togglePermission(p.id)}
                                        class="mt-1" 
                                    />
                                    
                                    <input 
                                        type="checkbox" 
                                        name="permissions" 
                                        value={p.id}
                                        checked={selectedPermissions.includes(p.id)}
                                        class="hidden"
                                    />

                                    <div class="space-y-1">
                                        <Label 
                                            for={`perm-${p.id}`} 
                                            class="font-medium text-sm cursor-pointer hover:text-primary transition-colors block"
                                        >
                                            {p.slug.split('.')[1] || p.slug}
                                        </Label>
                                        <p class="text-xs text-muted-foreground line-clamp-2 leading-tight">
                                            {p.description}
                                        </p>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </Card.Content>
                </Card.Root>
            {/each}
        </div>

        <div class="flex justify-end pt-4 pb-12">
            <Button type="submit" size="lg" disabled={isSubmitting}>
                {#if isSubmitting}
                    Salvando...
                {:else}
                    <Save class="mr-2 size-4" />
                    Criar Cargo
                {/if}
            </Button>
        </div>
    </form>
</div>