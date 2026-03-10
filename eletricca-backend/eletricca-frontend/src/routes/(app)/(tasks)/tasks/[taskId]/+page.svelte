<script lang="ts">
    import {
        ArrowLeft, Calendar, Clock, CircleCheck as CheckCircle2,
        Tag, Plus, Trash2, GripVertical, Save,
        CircleAlert as AlertCircle, Pencil, X
    } from '@lucide/svelte';
    import { goto, invalidateAll } from '$app/navigation';
    import { enhance } from '$app/forms';

    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Input } from '$lib/components/ui/input';
    import { Separator } from '$lib/components/ui/separator';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import { Textarea } from '$lib/components/ui/textarea';
    import * as Select from '$lib/components/ui/select';
    import { Label } from '$lib/components/ui/label';

    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let task = $state(structuredClone(data.task));
    let isEditing = $state(false);
    let newStepTitle = $state('');

    // Re-sync when data changes (after form actions)
    $effect(() => {
        task = structuredClone(data.task);
    });

    // Contagem de steps
    let totalSteps = $derived(task.steps.length);
    let completedSteps = $derived(task.steps.filter((s: any) => s.is_completed).length);
    let progressPct = $derived(totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0);

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

    function formatDateTime(date: string | null) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
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

    function statusLabel(status: string) {
        switch (status) {
            case 'pending': return 'Pendente';
            case 'in_progress': return 'Em Progresso';
            case 'completed': return 'Concluído';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    }

    function statusBadgeClass(status: string) {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-none';
            case 'in_progress': return 'bg-yellow-100 text-yellow-700 border-none';
            case 'cancelled': return 'bg-gray-100 text-gray-500 border-none';
            default: return 'bg-blue-50 text-blue-700 border-none';
        }
    }

    function toggleStepLocal(stepId: number) {
        task.steps = task.steps.map((s: any) => {
            if (s.id === stepId) {
                return {
                    ...s,
                    is_completed: !s.is_completed,
                    completed_at: !s.is_completed ? new Date().toISOString() : null
                };
            }
            return s;
        });
    }

    function addStep() {
        if (!newStepTitle.trim() || task.steps.length >= 5) return;
        const nextOrder = task.steps.length + 1;
        task.steps = [...task.steps, {
            id: Date.now(),
            title: newStepTitle.trim(),
            step_order: nextOrder,
            is_completed: false,
            completed_at: null
        }];
        newStepTitle = '';
    }

    function removeStep(stepId: number) {
        task.steps = task.steps
            .filter((s: any) => s.id !== stepId)
            .map((s: any, i: number) => ({ ...s, step_order: i + 1 }));
    }
</script>

<div class="max-w-3xl mx-auto space-y-6 pb-20">
    <!-- Header -->
    <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" onclick={() => goto('/tasks')}>
            <ArrowLeft class="size-5" />
        </Button>
        <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3">
                <h1 class="text-2xl font-bold tracking-tight text-primary truncate">
                    {task.title}
                </h1>
                <Badge class={statusBadgeClass(task.status)}>
                    {statusLabel(task.status)}
                </Badge>
            </div>
            <p class="text-sm text-muted-foreground">
                Criada em {formatDate(task.created_at)}
                {#if task.category_name}
                    · <span class="inline-flex items-center gap-1"><Tag class="size-3" />{task.category_name}</span>
                {/if}
            </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            {#if !isEditing}
                <Button variant="outline" size="sm" onclick={() => isEditing = true}>
                    <Pencil class="mr-2 size-3.5" /> Editar
                </Button>
            {:else}
                <Button variant="ghost" size="sm" onclick={() => { task = structuredClone(data.task); isEditing = false; }}>
                    <X class="mr-2 size-3.5" /> Cancelar
                </Button>
                <button type="submit" form="updateTaskForm" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer">
                    <Save class="mr-1 size-3.5" /> Salvar
                </button>
            {/if}
        </div>
    </div>

    <!-- Status + Action buttons -->
    <div class="flex flex-wrap gap-2">
        <form method="POST" action="?/toggleComplete" use:enhance={() => {
            return async ({ update }) => {
                await update();
                isEditing = false;
            };
        }}>
            {#if task.status !== 'completed'}
                <Button type="submit" variant="outline" class="border-green-200 text-green-700 hover:bg-green-50">
                    <CheckCircle2 class="mr-2 size-4" /> Marcar como Concluída
                </Button>
            {:else}
                <Button type="submit" variant="outline" class="border-yellow-200 text-yellow-700 hover:bg-yellow-50">
                    <Clock class="mr-2 size-4" /> Reabrir Tarefa
                </Button>
            {/if}
        </form>
        <form method="POST" action="?/deleteTask" use:enhance={() => {
            return async ({ update }) => {
                await update();
            };
        }}>
            <Button type="submit" variant="outline" class="border-red-200 text-red-700 hover:bg-red-50">
                <Trash2 class="mr-2 size-4" /> Excluir
            </Button>
        </form>
    </div>

    <!-- Update Task Form (hidden, submitted by Save button) -->
    <form id="updateTaskForm" method="POST" action="?/updateTask" use:enhance={() => {
        return async ({ update }) => {
            await update();
            isEditing = false;
        };
    }}>
        <input type="hidden" name="title" value={task.title} />
        <input type="hidden" name="description" value={task.description || ''} />
        <input type="hidden" name="priority" value={task.priority} />
        <input type="hidden" name="status" value={task.status} />
        <input type="hidden" name="due_date" value={task.due_date?.split('T')[0] || ''} />
        <input type="hidden" name="category_id" value={task.category_id || ''} />
        <input type="hidden" name="steps" value={JSON.stringify(task.steps.map((s: any) => ({
            id: s.id,
            title: s.title,
            step_order: s.step_order,
            is_completed: s.is_completed
        })))} />
    </form>

    <!-- Details Card -->
    <Card.Root>
        <Card.Header>
            <Card.Title class="text-base">Detalhes</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
            {#if isEditing}
                <!-- Edit mode -->
                <div class="space-y-3">
                    <div class="space-y-1.5">
                        <Label>Título</Label>
                        <Input bind:value={task.title} />
                    </div>
                    <div class="space-y-1.5">
                        <Label>Descrição</Label>
                        <Textarea bind:value={task.description} rows={3} placeholder="Adicione uma descrição..." />
                    </div>
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div class="space-y-1.5">
                            <Label>Prioridade</Label>
                            <Select.Root type="single" value={task.priority} onValueChange={(v) => task.priority = v}>
                                <Select.Trigger class="w-full">
                                    {priorityLabel(task.priority)}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="low">Baixa</Select.Item>
                                    <Select.Item value="medium">Média</Select.Item>
                                    <Select.Item value="high">Alta</Select.Item>
                                    <Select.Item value="urgent">Urgente</Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </div>
                        <div class="space-y-1.5">
                            <Label>Status</Label>
                            <Select.Root type="single" value={task.status} onValueChange={(v) => task.status = v}>
                                <Select.Trigger class="w-full">
                                    {statusLabel(task.status)}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="pending">Pendente</Select.Item>
                                    <Select.Item value="in_progress">Em Progresso</Select.Item>
                                    <Select.Item value="completed">Concluído</Select.Item>
                                    <Select.Item value="cancelled">Cancelado</Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </div>
                        <div class="space-y-1.5">
                            <Label>Prazo</Label>
                            <Input type="date" value={task.due_date?.split('T')[0] || ''} onchange={(e) => task.due_date = e.currentTarget.value || null} />
                        </div>
                    </div>
                    <div class="space-y-1.5">
                        <Label>Categoria</Label>
                        <Select.Root type="single" value={String(task.category_id || '')} onValueChange={(v) => {
                            task.category_id = v ? Number(v) : null;
                            const cat = data.categories.find((c: any) => c.id === Number(v));
                            task.category_name = cat?.name || '';
                        }}>
                            <Select.Trigger class="w-full">
                                {task.category_name || 'Sem categoria'}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="">Sem categoria</Select.Item>
                                {#each data.categories as cat (cat.id)}
                                    <Select.Item value={String(cat.id)}>{cat.name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>
            {:else}
                <!-- View mode -->
                <div class="space-y-3">
                    {#if task.description}
                        <p class="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                    {:else}
                        <p class="text-sm text-muted-foreground/60 italic">Sem descrição</p>
                    {/if}

                    <Separator />

                    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div>
                            <p class="text-xs text-muted-foreground mb-1">Prioridade</p>
                            <Badge class="border-none {priorityColor(task.priority)}">
                                {priorityLabel(task.priority)}
                            </Badge>
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground mb-1">Prazo</p>
                            {#if task.due_date}
                                {@const overdue = task.status !== 'completed' && isOverdue(task.due_date)}
                                <span class="flex items-center gap-1 text-sm font-medium {overdue ? 'text-red-600' : ''}">
                                    {#if overdue}<AlertCircle class="size-3.5" />{/if}
                                    <Calendar class="size-3.5 text-muted-foreground" />
                                    {formatDate(task.due_date)}
                                </span>
                            {:else}
                                <span class="text-sm text-muted-foreground">Sem prazo</span>
                            {/if}
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground mb-1">Categoria</p>
                            <span class="text-sm font-medium">{task.category_name || 'Sem categoria'}</span>
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground mb-1">Atualizado</p>
                            <span class="text-sm font-medium">{formatDate(task.updated_at)}</span>
                        </div>
                    </div>

                    {#if task.completed_at}
                        <div class="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                            <CheckCircle2 class="size-4" />
                            Concluída em {formatDateTime(task.completed_at)}
                        </div>
                    {/if}
                </div>
            {/if}
        </Card.Content>
    </Card.Root>

    <!-- Steps Card -->
    <Card.Root>
        <Card.Header class="pb-3">
            <div class="flex items-center justify-between">
                <Card.Title class="text-base flex items-center gap-2">
                    Etapas
                    {#if totalSteps > 0}
                        <Badge variant="secondary" class="text-xs">{completedSteps}/{totalSteps}</Badge>
                    {/if}
                </Card.Title>
                {#if totalSteps > 0}
                    <span class="text-xs text-muted-foreground">{progressPct}% concluído</span>
                {/if}
            </div>
            {#if totalSteps > 0}
                <div class="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div
                        class="h-1.5 rounded-full bg-primary transition-all"
                        style="width: {progressPct}%"
                    ></div>
                </div>
            {/if}
        </Card.Header>

        <Card.Content class="space-y-3">
            {#if task.steps.length === 0 && !isEditing}
                <div class="flex flex-col items-center justify-center py-8 text-center">
                    <div class="mb-3 rounded-full bg-muted p-3">
                        <CheckCircle2 class="size-6 text-muted-foreground/50" />
                    </div>
                    <p class="text-sm text-muted-foreground">Nenhuma etapa definida</p>
                    <p class="text-xs text-muted-foreground/70 mt-1">Clique em "Editar" para adicionar etapas à sua tarefa</p>
                </div>
            {:else}
                <div class="rounded-md border divide-y">
                    {#each task.steps as step (step.id)}
                        {#if isEditing}
                            <button
                                type="button"
                                class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer"
                                onclick={() => toggleStepLocal(step.id)}
                            >
                                <Checkbox checked={step.is_completed} />
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm {step.is_completed ? 'text-muted-foreground line-through' : 'font-medium'}">
                                        {step.title}
                                    </p>
                                    {#if step.is_completed && step.completed_at}
                                        <p class="text-xs text-muted-foreground mt-0.5">
                                            Concluída em {formatDate(step.completed_at)}
                                        </p>
                                    {/if}
                                </div>
                                <Badge variant="outline" class="text-xs shrink-0">
                                    {step.step_order}/{totalSteps}
                                </Badge>
                                <Button variant="ghost" size="icon" class="size-7 text-muted-foreground hover:text-red-600 shrink-0" onclick={(e: MouseEvent) => { e.stopPropagation(); removeStep(step.id); }}>
                                    <Trash2 class="size-3.5" />
                                </Button>
                            </button>
                        {:else}
                            {@const formId = `toggle-step-${step.id}`}
                            <form id={formId} method="POST" action="?/toggleStep" use:enhance>
                                <input type="hidden" name="stepId" value={step.id} />
                                <button
                                    type="submit"
                                    class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer"
                                >
                                    <Checkbox checked={step.is_completed} tabindex={-1} />
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm {step.is_completed ? 'text-muted-foreground line-through' : 'font-medium'}">
                                            {step.title}
                                        </p>
                                        {#if step.is_completed && step.completed_at}
                                            <p class="text-xs text-muted-foreground mt-0.5">
                                                Concluída em {formatDate(step.completed_at)}
                                            </p>
                                        {/if}
                                    </div>
                                    <Badge variant="outline" class="text-xs shrink-0">
                                        {step.step_order}/{totalSteps}
                                    </Badge>
                                </button>
                            </form>
                        {/if}
                    {/each}
                </div>
            {/if}

            <!-- Add step (edit mode) -->
            {#if isEditing && task.steps.length < 5}
                <div class="flex gap-2">
                    <Input
                        placeholder="Nova etapa..."
                        bind:value={newStepTitle}
                        class="h-9 flex-1"
                        onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }}
                    />
                    <Button variant="outline" size="sm" class="h-9" onclick={addStep} disabled={!newStepTitle.trim()}>
                        <Plus class="mr-1.5 size-3.5" /> Adicionar
                    </Button>
                </div>
                <p class="text-xs text-muted-foreground">{task.steps.length}/5 etapas</p>
            {/if}
        </Card.Content>
    </Card.Root>
</div>
