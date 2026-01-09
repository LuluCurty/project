<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    
    // UI
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Switch } from '$lib/components/ui/switch';
    import { Badge } from '$lib/components/ui/badge';
    import { Separator } from '$lib/components/ui/separator';
    // Importando Select do Shadcn (ajuste o caminho se necessário)
    import * as Select from "$lib/components/ui/select";
    
    // Icons
    import { ArrowLeft, Save, Shield, UserCog, Lock, Layers } from '@lucide/svelte';

    let { data, form } = $props();

    // Dados imutáveis ou derivados iniciais
    let user = $derived(data.user);
    let roles = $derived(data.roles); // Lista [{id, name}, ...]
    let permissionsByModule = $derived(data.permissionsByModule);
    let rolePermissionsMap = $derived(data.rolePermissionsMap);

    // --- ESTADO REATIVO ---
    let isSubmitting = $state(false);

    // 1. Controle do Cargo Selecionado
    // O Select do Shadcn usa um objeto { value, label }, precisamos converter
    let selectedRoleId = $state<string>(data.user.role_id?.toString() || "");

    // 2. Permissões "Extras" (Diretas)
    // Inicializa com o que veio do banco.
    let directPermissions = $state<number[]>(data.directPermissionsIds || []);

    // Se os dados do servidor mudarem (ex: após salvar), atualizamos o estado local
    $effect(() => {
        directPermissions = data.directPermissionsIds || [];
        selectedRoleId = data.user.role_id?.toString() || "";
    });

    // --- LÓGICA DE PERMISSÕES HERDADAS ---
    // Calcula dinamicamente quais permissões o usuário tem por causa do cargo selecionado
    let inheritedPermissions = $derived.by(() => {
        if (!selectedRoleId) return [];
        const rId = Number(selectedRoleId);
        return rolePermissionsMap[rId] || [];
    });

    // Funções de Toggle (Igual Roles)
    function toggleDirect(id: number) {
        if (inheritedPermissions.includes(id)) return; // Não faz nada se for herdado

        if (directPermissions.includes(id)) {
            directPermissions = directPermissions.filter(p => p !== id);
        } else {
            directPermissions = [...directPermissions, id];
        }
    }
</script>

<div class="max-w-4xl mx-auto space-y-6">
    
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div class="flex items-center gap-4">
            <Button variant="ghost" size="icon" onclick={() => goto('/settings/users')}>
                <ArrowLeft class="h-4 w-4" />
            </Button>
            <div>
                <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
                    Editar Usuário
                    <Badge variant="outline">#{user.user_id}</Badge>
                </h1>
                <p class="text-muted-foreground">Dados pessoais e controle de acesso.</p>
            </div>
        </div>
    </div>

    <form 
        method="POST" 
        use:enhance={() => {
            isSubmitting = true;
            return async ({ result, update }) => {
                if (result.type === 'success') {
                    toast.success('Usuário salvo com sucesso!');
                    await update({ reset: false }); 
                } else if (result.type === 'failure') {
                    toast.error(String(result.data?.error) || 'Erro ao salvar.');
                    await update({ reset: false });
                } else {
                    await update();
                }
                isSubmitting = false;
            };
        }}
        class="space-y-8"
    >
        <div class="grid gap-6 md:grid-cols-[1fr_300px]">
            
            <div class="space-y-6">
                <Card.Root>
                    <Card.Header>
                        <div class="flex items-center gap-2">
                            <UserCog class="size-4 text-primary" />
                            <Card.Title>Informações Pessoais</Card.Title>
                        </div>
                    </Card.Header>
                    <Card.Content class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="grid gap-2">
                                <Label>Nome <span class="text-red-500">*</span></Label>
                                <Input name="first_name" value={form?.firstName ?? user.first_name} required />
                            </div>
                            <div class="grid gap-2">
                                <Label>Sobrenome</Label>
                                <Input name="last_name" value={form?.lastName ?? user.last_name} />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="grid gap-2">
                                <Label>Email <span class="text-red-500">*</span></Label>
                                <Input type="text" name="email" value={form?.email ?? user.email} required />
                            </div>
                            <div class="grid gap-2">
                                <Label>Telefone</Label>
                                <Input name="telphone" value={form?.telphone ?? user.telphone} />
                            </div>
                        </div>
                    </Card.Content>
                </Card.Root>

                <div class="space-y-4">
                    <div class="flex items-center justify-between px-1">
                        <h3 class="text-lg font-medium flex items-center gap-2">
                            <Shield class="size-5 text-primary" />
                            Permissões Individuais
                        </h3>
                        <span class="text-xs text-muted-foreground">
                            Ajuste fino de acesso
                        </span>
                    </div>

                    {#each Object.entries(permissionsByModule) as [moduleName, perms]}
                        <Card.Root>
                            <Card.Header class="pb-3 bg-muted/30 border-b py-3">
                                <div class="flex items-center gap-2">
                                    <Layers class="size-4 text-muted-foreground" />
                                    <Card.Title class="capitalize text-sm font-semibold">{moduleName}</Card.Title>
                                </div>
                            </Card.Header>
                            
                            <Card.Content class="pt-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {#each perms as p}
                                        {@const isInherited = inheritedPermissions.includes(p.id)}
                                        {@const isDirect = directPermissions.includes(p.id)}
                                        {@const isActive = isInherited || isDirect}

                                        <div class={`flex items-start gap-3 p-2 rounded-lg border ${isActive ? 'bg-primary/5 border-primary/20' : 'border-transparent'}`}>
                                            
                                            <div class="pt-1">
                                                <Switch 
                                                    checked={isActive}
                                                    disabled={isInherited} 
                                                    onCheckedChange={() => toggleDirect(p.id)}
                                                />
                                            </div>
                                            
                                            {#if isDirect && !isInherited}
                                                <input type="checkbox" name="permissions" value={p.id} checked class="hidden" />
                                            {/if}

                                            <div class="space-y-0.5">
                                                <div class="flex items-center gap-2">
                                                    <span class={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                        {p.slug.split('.')[1] || p.slug}
                                                    </span>
                                                    
                                                    {#if isInherited}
                                                        <Badge variant="secondary" class="h-5 px-1.5 text-[10px] gap-1">
                                                            <Lock class="size-2.5" /> Cargo
                                                        </Badge>
                                                    {/if}
                                                </div>
                                                <p class="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
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
            </div>

            <div class="space-y-6">
                <Card.Root class="sticky top-6 border-l-4 border-l-primary">
                    <Card.Header>
                        <Card.Title>Cargo & Função</Card.Title>
                        <Card.Description>Define o nível de acesso base.</Card.Description>
                    </Card.Header>
                    <Card.Content class="space-y-4">
                        
                        <div class="space-y-2">
                            <Label>Cargo Selecionado</Label>
                            
                            <div class="relative">
                                <select 
                                    name="role_id" 
                                    bind:value={selectedRoleId}
                                    class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                >
                                    <option value="">Sem Cargo (Apenas Permissões)</option>
                                    {#each roles as role}
                                        <option value={role.id.toString()}>{role.name}</option>
                                    {/each}
                                </select>
                            </div>
                            
                            {#if selectedRoleId}
                                <div class="text-xs text-muted-foreground bg-muted p-2 rounded flex gap-2">
                                    <Shield class="size-3 mt-0.5" />
                                    <span>
                                        Concede automaticamente 
                                        <b>{rolePermissionsMap[Number(selectedRoleId)]?.length || 0}</b> permissões.
                                    </span>
                                </div>
                            {/if}
                        </div>

                        <Separator />

                        <Button type="submit" class="w-full" size="lg" disabled={isSubmitting}>
                            {#if isSubmitting}
                                <span class="animate-spin mr-2">⏳</span> Salvando...
                            {:else}
                                <Save class="mr-2 size-4" /> Salvar Tudo
                            {/if}
                        </Button>

                    </Card.Content>
                </Card.Root>
            </div>

        </div>
    </form>
</div>