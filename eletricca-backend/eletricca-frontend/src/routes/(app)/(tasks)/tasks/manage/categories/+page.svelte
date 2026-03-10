<script lang="ts">
    import { ArrowLeft, Plus, Pencil, Trash2, Tag, ClipboardList } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms';

    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Input } from '$lib/components/ui/input';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Label } from '$lib/components/ui/label';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as AlertDialog from '$lib/components/ui/alert-dialog';
    import * as Alert from '$lib/components/ui/alert';

    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let categories = $derived(data.categories);

    // Dialog de criar/editar
    let dialogOpen = $state(false);
    let editTarget = $state<{ id: number; name: string; description: string } | null>(null);
    let fieldName = $state('');
    let fieldDescription = $state('');
    let submitting = $state(false);

    // Dialog de exclusão
    let deleteDialogOpen = $state(false);
    let deleteTarget = $state<{ id: number; name: string; task_count: number } | null>(null);

    function openCreate() {
        editTarget = null;
        fieldName = '';
        fieldDescription = '';
        dialogOpen = true;
    }

    function openEdit(cat: { id: number; name: string; description: string }) {
        editTarget = cat;
        fieldName = cat.name;
        fieldDescription = cat.description || '';
        dialogOpen = true;
    }

    function openDelete(cat: { id: number; name: string; task_count: number }) {
        deleteTarget = cat;
        deleteDialogOpen = true;
    }

    $effect(() => {
        // Fecha o dialog após sucesso
        if (form?.success) {
            dialogOpen = false;
            deleteDialogOpen = false;
        }
    });

    function formatDate(iso: string | null) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
</script>

<div class="max-w-3xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
            <Button variant="ghost" size="icon" onclick={() => goto('/tasks/manage')}>
                <ArrowLeft class="size-5" />
            </Button>
            <div>
                <h2 class="text-2xl font-bold tracking-tight text-primary">Categorias</h2>
                <p class="text-muted-foreground">Gerencie as categorias de tarefas</p>
            </div>
        </div>
        <Button onclick={openCreate}>
            <Plus class="mr-2 size-4" /> Nova Categoria
        </Button>
    </div>

    {#if form?.error && !dialogOpen}
        <Alert.Root variant="destructive">
            <Alert.Description>{form.error}</Alert.Description>
        </Alert.Root>
    {/if}

    <!-- Lista -->
    <Card.Root>
        <Card.Content class="p-0">
            {#if categories.length === 0}
                <div class="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <Tag class="size-10 text-muted-foreground/40" />
                    <p class="text-sm text-muted-foreground">Nenhuma categoria cadastrada</p>
                    <Button variant="outline" size="sm" onclick={openCreate}>
                        <Plus class="mr-2 size-4" /> Criar primeira categoria
                    </Button>
                </div>
            {:else}
                <div class="divide-y">
                    {#each categories as cat (cat.id)}
                        <div class="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                            <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                <Tag class="size-4 text-primary" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium leading-none">{cat.name}</p>
                                {#if cat.description}
                                    <p class="mt-1 text-xs text-muted-foreground truncate">{cat.description}</p>
                                {/if}
                            </div>
                            <div class="flex items-center gap-3 shrink-0">
                                <span class="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <ClipboardList class="size-3.5" />
                                    {cat.task_count} {cat.task_count === 1 ? 'tarefa' : 'tarefas'}
                                </span>
                                <Badge variant="outline" class="text-xs hidden md:flex">
                                    {formatDate(cat.created_at)}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="size-8 text-muted-foreground hover:text-foreground"
                                    onclick={() => openEdit(cat)}
                                >
                                    <Pencil class="size-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="size-8 text-muted-foreground hover:text-destructive"
                                    onclick={() => openDelete(cat)}
                                >
                                    <Trash2 class="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </Card.Content>
    </Card.Root>
</div>

<!-- Dialog: Criar / Editar -->
<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content class="max-w-md">
        <Dialog.Header>
            <Dialog.Title>{editTarget ? 'Editar Categoria' : 'Nova Categoria'}</Dialog.Title>
            <Dialog.Description>
                {editTarget ? 'Altere o nome ou a descrição da categoria.' : 'Crie uma nova categoria para organizar as tarefas.'}
            </Dialog.Description>
        </Dialog.Header>

        <form
            method="POST"
            action={editTarget ? '?/updateCategory' : '?/createCategory'}
            use:enhance={() => {
                submitting = true;
                return async ({ update }) => {
                    submitting = false;
                    await update();
                };
            }}
        >
            {#if editTarget}
                <input type="hidden" name="id" value={editTarget.id} />
            {/if}

            <div class="space-y-4 py-2">
                {#if form?.error && dialogOpen}
                    <Alert.Root variant="destructive">
                        <Alert.Description>{form.error}</Alert.Description>
                    </Alert.Root>
                {/if}

                <div class="space-y-1.5">
                    <Label for="cat-name">Nome *</Label>
                    <Input
                        id="cat-name"
                        name="name"
                        bind:value={fieldName}
                        placeholder="Ex: Manutenção"
                        required
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="cat-desc">Descrição</Label>
                    <Textarea
                        id="cat-desc"
                        name="description"
                        bind:value={fieldDescription}
                        rows={2}
                        placeholder="Descreva quando usar esta categoria (opcional)"
                    />
                </div>
            </div>

            <Dialog.Footer class="mt-4">
                <Button type="button" variant="outline" onclick={() => dialogOpen = false}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>
                    {editTarget ? 'Salvar alterações' : 'Criar categoria'}
                </Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>

<!-- AlertDialog: Excluir -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Excluir categoria?</AlertDialog.Title>
            <AlertDialog.Description>
                Você está prestes a excluir <strong>"{deleteTarget?.name}"</strong>.
                {#if deleteTarget && deleteTarget.task_count > 0}
                    As <strong>{deleteTarget.task_count} {deleteTarget.task_count === 1 ? 'tarefa' : 'tarefas'}</strong> vinculadas ficarão sem categoria.
                {/if}
                Esta ação não pode ser desfeita.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            <form
                method="POST"
                action="?/deleteCategory"
                use:enhance={() => {
                    return async ({ update }) => {
                        deleteDialogOpen = false;
                        deleteTarget = null;
                        await update();
                    };
                }}
            >
                <input type="hidden" name="id" value={deleteTarget?.id || ''} />
                <Button type="submit" variant="destructive">Excluir</Button>
            </form>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
