<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    
    // Componentes UI
    import * as AlertDialog from '$lib/components/ui/alert-dialog'
    import * as Table from '$lib/components/ui/table';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Badge } from '$lib/components/ui/badge';
    
    // Ícones
    import { ArrowLeft, Pencil, Trash, Plus, AlertTriangle, Key } from '@lucide/svelte';

    let { data } = $props();
    let permissions = $derived(data.permissions);
    let moduleName = $derived(data.moduleName);

    // --- CONTROLE DOS MODAIS ---
    let isCreateOpen = $state(false);
    let isEditOpen = $state(false);
    
    // Armazena a permissão que está sendo editada no momento
    let editingPermission = $state<{id: number, slug: string, description: string} | null>(null);

    // controle alert dialog
    let isDeleteOpen = $state(false);
    let permissionToDelete = $state<{id: number, slug: string} | null>(null);

    // Armazena a permissao para delete
    let deleteForms: Record<number, HTMLFormElement> =$state({});

    function openEdit(perm: typeof editingPermission) {
        editingPermission = perm;
        isEditOpen = true;
    }

    function confirmDelete(perm: {id: number, slug: string}) {
        permissionToDelete = perm;
        isDeleteOpen = true;
    }

    function executeDelete() {
        if (permissionToDelete && deleteForms[permissionToDelete.id]) {
            deleteForms[permissionToDelete.id].requestSubmit();
        }
        isDeleteOpen = false;
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
            <Button variant="ghost" size="icon" onclick={() => goto('/settings/permissions')}>
                <ArrowLeft class="size-4" />
            </Button>
            <div>
                <h1 class="text-2xl font-bold flex items-center gap-2 capitalize">
                    {moduleName}
                    <Badge variant="outline" class="text-xs font-normal normal-case text-muted-foreground">
                        Módulo
                    </Badge>
                </h1>
                <p class="text-muted-foreground text-sm">Gerencie as capacidades específicas deste módulo.</p>
            </div>
        </div>
        <Button onclick={() => isCreateOpen = true}>
            <Plus class="mr-2 size-4" /> Adicionar Permissão
        </Button>
    </div>

    <Card.Root>
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.Head class="w-[300px]">Slug (Código)</Table.Head>
                    <Table.Head>Descrição</Table.Head>
                    <Table.Head class="text-right w-[100px]">Ações</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {#if permissions.length === 0}
                     <Table.Row>
                        <Table.Cell colspan={3} class="h-24 text-center text-muted-foreground">
                            Nenhuma permissão encontrada neste módulo.
                        </Table.Cell>
                    </Table.Row>
                {:else}
                    {#each permissions as perm (perm.id)}
                        <Table.Row>
                            <Table.Cell>
                                <div class="flex items-center gap-2">
                                    <Key class="size-3 text-muted-foreground" />
                                    <span class="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">
                                        {perm.slug}
                                    </span>
                                </div>
                            </Table.Cell>
                            <Table.Cell>{perm.description}</Table.Cell>
                            <Table.Cell class="text-right">
                                <div class="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onclick={() => openEdit(perm)}>
                                        <Pencil class="size-4" />
                                    </Button>

                                    <form 
                                        action="?/delete" 
                                        method="POST" 
                                        use:enhance
                                        class="hidden"
                                        bind:this={deleteForms[perm.id]}
                                    >
                                        <input type="hidden" name="id" value={perm.id}>
                                    </form>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        type="submit" 
                                        class="text-destructive hover:bg-destructive/10"
                                        title="Excluir Permissão"
                                        onclick={()=> confirmDelete(perm)}
                                    >
                                        <Trash class="size-4" />
                                    </Button>
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    {/each}
                {/if}
            </Table.Body>
        </Table.Root>
    </Card.Root>
</div>

<Dialog.Root bind:open={isCreateOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title class="text-muted-foreground">Nova Permissão em {moduleName}</Dialog.Title>
            <Dialog.Description>
                Crie uma capacidade específica. O prefixo <b>{moduleName}.</b> será adicionado automaticamente.
            </Dialog.Description>
        </Dialog.Header>

        <form 
            action="?/create" 
            method="POST" 
            use:enhance={() => {
                return async ({ result, update }) => {
                    if (result.type === 'success') {
                        isCreateOpen = false;
                        update();
                    }
                };
            }} 
            class="space-y-4 pt-4"
        >
            <div class="grid gap-2">
                <Label class="text-muted-foreground">Sufixo da Permissão</Label>
                <div class="flex items-center">
                    <span class="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-sm text-muted-foreground select-none">
                        {moduleName}.
                    </span>
                    <Input 
                        name="suffix" 
                        placeholder="ex: export_pdf" 
                        class="rounded-l-none focus-visible:ring-0 text-muted-foreground" 
                        required 
                    />
                </div>
                <p class="text-[10px] text-muted-foreground">
                    Final: <span class="font-mono">{moduleName}.[sufixo]</span>
                </p>
            </div>

            <div class="grid gap-2">
                <Label class="text-muted-foreground">Descrição</Label>
                <Input name="description" placeholder="Ex: Exportar relatórios em PDF" required class="text-muted-foreground"/>
            </div>

            <Dialog.Footer>
                <Button type="submit">Criar Permissão</Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={isEditOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Editar Permissão</Dialog.Title>
        </Dialog.Header>

        {#if editingPermission}
            <form 
                action="?/update" 
                method="POST" 
                use:enhance={() => {
                    return async ({ result, update }) => {
                        if (result.type === 'success') {
                            isEditOpen = false;
                            update();
                        }
                    };
                }} 
                class="space-y-4 pt-4"
            >
                <input type="hidden" name="id" value={editingPermission.id}>

                <div class="bg-yellow-50 text-yellow-800 p-3 rounded-md text-xs flex items-start gap-2 border border-yellow-200">
                    <AlertTriangle class="size-4 shrink-0 mt-0.5" />
                    <p>
                        Cuidado ao alterar o <b>Slug</b>. Se o código (backend) estiver procurando por 
                        <code>{editingPermission.slug}</code> e você mudar aqui, a verificação de segurança pode falhar.
                    </p>
                </div>

                <div class="grid gap-2">
                    <Label>Slug (Código)</Label>
                    <Input name="slug" value={editingPermission.slug} required />
                </div>

                <div class="grid gap-2">
                    <Label>Descrição</Label>
                    <Input name="description" value={editingPermission.description} required />
                </div>

                <Dialog.Footer>
                    <Button type="submit">Salvar Alterações</Button>
                </Dialog.Footer>
            </form>
        {/if}
    </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={isDeleteOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title class="text-muted-foreground">Deseja Excluir {permissionToDelete?.slug}?</AlertDialog.Title>
            <AlertDialog.Description>
                Você deletará a permissão <span class="font-mono font-bold text-foreground" >{permissionToDelete?.slug}</span>
                <br><br>
                Essa ação não pode ser desfeita e removerá a permissão de todos os usuarios conectados a ela.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel class="text-muted-foreground">Cancelar</AlertDialog.Cancel>
            <AlertDialog.Action
                class="bg-destructive hover:bg-destructive/80"
                onclick={executeDelete}
            >
                Excluir Permissão
            </AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>