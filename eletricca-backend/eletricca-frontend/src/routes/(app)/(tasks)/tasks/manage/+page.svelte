<script lang="ts">
    import {
        Search, EllipsisVertical, Plus, ClipboardList, Users, ChevronLeft, ChevronRight,
        Pencil, Trash, UserPlus, ArrowLeft, ChartBar, ListChecks, Archive, ArchiveRestore,
        CircleCheck as CheckCircle2, Clock, TriangleAlert
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { enhance } from '$app/forms';

    import * as Table from '$lib/components/ui/table/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/';
    import * as Pagination from "$lib/components/ui/pagination/index.js";
    import { buttonVariants } from '$lib/components/ui/button/index.js';
    import * as AlertDialog from '$lib/components/ui/alert-dialog';

    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let tasks = $derived(data.tasks);
    let stats = $derived(data.stats);
    let pagination = $derived(data.pagination);

    let deleteDialogOpen = $state(false);
    let taskToDelete = $state<{ id: number; title: string } | null>(null);

    let searchTimeout: ReturnType<typeof setTimeout>;

    function handleSearchInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const url = new URL(page.url);
            url.searchParams.set('search', value);
            url.searchParams.set('page', '1');
            goto(url.toString(), { keepFocus: true, noScroll: true });
        }, 500);
    }

    function handlePageChange(newPage: string) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage);
        goto(url.toString(), { keepFocus: true });
    }

    function formatDate(dateString: Date | string) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function priorityColor(priority: string) {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-700 border-none';
            case 'high': return 'bg-orange-100 text-orange-700 border-none';
            case 'medium': return 'bg-blue-100 text-blue-700 border-none';
            case 'low': return 'bg-gray-100 text-gray-600 border-none';
            default: return '';
        }
    }

    function priorityLabel(priority: string) {
        switch (priority) {
            case 'urgent': return 'Urgente';
            case 'high': return 'Alta';
            case 'medium': return 'Média';
            case 'low': return 'Baixa';
            default: return priority;
        }
    }

    function openDeleteDialog(task: { id: number; title: string }) {
        taskToDelete = task;
        deleteDialogOpen = true;
    }

    // Archived section state
    let showArchived = $state(false);
    let hardDeleteDialogOpen = $state(false);
    let taskToHardDelete = $state<{ id: number; title: string } | null>(null);

    function openHardDeleteDialog(task: { id: number; title: string }) {
        taskToHardDelete = task;
        hardDeleteDialogOpen = true;
    }
</script>

<div class="space-y-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div class="flex items-center gap-4">
            <Button variant="ghost" size="icon" onclick={() => goto('/tasks')}>
                <ArrowLeft class="size-5" />
            </Button>
            <div>
                <h2 class="text-2xl font-bold tracking-tight text-primary">Gerenciar Tarefas</h2>
                <p class="text-muted-foreground">Crie, edite e gerencie tarefas atribuídas</p>
            </div>
        </div>
        <div class="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="outline" onclick={() => goto('/tasks/manage/assignment')}>
                <ListChecks class="mr-2 size-4" /> Atribuições
            </Button>
            <Button variant="outline" onclick={() => goto('/tasks/manage/stats')}>
                <ChartBar class="mr-2 size-4" /> Estatísticas
            </Button>
            <Button onclick={() => goto('/tasks/manage/create')}>
                <Plus class="mr-2 size-4" /> Nova Tarefa
            </Button>
        </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-4">
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Total</p>
                        <p class="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <ClipboardList class="size-8 text-muted-foreground/50" />
                </div>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Ativas</p>
                        <p class="text-2xl font-bold text-blue-600">{stats.active}</p>
                    </div>
                    <Clock class="size-8 text-blue-600/50" />
                </div>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Concluídas</p>
                        <p class="text-2xl font-bold text-green-600">{stats.completed}</p>
                    </div>
                    <CheckCircle2 class="size-8 text-green-600/50" />
                </div>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Atribuições</p>
                        <p class="text-2xl font-bold text-purple-600">{stats.totalAssignments}</p>
                    </div>
                    <Users class="size-8 text-purple-600/50" />
                </div>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Table -->
    <Card.Root>
        <Card.Header class="pb-3">
            <div class="flex items-center gap-2">
                <div class="relative w-full max-w-sm">
                    <Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar tarefa..."
                        class="w-full pl-9"
                        oninput={handleSearchInput}
                        defaultValue={page.url.searchParams.get('search') || ''}
                    />
                </div>
            </div>
        </Card.Header>

        <Card.Content>
            <div class="rounded-md border">
                <Table.Root>
                    <Table.Header>
                        <Table.Row class="bg-muted/50">
                            <Table.Head class="w-[50px]">ID</Table.Head>
                            <Table.Head>Título</Table.Head>
                            <Table.Head class="hidden lg:table-cell">Criado por</Table.Head>
                            <Table.Head class="text-center hidden sm:table-cell">Etapas</Table.Head>
                            <Table.Head class="text-center hidden sm:table-cell">Atribuições</Table.Head>
                            <Table.Head class="text-center">Prioridade</Table.Head>
                            <Table.Head class="hidden md:table-cell">Categoria</Table.Head>
                            <Table.Head class="hidden md:table-cell">Atualizado</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if tasks.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={9} class="h-24 text-center text-muted-foreground">
                                    <div class="flex flex-col items-center gap-2">
                                        <ClipboardList class="size-10 text-muted-foreground/50" />
                                        <p>Nenhuma tarefa encontrada</p>
                                        <Button variant="outline" size="sm" onclick={() => goto('/tasks/manage/create')}>
                                            <Plus class="mr-2 size-4" /> Criar primeira tarefa
                                        </Button>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each tasks as task (task.id)}
                                <Table.Row class="hover:bg-muted/50">
                                    <Table.Cell class="font-medium text-muted-foreground">
                                        #{task.id}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div class="flex flex-col">
                                            <span class="font-medium">{task.title}</span>
                                            <span class="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">
                                                {task.description}
                                            </span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell class="hidden lg:table-cell text-muted-foreground">
                                        {task.created_by_name}
                                    </Table.Cell>
                                    <Table.Cell class="text-center hidden sm:table-cell">
                                        <Badge variant="outline">{task.step_count}</Badge>
                                    </Table.Cell>
                                    <Table.Cell class="text-center hidden sm:table-cell">
                                        <Badge variant="outline" class="border-blue-200 text-blue-700">
                                            {task.assignment_count}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell class="text-center">
                                        <Badge class={priorityColor(task.priority)}>
                                            {priorityLabel(task.priority)}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell class="hidden md:table-cell text-muted-foreground text-sm">
                                        {task.category_name || '-'}
                                    </Table.Cell>
                                    <Table.Cell class="hidden md:table-cell text-muted-foreground text-sm">
                                        {formatDate(task.updated_at)}
                                    </Table.Cell>
                                    <Table.Cell class="text-right">
                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger
                                                class={buttonVariants({ variant: "ghost", size: "icon"}) + " size-8"}
                                            >
                                                <EllipsisVertical class="size-4" />
                                                <span class="sr-only">Abrir menu</span>
                                            </DropdownMenu.Trigger>

                                            <DropdownMenu.Content align="end">
                                                <DropdownMenu.Label>Ações</DropdownMenu.Label>
                                                <DropdownMenu.Separator />

                                                <DropdownMenu.Item onclick={() => goto(`/tasks/manage/${task.id}`)}>
                                                    <Pencil class="mr-2 size-4"/> Editar
                                                </DropdownMenu.Item>

                                                <DropdownMenu.Item onclick={() => goto(`/tasks/manage/${task.id}/assign`)}>
                                                    <UserPlus class="mr-2 size-4"/> Atribuir
                                                </DropdownMenu.Item>

                                                <DropdownMenu.Separator />

                                                <DropdownMenu.Item
                                                    class="text-destructive focus:text-destructive"
                                                    onclick={() => openDeleteDialog({ id: task.id, title: task.title })}
                                                >
                                                    <Trash class="mr-2 size-4" /> Excluir
                                                </DropdownMenu.Item>
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Root>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>

            {#if pagination.totalItems > pagination.limit}
                <Pagination.Root count={pagination.totalItems} perPage={pagination.limit} page={pagination.page}>
                    {#snippet children({ pages, currentPage })}
                        <Pagination.Content class="mt-4">
                            <Pagination.Item>
                                <Pagination.PrevButton
                                    class="cursor-pointer"
                                    disabled={currentPage <= 1}
                                    onclick={() => handlePageChange((currentPage - 1).toString())}
                                >
                                    <ChevronLeft class="size-4"/>
                                    <span class="hidden sm:block">Anterior</span>
                                </Pagination.PrevButton>
                            </Pagination.Item>

                            {#each pages as p (p.key)}
                                {#if p.type === 'ellipsis'}
                                    <Pagination.Item>
                                        <Pagination.Ellipsis />
                                    </Pagination.Item>
                                {:else}
                                    <Pagination.Item>
                                        <Pagination.Link
                                            page={p}
                                            isActive={currentPage === p.value}
                                            onclick={(e: MouseEvent) => {
                                                e.preventDefault();
                                                handlePageChange((p.value).toString())
                                            }}
                                        >
                                            {p.value}
                                        </Pagination.Link>
                                    </Pagination.Item>
                                {/if}
                            {/each}

                            <Pagination.Item>
                                <Pagination.NextButton
                                    onclick={() => handlePageChange((currentPage + 1).toString())}
                                    disabled={currentPage * pagination.limit >= pagination.totalItems}
                                    class="cursor-pointer"
                                >
                                    <span class="hidden sm:block">Próximo</span>
                                    <ChevronRight class="size-4" />
                                </Pagination.NextButton>
                            </Pagination.Item>
                        </Pagination.Content>
                    {/snippet}
                </Pagination.Root>
            {/if}
        </Card.Content>
    </Card.Root>
</div>

<!-- Delete Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Excluir tarefa?</AlertDialog.Title>
            <AlertDialog.Description>
                Você está prestes a excluir a tarefa <strong>"{taskToDelete?.title}"</strong>.
                Esta ação não pode ser desfeita.
            </AlertDialog.Description>
        </AlertDialog.Header>
        {#if form?.error}
            <div class="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {form.error}
            </div>
        {/if}
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            <form
                method="POST"
                action="?/deleteTask"
                use:enhance={() => {
                    return async ({ result, update }) => {
                        await update({ reset: false });
                        if (result.type === 'success') {
                            deleteDialogOpen = false;
                            taskToDelete = null;
                        }
                    };
                }}
            >
                <input type="hidden" name="taskId" value={taskToDelete?.id || ''} />
                <Button type="submit" variant="destructive">
                    Excluir
                </Button>
            </form>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

<!-- Archived Tasks Section -->
<div class="mt-6">
    <button
        type="button"
        class="flex w-full items-center justify-between rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
        onclick={() => showArchived = !showArchived}
    >
        <div class="flex items-center gap-2">
            <Archive class="size-4" />
            <span class="font-medium">Tarefas Arquivadas</span>
            {#if data.deletedTasks.length > 0}
                <span class="rounded-full bg-muted px-2 py-0.5 text-xs">{data.deletedTasks.length}</span>
            {/if}
        </div>
        <span class="text-xs">{showArchived ? 'Ocultar' : 'Mostrar'}</span>
    </button>

    {#if showArchived}
        <Card.Root class="mt-2 border-dashed">
            <Card.Content class="pt-4">
                {#if data.deletedTasks.length === 0}
                    <p class="py-6 text-center text-sm text-muted-foreground">Nenhuma tarefa arquivada</p>
                {:else}
                    <div class="rounded-md border">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="bg-muted/30">
                                    <Table.Head class="w-[50px]">ID</Table.Head>
                                    <Table.Head>Título</Table.Head>
                                    <Table.Head class="hidden md:table-cell">Criado por</Table.Head>
                                    <Table.Head class="hidden sm:table-cell">Categoria</Table.Head>
                                    <Table.Head class="hidden sm:table-cell">Atribuições</Table.Head>
                                    <Table.Head class="hidden md:table-cell">Arquivado em</Table.Head>
                                    <Table.Head class="text-right">Ações</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each data.deletedTasks as task (task.id)}
                                    <Table.Row class="opacity-60 hover:opacity-100 transition-opacity">
                                        <Table.Cell class="text-muted-foreground">#{task.id}</Table.Cell>
                                        <Table.Cell>
                                            <span class="font-medium line-through text-muted-foreground">{task.title}</span>
                                        </Table.Cell>
                                        <Table.Cell class="hidden md:table-cell text-muted-foreground text-sm">
                                            {task.created_by_name}
                                        </Table.Cell>
                                        <Table.Cell class="hidden sm:table-cell text-muted-foreground text-sm">
                                            {task.category_name || '-'}
                                        </Table.Cell>
                                        <Table.Cell class="hidden sm:table-cell">
                                            <Badge variant="outline" class="text-xs border-muted">{task.assignment_count}</Badge>
                                        </Table.Cell>
                                        <Table.Cell class="hidden md:table-cell text-muted-foreground text-sm">
                                            {formatDate(task.deleted_at)}
                                        </Table.Cell>
                                        <Table.Cell class="text-right">
                                            <div class="flex items-center justify-end gap-1">
                                                <form method="POST" action="?/restoreTask" use:enhance={() => async ({ update }) => { await update(); }}>
                                                    <input type="hidden" name="taskId" value={task.id} />
                                                    <Button type="submit" variant="ghost" size="sm" class="h-7 text-xs gap-1.5">
                                                        <ArchiveRestore class="size-3.5" /> Restaurar
                                                    </Button>
                                                </form>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    class="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
                                                    onclick={() => openHardDeleteDialog({ id: task.id, title: task.title })}
                                                >
                                                    <Trash class="size-3.5" /> Excluir
                                                </Button>
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </div>
                    <p class="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                        <TriangleAlert class="size-3.5 shrink-0" />
                        Excluir permanentemente remove todos os dados relacionados (etapas, atribuições, histórico).
                    </p>
                {/if}
            </Card.Content>
        </Card.Root>
    {/if}
</div>

<!-- Hard Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={hardDeleteDialogOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Excluir permanentemente?</AlertDialog.Title>
            <AlertDialog.Description>
                Você está prestes a excluir <strong>"{taskToHardDelete?.title}"</strong> permanentemente.
                Todos os dados relacionados — etapas, atribuições e histórico de progresso — serão apagados para sempre.
                Esta ação é irreversível.
            </AlertDialog.Description>
        </AlertDialog.Header>
        {#if hardDeleteDialogOpen && (form as any)?.error}
            <div class="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {form?.error}
            </div>
        {/if}
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            <form
                method="POST"
                action="?/hardDeleteTask"
                use:enhance={() => {
                    return async ({ result, update }) => {
                        await update({ reset: false });
                        if (result.type === 'success') {
                            hardDeleteDialogOpen = false;
                            taskToHardDelete = null;
                        }
                    };
                }}
            >
                <input type="hidden" name="taskId" value={taskToHardDelete?.id || ''} />
                <Button type="submit" variant="destructive">
                    Excluir Permanentemente
                </Button>
            </form>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
