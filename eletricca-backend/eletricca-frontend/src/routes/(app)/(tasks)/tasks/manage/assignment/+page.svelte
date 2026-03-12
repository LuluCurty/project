<script lang="ts">
    import {
        Search, ArrowLeft, ClipboardList, Clock, CircleCheck as CheckCircle2,
        CircleAlert as AlertCircle, ChevronLeft, ChevronRight, EllipsisVertical,
        Trash, Users, Archive, ArchiveRestore, TriangleAlert, History, RefreshCw, Repeat
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { enhance } from '$app/forms';

    import * as Table from '$lib/components/ui/table';
    import * as Card from '$lib/components/ui/card';
    import { Badge } from '$lib/components/ui/badge';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import * as Pagination from '$lib/components/ui/pagination';
    import { buttonVariants } from '$lib/components/ui/button';
    import * as AlertDialog from '$lib/components/ui/alert-dialog';

    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let deleteDialogOpen = $state(false);
    let assignmentToDelete = $state<{ id: number; userName: string; taskTitle: string } | null>(null);

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

    function handleStatusFilter(status: string) {
        const url = new URL(page.url);
        url.searchParams.set('status', status);
        url.searchParams.set('page', '1');
        goto(url.toString());
    }

    function handlePageChange(newPage: string) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage);
        goto(url.toString(), { keepFocus: true });
    }

    function formatDate(dateString: string | null) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-br', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    }

    function formatDateTime(dateString: string | null) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function isOverdue(status: string, dueDate: string | null) {
        if (status === 'completed' || !dueDate) return false;
        return new Date(dueDate) < new Date();
    }

    // Was the task completed after the due date?
    function wasCompletedLate(dueDate: string | null, completedAt: string | null) {
        if (!dueDate || !completedAt) return false;
        return new Date(completedAt) > new Date(dueDate);
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

    function openDeleteDialog(a: any) {
        assignmentToDelete = { id: a.id, userName: a.user_name, taskTitle: a.task_title };
        deleteDialogOpen = true;
    }

    // Archived section state
    let showArchived = $state(false);
    let hardDeleteDialogOpen = $state(false);
    let assignmentToHardDelete = $state<{ id: number; userName: string; taskTitle: string } | null>(null);

    function openHardDeleteDialog(a: any) {
        assignmentToHardDelete = { id: a.id, userName: a.user_name, taskTitle: a.task_title };
        hardDeleteDialogOpen = true;
    }

    let resetDialogOpen = $state(false);
    let assignmentToReset = $state<{ id: number; userName: string; taskTitle: string; recurrenceRule: string } | null>(null);

    function openResetDialog(a: any) {
        assignmentToReset = { id: a.id, userName: a.user_name, taskTitle: a.task_title, recurrenceRule: a.recurrence_rule };
        resetDialogOpen = true;
    }

    function recurrenceLabel(rule: string | null) {
        switch (rule) {
            case 'daily':     return 'Diária';
            case 'weekly':    return 'Semanal';
            case 'biweekly':  return 'Quinzenal';
            case 'monthly':   return 'Mensal';
            case 'quarterly': return 'Trimestral';
            case 'yearly':    return 'Anual';
            default: return rule ?? '';
        }
    }
</script>

<div class="space-y-4">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div class="flex items-center gap-4">
            <Button variant="ghost" size="icon" onclick={() => goto('/tasks/manage')}>
                <ArrowLeft class="size-5" />
            </Button>
            <div>
                <h2 class="text-2xl font-bold tracking-tight text-primary">Atribuições</h2>
                <p class="text-muted-foreground">Acompanhe o progresso de todas as atribuições</p>
            </div>
        </div>
    </div>

    <!-- Stats Cards (clickable filters) -->
    <div class="grid gap-4 grid-cols-2 md:grid-cols-4">
        <button class="text-left" onclick={() => handleStatusFilter('all')}>
            <Card.Root class="transition-all {data.statusFilter === 'all' ? 'ring-2 ring-primary' : 'hover:shadow-md'}">
                <Card.Content class="pt-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Total</p>
                            <p class="text-2xl font-bold">{data.stats.total}</p>
                        </div>
                        <ClipboardList class="size-8 text-muted-foreground/50" />
                    </div>
                </Card.Content>
            </Card.Root>
        </button>
        <button class="text-left" onclick={() => handleStatusFilter('pending')}>
            <Card.Root class="transition-all {data.statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : 'hover:shadow-md'}">
                <Card.Content class="pt-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Pendentes</p>
                            <p class="text-2xl font-bold text-yellow-600">{data.stats.pending}</p>
                        </div>
                        <Clock class="size-8 text-yellow-600/50" />
                    </div>
                </Card.Content>
            </Card.Root>
        </button>
        <button class="text-left" onclick={() => handleStatusFilter('completed')}>
            <Card.Root class="transition-all {data.statusFilter === 'completed' ? 'ring-2 ring-green-500' : 'hover:shadow-md'}">
                <Card.Content class="pt-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Concluídas</p>
                            <p class="text-2xl font-bold text-green-600">{data.stats.completed}</p>
                        </div>
                        <CheckCircle2 class="size-8 text-green-600/50" />
                    </div>
                </Card.Content>
            </Card.Root>
        </button>
        <button class="text-left" onclick={() => handleStatusFilter('overdue')}>
            <Card.Root class="transition-all {data.statusFilter === 'overdue' ? 'ring-2 ring-red-500' : 'hover:shadow-md'}">
                <Card.Content class="pt-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Atrasadas</p>
                            <p class="text-2xl font-bold text-red-600">{data.stats.overdue}</p>
                        </div>
                        <AlertCircle class="size-8 text-red-600/50" />
                    </div>
                </Card.Content>
            </Card.Root>
        </button>
    </div>

    <!-- Table -->
    <Card.Root>
        <Card.Header class="pb-3">
            <div class="flex items-center gap-2">
                <div class="relative w-full max-w-sm">
                    <Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por tarefa ou usuário..."
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
                            <Table.Head>Usuário</Table.Head>
                            <Table.Head>Tarefa</Table.Head>
                            <Table.Head class="text-center hidden sm:table-cell">Progresso</Table.Head>
                            <Table.Head class="text-center hidden md:table-cell">Prioridade</Table.Head>
                            <Table.Head class="hidden md:table-cell">Prazo</Table.Head>
                            <Table.Head class="hidden lg:table-cell">Atribuído em</Table.Head>
                            <Table.Head class="text-center hidden lg:table-cell">Ciclos</Table.Head>
                            <Table.Head class="text-center">Status</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if data.assignments.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={9} class="h-24 text-center text-muted-foreground">
                                    <div class="flex flex-col items-center gap-2">
                                        <Users class="size-10 text-muted-foreground/50" />
                                        <p>Nenhuma atribuição encontrada</p>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each data.assignments as a (a.id)}
                                {@const overdue = isOverdue(a.status, a.due_date)}
                                {@const completedLate = a.status === 'completed' && wasCompletedLate(a.due_date, a.completed_at)}
                                {@const progressPct = a.total_steps > 0 ? Math.round((a.completed_steps / a.total_steps) * 100) : 0}
                                <Table.Row class="hover:bg-muted/50">
                                    <Table.Cell>
                                        <div class="flex flex-col">
                                            <span class="font-medium text-sm">{a.user_name}</span>
                                            <span class="text-xs text-muted-foreground hidden lg:block">{a.user_email}</span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div class="flex flex-col gap-0.5">
                                            <span class="text-sm truncate max-w-[200px] block">{a.task_title}</span>
                                            {#if a.is_recurring}
                                                <span class="inline-flex items-center gap-1 text-xs text-purple-600">
                                                    <Repeat class="size-3" />{recurrenceLabel(a.recurrence_rule)}
                                                </span>
                                            {/if}
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell class="text-center hidden sm:table-cell">
                                        <div class="flex items-center gap-2 justify-center">
                                            <div class="h-1.5 w-16 rounded-full bg-muted">
                                                <div class="h-1.5 rounded-full bg-primary transition-all" style="width: {progressPct}%"></div>
                                            </div>
                                            <span class="text-xs text-muted-foreground">{a.completed_steps}/{a.total_steps}</span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell class="text-center hidden md:table-cell">
                                        <Badge class={priorityColor(a.priority)}>
                                            {priorityLabel(a.priority)}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell class="hidden md:table-cell text-sm {overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}">
                                        {formatDate(a.due_date)}
                                    </Table.Cell>
                                    <Table.Cell class="hidden lg:table-cell text-xs text-muted-foreground">
                                        {formatDateTime(a.assigned_at)}
                                    </Table.Cell>
                                    <Table.Cell class="text-center hidden lg:table-cell">
                                        {#if a.history_count > 0}
                                            <span class="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-100 rounded px-1.5 py-0.5">
                                                <History class="size-3" />{a.history_count}
                                            </span>
                                        {:else}
                                            <span class="text-xs text-muted-foreground/40">—</span>
                                        {/if}
                                    </Table.Cell>
                                    <Table.Cell class="text-center">
                                        {#if a.status === 'completed' && completedLate}
                                            <Badge class="bg-amber-100 text-amber-700 border-none whitespace-nowrap">
                                                <AlertCircle class="size-3 mr-1" />Concluído com atraso
                                            </Badge>
                                        {:else if a.status === 'completed'}
                                            <Badge class="bg-green-100 text-green-700 border-none">Concluído</Badge>
                                        {:else if overdue}
                                            <Badge variant="destructive">Atrasado</Badge>
                                        {:else if a.status === 'in_progress'}
                                            <Badge class="bg-yellow-100 text-yellow-700 border-none">Em Progresso</Badge>
                                        {:else}
                                            <Badge class="bg-blue-50 text-blue-700 border-none">Pendente</Badge>
                                        {/if}
                                    </Table.Cell>
                                    <Table.Cell class="text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                title="Remover atribuição"
                                                onclick={() => openDeleteDialog(a)}
                                            >
                                                <Trash class="size-4" />
                                            </Button>
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger
                                                    class={buttonVariants({ variant: "ghost", size: "icon"}) + " size-8"}
                                                >
                                                    <EllipsisVertical class="size-4" />
                                                </DropdownMenu.Trigger>
                                                <DropdownMenu.Content align="end">
                                                    <DropdownMenu.Label>Navegar</DropdownMenu.Label>
                                                    <DropdownMenu.Separator />
                                                    <DropdownMenu.Item onclick={() => goto(`/tasks/manage/assignment/${a.id}`)}>
                                                        Ver Progresso
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Item onclick={() => goto(`/tasks/manage/${a.task_id}`)}>
                                                        Ver Tarefa
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Separator />
                                                    <DropdownMenu.Item onclick={() => goto(`/tasks/manage/assignment/edit/${a.id}`)}>
                                                        Editar Atribuição
                                                    </DropdownMenu.Item>
                                                    {#if a.is_recurring && a.status === 'completed'}
                                                        <DropdownMenu.Item class="text-purple-700 focus:text-purple-700 focus:bg-purple-50"
                                                                           onclick={() => openResetDialog(a)}>
                                                            <RefreshCw class="mr-2 size-3.5" />
                                                            Reiniciar Ciclo
                                                        </DropdownMenu.Item>
                                                    {/if}
                                                </DropdownMenu.Content>
                                            </DropdownMenu.Root>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>

            {#if data.pagination.totalItems > data.pagination.limit}
                <Pagination.Root count={data.pagination.totalItems} perPage={data.pagination.limit} page={data.pagination.page}>
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
                                    disabled={currentPage * data.pagination.limit >= data.pagination.totalItems}
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
            <AlertDialog.Title>Remover atribuição?</AlertDialog.Title>
            <AlertDialog.Description>
                Remover <strong>{assignmentToDelete?.userName}</strong> da tarefa
                <strong>"{assignmentToDelete?.taskTitle}"</strong>?
                O histórico de progresso ficará arquivado no sistema.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            <form
                method="POST"
                action="?/deleteAssignment"
                use:enhance={() => {
                    return async ({ update }) => {
                        deleteDialogOpen = false;
                        assignmentToDelete = null;
                        await update();
                    };
                }}
            >
                <input type="hidden" name="assignmentId" value={assignmentToDelete?.id || ''} />
                <Button type="submit" variant="destructive">Remover</Button>
            </form>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

<!-- Archived Assignments Section -->
<div class="mt-6">
    <button
        type="button"
        class="flex w-full items-center justify-between rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
        onclick={() => showArchived = !showArchived}
    >
        <div class="flex items-center gap-2">
            <Archive class="size-4" />
            <span class="font-medium">Atribuições Arquivadas</span>
            {#if data.deletedAssignments.length > 0}
                <span class="rounded-full bg-muted px-2 py-0.5 text-xs">{data.deletedAssignments.length}</span>
            {/if}
        </div>
        <span class="text-xs">{showArchived ? 'Ocultar' : 'Mostrar'}</span>
    </button>

    {#if showArchived}
        <Card.Root class="mt-2 border-dashed">
            <Card.Content class="pt-4">
                {#if data.deletedAssignments.length === 0}
                    <p class="py-6 text-center text-sm text-muted-foreground">Nenhuma atribuição arquivada</p>
                {:else}
                    <div class="rounded-md border">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="bg-muted/30">
                                    <Table.Head>Usuário</Table.Head>
                                    <Table.Head>Tarefa</Table.Head>
                                    <Table.Head class="hidden sm:table-cell">Progresso</Table.Head>
                                    <Table.Head class="hidden md:table-cell">Atribuído em</Table.Head>
                                    <Table.Head class="hidden md:table-cell">Arquivado em</Table.Head>
                                    <Table.Head class="text-right">Ações</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each data.deletedAssignments as a (a.id)}
                                    <Table.Row class="opacity-60 hover:opacity-100 transition-opacity">
                                        <Table.Cell>
                                            <p class="font-medium text-sm line-through text-muted-foreground">{a.user_name}</p>
                                            <p class="text-xs text-muted-foreground hidden lg:block">{a.user_email}</p>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span class="text-sm text-muted-foreground truncate max-w-[180px] block">{a.task_title}</span>
                                        </Table.Cell>
                                        <Table.Cell class="hidden sm:table-cell">
                                            <span class="text-xs text-muted-foreground">{a.completed_steps}/{a.total_steps} etapas</span>
                                        </Table.Cell>
                                        <Table.Cell class="hidden md:table-cell text-xs text-muted-foreground">
                                            {formatDateTime(a.assigned_at)}
                                        </Table.Cell>
                                        <Table.Cell class="hidden md:table-cell text-xs text-muted-foreground">
                                            {formatDateTime(a.deleted_at)}
                                        </Table.Cell>
                                        <Table.Cell class="text-right">
                                            <div class="flex items-center justify-end gap-1">
                                                <form method="POST" action="?/restoreAssignment" use:enhance={() => async ({ update }) => { await update(); }}>
                                                    <input type="hidden" name="assignmentId" value={a.id} />
                                                    <Button type="submit" variant="ghost" size="sm" class="h-7 text-xs gap-1.5">
                                                        <ArchiveRestore class="size-3.5" /> Restaurar
                                                    </Button>
                                                </form>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    class="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
                                                    onclick={() => openHardDeleteDialog(a)}
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
                        Excluir permanentemente remove todo o histórico de progresso desta atribuição.
                    </p>
                {/if}
            </Card.Content>
        </Card.Root>
    {/if}
</div>

<!-- Hard Delete Assignment Confirmation Dialog -->
<AlertDialog.Root bind:open={hardDeleteDialogOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Excluir permanentemente?</AlertDialog.Title>
            <AlertDialog.Description>
                Você está prestes a excluir permanentemente a atribuição de
                <strong>{assignmentToHardDelete?.userName}</strong> na tarefa
                <strong>"{assignmentToHardDelete?.taskTitle}"</strong>.
                Todo o histórico de progresso será apagado para sempre. Esta ação é irreversível.
            </AlertDialog.Description>
        </AlertDialog.Header>
        {#if hardDeleteDialogOpen && (form as any)?.error}
            <div class="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {(form as any).error}
            </div>
        {/if}
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            <form
                method="POST"
                action="?/hardDeleteAssignment"
                use:enhance={() => {
                    return async ({ result, update }) => {
                        await update({ reset: false });
                        if (result.type === 'success') {
                            hardDeleteDialogOpen = false;
                            assignmentToHardDelete = null;
                        }
                    };
                }}
            >
                <input type="hidden" name="assignmentId" value={assignmentToHardDelete?.id || ''} />
                <Button type="submit" variant="destructive">
                    Excluir Permanentemente
                </Button>
            </form>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

<!-- Reset Assignment (New Cycle) Confirmation Dialog -->
<AlertDialog.Root bind:open={resetDialogOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title class="flex items-center gap-2">
                <Repeat class="size-4 text-purple-600" />
                Reiniciar ciclo?
            </AlertDialog.Title>
            <AlertDialog.Description>
                O ciclo atual de <strong>{assignmentToReset?.userName}</strong> na tarefa
                <strong>"{assignmentToReset?.taskTitle}"</strong> será arquivado e a tarefa voltará
                ao status <em>pendente</em> para um novo ciclo
                {#if assignmentToReset?.recurrenceRule}
                    com prazo recalculado automaticamente ({recurrenceLabel(assignmentToReset.recurrenceRule)})
                {/if}.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            <form
                method="POST"
                action="?/resetAssignment"
                use:enhance={() => {
                    return async ({ update }) => {
                        resetDialogOpen = false;
                        assignmentToReset = null;
                        await update();
                    };
                }}
            >
                <input type="hidden" name="assignmentId" value={assignmentToReset?.id || ''} />
                <Button type="submit" class="bg-purple-600 hover:bg-purple-700 text-white">
                    <RefreshCw class="mr-2 size-4" />
                    Reiniciar Ciclo
                </Button>
            </form>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
