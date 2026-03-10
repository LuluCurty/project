<script lang="ts">
    import {
        Search, ArrowLeft, ChevronLeft, ChevronRight, LoaderCircle as Loader2,
        Trash, Clock, CalendarClock, CircleCheckBig as CheckCircle, TriangleAlert as AlertTriangle,
        Users, ClipboardList, EllipsisVertical, CalendarDays, UserPlus, Funnel as Filter, Pencil
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { enhance } from '$app/forms';

    import * as Table from '$lib/components/ui/table/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import * as Select from '$lib/components/ui/select/';
    import { Button } from '$lib/components/ui/button/index.js';
    import { buttonVariants } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/';
    import { Label } from '$lib/components/ui/label/';
    import * as Pagination from '$lib/components/ui/pagination/index.js';
    import * as AlertDialog from '$lib/components/ui/alert-dialog';
    import * as Dialog from '$lib/components/ui/dialog';

    import type { PageProps } from './$types';

    let { data }: PageProps = $props();

    let assignments = $derived(data.assignments ?? []);
    let forms = $derived(data.forms ?? []);
    let selectedFormId = $derived(data.selectedFormId ?? 0);
    let stats = $derived(data.stats ?? { total: 0, pending: 0, completed: 0, overdue: 0 });
    let pagination = $derived(data.pagination ?? { page: 1, limit: 15, totalItems: 0, totalPages: 1 });

    let activeStatus = $derived(page.url.searchParams.get('status') || 'all');

    let selectedFormTitle = $derived(
        selectedFormId ? forms.find((f: any) => f.id === selectedFormId)?.title ?? '' : ''
    );

    let deleteDialogOpen = $state(false);
    let assignmentToDelete = $state<{ id: number; userName: string; formTitle: string } | null>(null);

    let dueDateDialogOpen = $state(false);
    let assignmentToEdit = $state<{ id: number; userName: string; dueDate: string } | null>(null);

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

    function setStatusFilter(status: string) {
        const url = new URL(page.url);
        url.searchParams.set('status', status);
        url.searchParams.set('page', '1');
        goto(url.toString(), { noScroll: true });
    }

    function setFormFilter(formId: string) {
        const url = new URL(page.url);
        if (formId && formId !== 'all') {
            url.searchParams.set('formId', formId);
        } else {
            url.searchParams.delete('formId');
        }
        url.searchParams.set('page', '1');
        goto(url.toString(), { noScroll: true });
    }

    function formatDate(dateString: Date | string | null) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-br', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function formatDateForInput(dateString: Date | string | null): string {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toISOString().split('T')[0];
    }

    function isOverdue(assignment: any): boolean {
        return !assignment.is_completed && assignment.due_date && new Date(assignment.due_date) < new Date();
    }

    function getStatusBadge(assignment: any) {
        if (assignment.is_completed) return { label: 'Concluído', variant: 'default' as const, class: 'bg-green-100 text-green-800' };
        if (isOverdue(assignment)) return { label: 'Atrasado', variant: 'destructive' as const, class: '' };
        return { label: 'Pendente', variant: 'secondary' as const, class: 'bg-yellow-100 text-yellow-800' };
    }

    function openDeleteDialog(a: any) {
        assignmentToDelete = { id: a.id, userName: a.user_name, formTitle: a.form_title };
        deleteDialogOpen = true;
    }

    function openDueDateDialog(a: any) {
        assignmentToEdit = { id: a.id, userName: a.user_name, dueDate: formatDateForInput(a.due_date) };
        dueDateDialogOpen = true;
    }
</script>

<div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div class="flex items-center gap-4">
            <Button variant="ghost" size="icon" onclick={() => goto('/forms/manage')}>
                <ArrowLeft class="size-5" />
            </Button>
            <div>
                <h2 class="text-2xl font-bold tracking-tight text-primary">Gerenciar Atribuições</h2>
                <p class="text-muted-foreground">Acompanhe, edite prazos e gerencie as atribuições de formulários</p>
            </div>
        </div>
        {#if selectedFormId}
            <Button onclick={() => goto(`/forms/manage/${selectedFormId}/assign`)}>
                <UserPlus class="mr-2 size-4" /> Atribuir Formulário
            </Button>
        {/if}
    </div>

    <!-- Stats -->
    <div class="grid gap-4 grid-cols-2 md:grid-cols-4">
        <button class="text-left" onclick={() => setStatusFilter('all')}>
            <Card.Root class="{activeStatus === 'all' ? 'ring-2 ring-primary' : ''} transition-shadow hover:shadow-md cursor-pointer">
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
        </button>
        <button class="text-left" onclick={() => setStatusFilter('pending')}>
            <Card.Root class="{activeStatus === 'pending' ? 'ring-2 ring-yellow-500' : ''} transition-shadow hover:shadow-md cursor-pointer">
                <Card.Content class="pt-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Pendentes</p>
                            <p class="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                        </div>
                        <Clock class="size-8 text-yellow-600/50" />
                    </div>
                </Card.Content>
            </Card.Root>
        </button>
        <button class="text-left" onclick={() => setStatusFilter('completed')}>
            <Card.Root class="{activeStatus === 'completed' ? 'ring-2 ring-green-500' : ''} transition-shadow hover:shadow-md cursor-pointer">
                <Card.Content class="pt-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Concluídos</p>
                            <p class="text-2xl font-bold text-green-600">{stats.completed}</p>
                        </div>
                        <CheckCircle class="size-8 text-green-600/50" />
                    </div>
                </Card.Content>
            </Card.Root>
        </button>
        <button class="text-left" onclick={() => setStatusFilter('overdue')}>
            <Card.Root class="{activeStatus === 'overdue' ? 'ring-2 ring-red-500' : ''} transition-shadow hover:shadow-md cursor-pointer">
                <Card.Content class="pt-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-muted-foreground">Atrasados</p>
                            <p class="text-2xl font-bold text-red-600">{stats.overdue}</p>
                        </div>
                        <AlertTriangle class="size-8 text-red-600/50" />
                    </div>
                </Card.Content>
            </Card.Root>
        </button>
    </div>

    <!-- Tabela -->
    <Card.Root>
        <Card.Header class="pb-3">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div class="relative w-full max-w-sm">
                    <Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nome, email ou período..."
                        class="w-full pl-9"
                        oninput={handleSearchInput}
                        defaultValue={page.url.searchParams.get('search') || ''}
                    />
                </div>
                <Select.Root
                    type="single"
                    value={selectedFormId ? selectedFormId.toString() : 'all'}
                    onValueChange={(v) => setFormFilter(v)}
                >
                    <Select.Trigger class="w-full sm:w-[220px]">
                        <Filter class="mr-2 size-4 shrink-0 text-muted-foreground" />
                        <span class="truncate">{selectedFormTitle || 'Todos os formulários'}</span>
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="all">Todos os formulários</Select.Item>
                        {#each forms as form}
                            <Select.Item value={form.id.toString()}>{form.title}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>
        </Card.Header>

        <Card.Content>
            <div class="rounded-md border">
                <Table.Root>
                    <Table.Header>
                        <Table.Row class="bg-muted/50">
                            <Table.Head>Usuário</Table.Head>
                            <Table.Head class="hidden sm:table-cell">Formulário</Table.Head>
                            <Table.Head class="hidden md:table-cell">Período</Table.Head>
                            <Table.Head class="hidden md:table-cell">Prazo</Table.Head>
                            <Table.Head class="text-center">Status</Table.Head>
                            <Table.Head class="hidden lg:table-cell">Atribuído por</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if assignments.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={7} class="h-24 text-center text-muted-foreground">
                                    <div class="flex flex-col items-center gap-2">
                                        <Users class="size-10 text-muted-foreground/50" />
                                        <p>Nenhuma atribuição encontrada</p>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each assignments as assignment (assignment.id)}
                                {@const statusBadge = getStatusBadge(assignment)}
                                <Table.Row class="hover:bg-muted {isOverdue(assignment) ? 'bg-destructive/5' : ''}">
                                    <Table.Cell>
                                        <div class="flex flex-col">
                                            <span class="font-medium">{assignment.user_name}</span>
                                            <span class="text-xs text-muted-foreground hidden sm:block">{assignment.user_email}</span>
                                            <!-- Mobile: mostra formulário aqui -->
                                            <span class="text-xs text-muted-foreground sm:hidden">{assignment.form_title}</span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell class="hidden sm:table-cell">
                                        <button
                                            class="text-left hover:underline cursor-pointer"
                                            onclick={() => goto(`/forms/manage/${assignment.form_id}`)}
                                        >
                                            <span class="font-medium text-sm">{assignment.form_title}</span>
                                        </button>
                                    </Table.Cell>
                                    <Table.Cell class="hidden md:table-cell">
                                        {#if assignment.period_reference}
                                            <Badge variant="outline">{assignment.period_reference}</Badge>
                                        {:else}
                                            <span class="text-muted-foreground">-</span>
                                        {/if}
                                    </Table.Cell>
                                    <Table.Cell class="hidden md:table-cell">
                                        {#if assignment.due_date}
                                            <span class="text-sm {isOverdue(assignment) ? 'font-semibold text-red-600' : ''}">
                                                {formatDate(assignment.due_date)}
                                            </span>
                                        {:else}
                                            <span class="text-muted-foreground">Sem prazo</span>
                                        {/if}
                                    </Table.Cell>
                                    <Table.Cell class="text-center">
                                        <Badge class={statusBadge.class} variant={statusBadge.variant}>
                                            {statusBadge.label}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell class="hidden lg:table-cell text-sm text-muted-foreground">
                                        {assignment.assigned_by_name}
                                    </Table.Cell>
                                    <Table.Cell class="text-right">
                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger
                                                class={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' size-8'}
                                            >
                                                <EllipsisVertical class="size-4" />
                                                <span class="sr-only">Abrir menu</span>
                                            </DropdownMenu.Trigger>

                                            <DropdownMenu.Content align="end">
                                                <DropdownMenu.Label>Ações</DropdownMenu.Label>
                                                <DropdownMenu.Separator />

                                                <DropdownMenu.Item onclick={() => goto(`/forms/manage/${assignment.form_id}/assign`)}>
                                                    <UserPlus class="mr-2 size-4" /> Atribuir Formulário
                                                </DropdownMenu.Item>

                                                {#if Number(assignment.has_response) > 0}
                                                    <DropdownMenu.Item onclick={() => goto(`/forms/manage/${assignment.form_id}/responses`)}>
                                                        <CheckCircle class="mr-2 size-4" /> Ver Resposta
                                                    </DropdownMenu.Item>
                                                {/if}

                                                {#if !assignment.is_completed}
                                                    <DropdownMenu.Item onclick={() => goto(`/forms/manage/assignment/edit/${assignment.id}`)}>
                                                        <Pencil class="mr-2 size-4" /> Editar Atribuição
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Item onclick={() => openDueDateDialog(assignment)}>
                                                        <CalendarDays class="mr-2 size-4" />
                                                        {assignment.due_date ? 'Alterar Prazo' : 'Definir Prazo'}
                                                    </DropdownMenu.Item>
                                                {/if}

                                                <DropdownMenu.Separator />

                                                <DropdownMenu.Item
                                                    class="text-destructive focus:text-destructive"
                                                    onclick={() => openDeleteDialog(assignment)}
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
                                    <ChevronLeft class="size-4" />
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
                                                handlePageChange(p.value.toString());
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

<!-- Dialog: Excluir Atribuição -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Excluir atribuição?</AlertDialog.Title>
            <AlertDialog.Description>
                Você está prestes a excluir a atribuição de <strong>{assignmentToDelete?.userName}</strong>
                no formulário <strong>"{assignmentToDelete?.formTitle}"</strong>.
                Esta ação não pode ser desfeita.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            <form
                action="?/delete"
                method="POST"
                use:enhance={() => {
                    return async ({ result, update }) => {
                        if (result.type === 'success') {
                            deleteDialogOpen = false;
                            await update();
                        }
                    };
                }}
            >
                <input type="hidden" name="id" value={assignmentToDelete?.id} />
                <Button type="submit" variant="destructive">Excluir</Button>
            </form>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

<!-- Dialog: Alterar Prazo -->
<Dialog.Root bind:open={dueDateDialogOpen}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Alterar Prazo</Dialog.Title>
            <Dialog.Description>
                Defina o novo prazo para <strong>{assignmentToEdit?.userName}</strong>.
            </Dialog.Description>
        </Dialog.Header>
        <form
            action="?/updateDueDate"
            method="POST"
            use:enhance={() => {
                return async ({ result, update }) => {
                    if (result.type === 'success') {
                        dueDateDialogOpen = false;
                        await update();
                    }
                };
            }}
        >
            <input type="hidden" name="id" value={assignmentToEdit?.id} />
            <div class="space-y-4 py-4">
                <div class="space-y-2">
                    <Label for="due_date">Novo prazo</Label>
                    <Input
                        id="due_date"
                        name="due_date"
                        type="date"
                        value={assignmentToEdit?.dueDate || ''}
                    />
                    <p class="text-xs text-muted-foreground">Deixe vazio para remover o prazo.</p>
                </div>
            </div>
            <Dialog.Footer>
                <Button type="button" variant="outline" onclick={() => (dueDateDialogOpen = false)}>
                    Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>
