<script lang="ts">
    import {
        Search, ArrowLeft, ClipboardList, Clock, CircleCheck as CheckCircle2,
        CircleAlert as AlertCircle, ChevronLeft, ChevronRight, EllipsisVertical,
        Trash, Users
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

    function isOverdue(status: string, dueDate: string | null) {
        if (status === 'completed' || !dueDate) return false;
        return new Date(dueDate) < new Date();
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
                            <Table.Head class="text-center">Status</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if data.assignments.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={7} class="h-24 text-center text-muted-foreground">
                                    <div class="flex flex-col items-center gap-2">
                                        <Users class="size-10 text-muted-foreground/50" />
                                        <p>Nenhuma atribuição encontrada</p>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each data.assignments as a (a.id)}
                                {@const overdue = isOverdue(a.status, a.due_date)}
                                {@const progressPct = a.total_steps > 0 ? Math.round((a.completed_steps / a.total_steps) * 100) : 0}
                                <Table.Row class="hover:bg-muted/50">
                                    <Table.Cell>
                                        <div class="flex flex-col">
                                            <span class="font-medium text-sm">{a.user_name}</span>
                                            <span class="text-xs text-muted-foreground hidden lg:block">{a.user_email}</span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <span class="text-sm truncate max-w-[200px] block">{a.task_title}</span>
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
                                    <Table.Cell class="text-center">
                                        {#if a.status === 'completed'}
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
                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger
                                                class={buttonVariants({ variant: "ghost", size: "icon"}) + " size-8"}
                                            >
                                                <EllipsisVertical class="size-4" />
                                            </DropdownMenu.Trigger>
                                            <DropdownMenu.Content align="end">
                                                <DropdownMenu.Label>Ações</DropdownMenu.Label>
                                                <DropdownMenu.Separator />
                                                <DropdownMenu.Item onclick={() => goto(`/tasks/manage/assignment/${a.id}`)}>
                                                    Ver Progresso
                                                </DropdownMenu.Item>
                                                <DropdownMenu.Item onclick={() => goto(`/tasks/manage/${a.task_id}`)}>
                                                    Ver Tarefa
                                                </DropdownMenu.Item>
                                                <DropdownMenu.Separator />
                                                <DropdownMenu.Item
                                                    class="text-destructive focus:text-destructive"
                                                    onclick={() => openDeleteDialog(a)}
                                                >
                                                    <Trash class="mr-2 size-4" /> Remover
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
                O progresso do usuário nesta tarefa será perdido.
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
