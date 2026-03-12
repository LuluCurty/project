<script lang="ts">
    import {
        ListTodo, ClipboardList, Clock, CircleCheck as CheckCircle2,
        Plus, Calendar, ArrowRight, Tag,
        ChevronLeft, ChevronRight,
        ListChecks, Target, Trash2, History, ChevronDown
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { enhance } from '$app/forms';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Input } from '$lib/components/ui/input';
    import { Separator } from '$lib/components/ui/separator';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Label } from '$lib/components/ui/label';
    import * as Select from '$lib/components/ui/select';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as Tabs from '$lib/components/ui/tabs';
    import * as Pagination from '$lib/components/ui/pagination';

    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let isCreating = $state(false);
    let dialogOpen = $state(false);

    // New task form state
    let newTitle = $state('');
    let newDescription = $state('');
    let newPriority = $state('medium');
    let newDueDate = $state('');
    let newCategoryId = $state('');
    let newSteps = $state<Array<{ title: string; step_order: number }>>([]);
    let newStepTitle = $state('');

    function resetForm() {
        newTitle = '';
        newDescription = '';
        newPriority = 'medium';
        newDueDate = '';
        newCategoryId = '';
        newSteps = [];
        newStepTitle = '';
    }

    function addNewStep() {
        if (!newStepTitle.trim() || newSteps.length >= 5) return;
        newSteps = [...newSteps, { title: newStepTitle.trim(), step_order: newSteps.length + 1 }];
        newStepTitle = '';
    }

    function removeNewStep(index: number) {
        newSteps = newSteps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 }));
    }

    function handleTabChange(value: string) {
        const url = new URL(page.url);
        url.searchParams.set('tab', value);
        url.searchParams.set('filter', value === 'personal' ? 'active' : 'pending');
        url.searchParams.set('page', '1');
        goto(url.toString());
    }

    function handleFilterChange(value: string) {
        const url = new URL(page.url);
        url.searchParams.set('filter', value);
        url.searchParams.set('page', '1');
        goto(url.toString());
    }

    function handlePageChange(newPage: string) {
        const url = new URL(page.url);
        url.searchParams.set('page', newPage);
        goto(url.toString());
    }

    function isOverdue(dateString: string | null) {
        if (!dateString) return false;
        const due = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return due < today;
    }

    function formatDate(date: string | null) {
        if (!date) return 'Sem prazo';
        return new Date(date).toLocaleDateString('pt-BR');
    }

    function priorityColor(priority: string) {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-700';
            case 'high': return 'bg-orange-100 text-orange-700';
            case 'medium': return 'bg-blue-100 text-blue-700';
            case 'low': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-600';
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

    function statusBorderColor(status: string, dueDate: string | null) {
        if (status === 'completed') return 'border-l-green-500';
        if (isOverdue(dueDate)) return 'border-l-red-500';
        if (status === 'in_progress') return 'border-l-yellow-500';
        return 'border-l-blue-500';
    }

    function statusLabel(status: string) {
        switch (status) {
            case 'pending': return 'Pendente';
            case 'in_progress': return 'Em Progresso';
            case 'completed': return 'Concluído';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    }

    function statusBadgeClass(status: string, dueDate: string | null) {
        if (status === 'completed') return 'bg-green-100 text-green-700 hover:bg-green-100 border-none';
        if (isOverdue(dueDate)) return '';
        if (status === 'in_progress') return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none';
        return 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-none';
    }

    function formatDateTime(date: string | null) {
        if (!date) return '—';
        return new Date(date).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // Track which assignment cards have history expanded
    let expandedHistory = $state<Set<number>>(new Set());
    function toggleHistory(assignmentId: number) {
        const next = new Set(expandedHistory);
        if (next.has(assignmentId)) next.delete(assignmentId);
        else next.add(assignmentId);
        expandedHistory = next;
    }
</script>

<div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h2 class="text-2xl font-bold tracking-tight text-primary">Minhas Tarefas</h2>
            <p class="text-muted-foreground">Gerencie suas tarefas pessoais e acompanhe as atribuídas.</p>
        </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Pessoais</p>
                        <p class="text-2xl font-bold">{data.stats.personalActive}</p>
                    </div>
                    <ListTodo class="size-8 text-muted-foreground/50" />
                </div>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Concluídas</p>
                        <p class="text-2xl font-bold text-green-600">{data.stats.personalCompleted}</p>
                    </div>
                    <CheckCircle2 class="size-8 text-green-600/50" />
                </div>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Atribuídas</p>
                        <p class="text-2xl font-bold text-blue-600">{data.stats.assignedPending}</p>
                    </div>
                    <ClipboardList class="size-8 text-blue-600/50" />
                </div>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">Finalizadas</p>
                        <p class="text-2xl font-bold text-gray-500">{data.stats.assignedCompleted}</p>
                    </div>
                    <Target class="size-8 text-gray-400/50" />
                </div>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Tabs -->
    <Tabs.Root value={data.tab} onValueChange={handleTabChange} class="w-full">
        <Tabs.List>
            <Tabs.Trigger value="personal" class="flex gap-2">
                <ListTodo class="size-4" /> Pessoais
            </Tabs.Trigger>
            <Tabs.Trigger value="assigned" class="flex gap-2">
                <ClipboardList class="size-4" /> Atribuídas
            </Tabs.Trigger>
        </Tabs.List>
    </Tabs.Root>

    <!-- ==================== -->
    <!-- TAB: PERSONAL TASKS  -->
    <!-- ==================== -->
    {#if data.tab === 'personal'}
        <Card.Root>
            <Card.Header class="pb-3">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Card.Title class="flex items-center gap-2 text-base">
                        <ListChecks class="size-4" /> Lista de Tarefas
                    </Card.Title>
                    <div class="flex items-center gap-2">
                        <Button
                            variant={data.filter === 'active' ? 'default' : 'outline'}
                            size="sm"
                            onclick={() => handleFilterChange('active')}
                        >
                            <Clock class="mr-1.5 size-3.5" /> <span class="hidden xs:inline">Ativas</span>
                        </Button>
                        <Button
                            variant={data.filter === 'completed' ? 'default' : 'outline'}
                            size="sm"
                            onclick={() => handleFilterChange('completed')}
                        >
                            <CheckCircle2 class="mr-1.5 size-3.5" /> <span class="hidden xs:inline">Concluídas</span>
                        </Button>
                        <Button size="icon" class="sm:hidden shrink-0" onclick={() => { resetForm(); dialogOpen = true; }}>
                            <Plus class="size-4" />
                        </Button>
                        <Button size="sm" class="hidden sm:inline-flex" onclick={() => { resetForm(); dialogOpen = true; }}>
                            <Plus class="mr-1.5 size-3.5" /> Nova Tarefa
                        </Button>
                    </div>
                </div>
            </Card.Header>

            <Card.Content class="space-y-4">
                <!-- Task List -->
                {#if data.personalTasks.length === 0}
                    <div class="flex flex-col items-center justify-center py-12">
                        <div class="mb-4 rounded-full bg-muted p-4">
                            {#if data.filter === 'active'}
                                <CheckCircle2 class="size-8 text-green-500" />
                            {:else}
                                <ListTodo class="size-8 text-muted-foreground" />
                            {/if}
                        </div>
                        <h3 class="text-lg font-semibold">
                            {#if data.filter === 'active'}
                                Tudo limpo!
                            {:else}
                                Nenhuma tarefa concluída
                            {/if}
                        </h3>
                        <p class="max-w-xs text-center text-sm text-muted-foreground">
                            {#if data.filter === 'active'}
                                Você não tem tarefas pendentes. Use o campo acima para criar uma nova.
                            {:else}
                                Suas tarefas concluídas aparecerão aqui.
                            {/if}
                        </p>
                    </div>
                {:else}
                    <div class="rounded-md border">
                        <div class="divide-y">
                            {#each data.personalTasks as task (task.id)}
                                {@const completed = task.status === 'completed'}
                                {@const overdue = !completed && isOverdue(task.due_date)}
                                {@const totalSteps = Number(task.total_steps)}
                                {@const completedSteps = Number(task.completed_steps)}
                                <button
                                    class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer"
                                    onclick={() => goto(`/tasks/${task.id}`)}
                                >
                                    <!-- Status indicator -->
                                    <div class="flex shrink-0 items-center">
                                        {#if completed}
                                            <CheckCircle2 class="size-5 text-green-500" />
                                        {:else if task.status === 'in_progress'}
                                            <Clock class="size-5 text-yellow-500" />
                                        {:else}
                                            <div class="size-5 rounded-full border-2 border-muted-foreground/30"></div>
                                        {/if}
                                    </div>

                                    <!-- Task info -->
                                    <div class="min-w-0 flex-1">
                                        <p class="truncate text-sm font-medium {completed ? 'text-muted-foreground line-through' : ''}">
                                            {task.title}
                                        </p>
                                        <div class="mt-0.5 flex flex-wrap items-center gap-2">
                                            {#if totalSteps > 0}
                                                <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <span class="flex h-1 w-10 rounded-full bg-muted overflow-hidden">
                                                        <span class="h-full rounded-full bg-primary transition-all" style="width: {Math.round((completedSteps / totalSteps) * 100)}%"></span>
                                                    </span>
                                                    {completedSteps}/{totalSteps}
                                                </span>
                                            {/if}
                                            {#if task.due_date}
                                                <span class="flex items-center gap-1 text-xs {overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}">
                                                    <Calendar class="size-3" />
                                                    {formatDate(task.due_date)}
                                                </span>
                                            {/if}
                                            {#if task.category_name}
                                                <Badge variant="outline" class="h-5 px-1.5 text-[10px]">
                                                    <Tag class="mr-0.5 size-2.5" /> {task.category_name}
                                                </Badge>
                                            {/if}
                                        </div>
                                    </div>

                                    <!-- Priority -->
                                    <Badge class="hidden shrink-0 border-none text-[10px] sm:flex {priorityColor(task.priority)}">
                                        {priorityLabel(task.priority)}
                                    </Badge>

                                    <!-- Arrow -->
                                    <ArrowRight class="size-4 shrink-0 text-muted-foreground/50" />
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>

    <!-- ==================== -->
    <!-- TAB: ASSIGNED TASKS  -->
    <!-- ==================== -->
    {:else}
        <!-- Filter buttons -->
        <div class="flex gap-2">
            <Button
                variant={data.filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onclick={() => handleFilterChange('pending')}
            >
                <Clock class="mr-1.5 size-3.5" /> Pendentes
            </Button>
            <Button
                variant={data.filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onclick={() => handleFilterChange('completed')}
            >
                <CheckCircle2 class="mr-1.5 size-3.5" /> Concluídas
            </Button>
        </div>

        {#if data.assignedTasks.length === 0}
            <div class="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                <div class="mb-4 rounded-full bg-muted p-4">
                    {#if data.filter === 'pending'}
                        <CheckCircle2 class="size-8 text-green-500" />
                    {:else}
                        <ClipboardList class="size-8 text-muted-foreground" />
                    {/if}
                </div>
                <h3 class="text-lg font-semibold">
                    {#if data.filter === 'pending'}
                        Nenhuma tarefa pendente
                    {:else}
                        Nenhuma tarefa concluída
                    {/if}
                </h3>
                <p class="max-w-xs text-center text-sm text-muted-foreground">
                    {#if data.filter === 'pending'}
                        Você não tem tarefas atribuídas pendentes no momento.
                    {:else}
                        Suas tarefas concluídas aparecerão aqui.
                    {/if}
                </p>
            </div>
        {:else}
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each data.assignedTasks as task (task.assignment_id)}
                    {@const overdue = task.status !== 'completed' && isOverdue(task.due_date)}
                    {@const totalSteps = Number(task.total_steps)}
                    {@const completedSteps = Number(task.completed_steps)}
                    {@const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0}

                    <Card.Root class="flex h-full flex-col border-l-4 transition-all hover:shadow-md {statusBorderColor(task.status, task.due_date)}">
                        <Card.Header class="pb-3">
                            <div class="flex items-start justify-between gap-2">
                                {#if task.category_name}
                                    <Badge variant="outline" class="font-mono text-xs">
                                        {task.category_name}
                                    </Badge>
                                {:else}
                                    <div></div>
                                {/if}
                                {#if overdue}
                                    <Badge variant="destructive">Atrasado</Badge>
                                {:else}
                                    <Badge class={statusBadgeClass(task.status, task.due_date)}>
                                        {statusLabel(task.status)}
                                    </Badge>
                                {/if}
                            </div>
                            <Card.Title class="mt-2 text-lg leading-tight">{task.title}</Card.Title>
                            <Card.Description class="mt-1 line-clamp-2 text-xs">
                                {task.description || 'Sem descrição'}
                            </Card.Description>
                        </Card.Header>

                        <Card.Content class="flex-1">
                            <Separator class="my-2" />
                            <div class="space-y-2 text-sm text-muted-foreground">
                                <!-- Progress bar -->
                                {#if totalSteps > 0}
                                    <div class="space-y-1">
                                        <div class="flex items-center justify-between text-xs">
                                            <span>Progresso</span>
                                            <span class="font-medium text-foreground">{completedSteps}/{totalSteps} etapas</span>
                                        </div>
                                        <div class="h-1.5 w-full rounded-full bg-muted">
                                            <div
                                                class="h-1.5 rounded-full bg-primary transition-all"
                                                style="width: {progressPct}%"
                                            ></div>
                                        </div>
                                    </div>
                                {/if}

                                <!-- Due date -->
                                <div class="flex items-center gap-2">
                                    <Calendar class="size-3.5" />
                                    <span>
                                        {#if task.status === 'completed'}
                                            Entregue em: <span class="font-medium text-foreground">{formatDate(task.completed_at)}</span>
                                        {:else}
                                            Prazo: <span class="font-medium {overdue ? 'text-red-600' : 'text-foreground'}">{formatDate(task.due_date)}</span>
                                        {/if}
                                    </span>
                                </div>

                                <!-- Assigned by -->
                                <div class="flex items-center gap-2 text-xs">
                                    <span class="rounded bg-muted px-1.5 py-0.5">
                                        Atribuído por: {task.assigned_by_name}
                                    </span>
                                </div>
                            </div>
                        </Card.Content>

                        <!-- History section (any task with past cycles) -->
                        {#if task.history?.length > 0}
                            <div class="border-t mx-0">
                                <button
                                    class="flex w-full items-center justify-between px-6 py-2.5 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
                                    onclick={(e) => { e.stopPropagation(); toggleHistory(task.assignment_id); }}
                                >
                                    <span class="flex items-center gap-1.5">
                                        <History class="size-3" />
                                        {task.history.length} {task.history.length === 1 ? 'ciclo anterior' : 'ciclos anteriores'}
                                    </span>
                                    <ChevronDown class="size-3.5 transition-transform {expandedHistory.has(task.assignment_id) ? 'rotate-180' : ''}" />
                                </button>

                                {#if expandedHistory.has(task.assignment_id)}
                                    <div class="border-t divide-y bg-muted/20">
                                        {#each task.history as h (h.cycle)}
                                            <div class="px-6 py-3 space-y-1.5">
                                                <div class="flex items-center justify-between">
                                                    <span class="text-xs font-medium text-purple-700 bg-purple-100 rounded px-1.5 py-0.5">
                                                        Ciclo {h.cycle}
                                                    </span>
                                                    <span class="text-xs text-green-700 font-medium">
                                                        Concluído: {formatDateTime(h.completed_at)}
                                                    </span>
                                                </div>
                                                {#if h.steps_snapshot?.length > 0}
                                                    <div class="space-y-1">
                                                        {#each h.steps_snapshot as s}
                                                            <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <CheckCircle2 class="size-3 shrink-0 text-green-500" />
                                                                <span class="flex-1 truncate">{s.title}</span>
                                                                <span class="shrink-0">{formatDateTime(s.completed_at)}</span>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/if}

                        <Card.Footer class="pt-2">
                            <Button
                                class="group w-full"
                                variant={task.status === 'completed' ? 'outline' : 'default'}
                                onclick={() => goto(`/tasks/assignment/${task.assignment_id}`)}
                            >
                                {task.status === 'completed' ? 'Ver Detalhes' : 'Continuar'}
                                <ArrowRight class="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </Card.Footer>
                    </Card.Root>
                {/each}
            </div>

            <!-- Pagination -->
            {#if data.pagination.totalItems > data.pagination.limit}
                <div class="mt-6 flex justify-center">
                    <Pagination.Root
                        count={data.pagination.totalItems}
                        perPage={data.pagination.limit}
                        page={data.pagination.page}
                    >
                        {#snippet children({ pages, currentPage })}
                            <Pagination.Content>
                                <Pagination.Item>
                                    <Pagination.PrevButton
                                        onclick={() => handlePageChange((currentPage - 1).toString())}
                                        disabled={currentPage <= 1}
                                    >
                                        <ChevronLeft class="size-4" />
                                        <span class="hidden sm:block">Anterior</span>
                                    </Pagination.PrevButton>
                                </Pagination.Item>

                                <span class="flex items-center px-4 text-sm text-muted-foreground">
                                    {currentPage} / {data.pagination.totalPages}
                                </span>

                                <Pagination.Item>
                                    <Pagination.NextButton
                                        onclick={() => handlePageChange((currentPage + 1).toString())}
                                        disabled={currentPage >= data.pagination.totalPages}
                                    >
                                        <span class="hidden sm:block">Próximo</span>
                                        <ChevronRight class="size-4" />
                                    </Pagination.NextButton>
                                </Pagination.Item>
                            </Pagination.Content>
                        {/snippet}
                    </Pagination.Root>
                </div>
            {/if}
        {/if}
    {/if}
</div>

<!-- Create Task Dialog -->
<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content class="sm:max-w-lg">
        <Dialog.Header>
            <Dialog.Title>Nova Tarefa</Dialog.Title>
            <Dialog.Description>Crie uma nova tarefa pessoal com todos os detalhes.</Dialog.Description>
        </Dialog.Header>

        <form
            method="POST"
            action="?/createPersonal"
            use:enhance={() => {
                isCreating = true;
                return async ({ result, update }) => {
                    isCreating = false;
                    if (result.type === 'success') {
                        dialogOpen = false;
                        resetForm();
                    }
                    await update();
                };
            }}
            class="space-y-4"
        >
            <div class="space-y-1.5">
                <Label for="new-title">Título *</Label>
                <Input id="new-title" name="title" placeholder="Ex: Revisar documentação..." bind:value={newTitle} required />
            </div>

            <div class="space-y-1.5">
                <Label for="new-desc">Descrição</Label>
                <Textarea id="new-desc" name="description" placeholder="Detalhes da tarefa..." bind:value={newDescription} rows={2} />
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <Label>Prioridade</Label>
                    <Select.Root type="single" value={newPriority} onValueChange={(v) => newPriority = v}>
                        <Select.Trigger class="w-full">
                            {priorityLabel(newPriority)}
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="low">Baixa</Select.Item>
                            <Select.Item value="medium">Média</Select.Item>
                            <Select.Item value="high">Alta</Select.Item>
                            <Select.Item value="urgent">Urgente</Select.Item>
                        </Select.Content>
                    </Select.Root>
                    <input type="hidden" name="priority" value={newPriority} />
                </div>
                <div class="space-y-1.5">
                    <Label for="new-due">Prazo</Label>
                    <Input id="new-due" type="date" name="due_date" bind:value={newDueDate} />
                </div>
            </div>

            <div class="space-y-1.5">
                <Label>Categoria</Label>
                <Select.Root type="single" value={newCategoryId} onValueChange={(v) => newCategoryId = v}>
                    <Select.Trigger class="w-full">
                        {data.categories.find((c: any) => String(c.id) === newCategoryId)?.name || 'Sem categoria'}
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="">Sem categoria</Select.Item>
                        {#each data.categories as cat (cat.id)}
                            <Select.Item value={String(cat.id)}>{cat.name}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
                <input type="hidden" name="category_id" value={newCategoryId} />
            </div>

            <!-- Steps -->
            <div class="space-y-2">
                <Label>Etapas <span class="text-muted-foreground font-normal">({newSteps.length}/5)</span></Label>
                {#if newSteps.length > 0}
                    <div class="rounded-md border divide-y">
                        {#each newSteps as step, i (i)}
                            <div class="flex items-center gap-2 px-3 py-2">
                                <span class="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary shrink-0">
                                    {step.step_order}
                                </span>
                                <span class="flex-1 text-sm">{step.title}</span>
                                <Button type="button" variant="ghost" size="icon" class="size-6 text-muted-foreground hover:text-red-600 shrink-0" onclick={() => removeNewStep(i)}>
                                    <Trash2 class="size-3" />
                                </Button>
                            </div>
                        {/each}
                    </div>
                {/if}
                {#if newSteps.length < 5}
                    <div class="flex gap-2">
                        <Input
                            placeholder="Nova etapa..."
                            bind:value={newStepTitle}
                            class="h-8 flex-1 text-sm"
                            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewStep(); } }}
                        />
                        <Button type="button" variant="outline" size="sm" class="h-8 text-xs" onclick={addNewStep} disabled={!newStepTitle.trim()}>
                            <Plus class="mr-1 size-3" /> Adicionar
                        </Button>
                    </div>
                {/if}
                <input type="hidden" name="steps" value={JSON.stringify(newSteps)} />
            </div>

            <Dialog.Footer>
                <Button type="button" variant="outline" onclick={() => dialogOpen = false}>Cancelar</Button>
                <Button type="submit" disabled={!newTitle.trim() || isCreating}>
                    {#if isCreating}
                        Criando...
                    {:else}
                        <Plus class="mr-2 size-4" /> Criar Tarefa
                    {/if}
                </Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>
