<script lang="ts">
    import {
        ArrowLeft, Calendar, Tag, User, CircleCheck as CheckCircle2,
        Clock, CircleAlert as AlertCircle, Lock
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms';

    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Separator } from '$lib/components/ui/separator';

    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let assignment = $derived(data.assignment);
    let steps = $derived(data.steps);

    let completedCount = $derived(steps.filter((s: any) => s.is_completed).length);
    let progressPct = $derived(steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0);

    function isOverdue(iso: string | null, status: string) {
        if (status === 'completed' || !iso) return false;
        return new Date(iso) < new Date();
    }

    function formatDate(iso: string | null) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function priorityLabel(p: string) {
        switch (p) {
            case 'urgent': return 'Urgente';
            case 'high': return 'Alta';
            case 'medium': return 'Média';
            case 'low': return 'Baixa';
            default: return p;
        }
    }

    function priorityClass(p: string) {
        switch (p) {
            case 'urgent': return 'bg-red-100 text-red-700 border-none';
            case 'high': return 'bg-orange-100 text-orange-700 border-none';
            case 'medium': return 'bg-blue-100 text-blue-700 border-none';
            case 'low': return 'bg-gray-100 text-gray-600 border-none';
            default: return '';
        }
    }

    let overdue = $derived(isOverdue(assignment.due_date, assignment.status));
    let isLocked = $derived(
        assignment.status !== 'completed' &&
        !!assignment.available_from &&
        new Date(assignment.available_from) > new Date()
    );
</script>

<div class="max-w-2xl mx-auto space-y-6 pb-16">
    <!-- Header -->
    <div class="flex items-start gap-4">
        <Button variant="ghost" size="icon" class="shrink-0 mt-0.5" onclick={() => goto('/tasks')}>
            <ArrowLeft class="size-5" />
        </Button>
        <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
                {#if assignment.category_name}
                    <Badge variant="outline" class="text-xs">
                        <Tag class="mr-1 size-3" />{assignment.category_name}
                    </Badge>
                {/if}
                <Badge class={priorityClass(assignment.priority)}>
                    {priorityLabel(assignment.priority)}
                </Badge>
                {#if assignment.status === 'completed'}
                    <Badge class="bg-green-100 text-green-700 border-none">
                        <CheckCircle2 class="mr-1 size-3" /> Concluída
                    </Badge>
                {:else if overdue}
                    <Badge variant="destructive">
                        <AlertCircle class="mr-1 size-3" /> Atrasada
                    </Badge>
                {:else if assignment.status === 'in_progress'}
                    <Badge class="bg-yellow-100 text-yellow-700 border-none">
                        <Clock class="mr-1 size-3" /> Em Progresso
                    </Badge>
                {:else}
                    <Badge class="bg-blue-50 text-blue-700 border-none">
                        <Clock class="mr-1 size-3" /> Pendente
                    </Badge>
                {/if}
            </div>
            <h2 class="text-xl font-bold tracking-tight text-primary leading-tight">
                {assignment.title}
            </h2>
        </div>
    </div>

    <!-- Info card -->
    <Card.Root>
        <Card.Content class="pt-5 space-y-3">
            {#if assignment.description}
                <p class="text-sm text-muted-foreground">{assignment.description}</p>
                <Separator />
            {/if}

            <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="flex items-center gap-2 text-muted-foreground">
                    <Calendar class="size-4 shrink-0" />
                    <span>
                        {#if assignment.status === 'completed'}
                            Entregue: <span class="font-medium text-foreground">{formatDate(assignment.completed_at)}</span>
                        {:else}
                            Prazo: <span class="font-medium {overdue ? 'text-red-600' : 'text-foreground'}">{formatDate(assignment.due_date)}</span>
                        {/if}
                    </span>
                </div>
                <div class="flex items-center gap-2 text-muted-foreground">
                    <User class="size-4 shrink-0" />
                    <span>Por: <span class="font-medium text-foreground">{assignment.assigned_by_name}</span></span>
                </div>
            </div>

            {#if assignment.available_from}
                <div class="flex items-center gap-2 text-sm {isLocked ? 'text-amber-700' : 'text-muted-foreground'}">
                    <Lock class="size-4 shrink-0 {isLocked ? 'text-amber-600' : 'text-green-600'}" />
                    <span>
                        Disponível em:
                        <span class="font-medium {isLocked ? 'text-amber-700' : 'text-foreground'}">
                            {formatDate(assignment.available_from)}
                        </span>
                        {#if !isLocked}
                            <span class="text-green-600 ml-1">✓ Liberado</span>
                        {/if}
                    </span>
                </div>
            {/if}

            {#if steps.length > 0}
                <Separator />
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span class="font-medium text-foreground">{completedCount}/{steps.length} etapas</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                            class="h-full rounded-full bg-primary transition-all duration-300"
                            style="width: {progressPct}%"
                        ></div>
                    </div>
                </div>
            {/if}
        </Card.Content>
    </Card.Root>

    <!-- Locked banner -->
    {#if isLocked}
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            <Lock class="size-4 shrink-0" />
            Esta tarefa estará disponível a partir de <span class="font-medium ml-1">{formatDate(assignment.available_from)}</span>.
        </div>
    {/if}

    <!-- Steps -->
    {#if steps.length > 0}
        <Card.Root>
            <Card.Header class="pb-2">
                <Card.Title class="text-base">Etapas</Card.Title>
                <Card.Description>{isLocked ? 'Disponível apenas após a data de liberação' : 'Clique em uma etapa para marcar como concluída'}</Card.Description>
            </Card.Header>
            <Card.Content class="p-0">
                <div class="divide-y">
                    {#each steps as step (step.id)}
                        {@const formId = `toggle-step-${step.id}`}
                        <form id={formId} method="POST" action="?/toggleStep" use:enhance>
                            <input type="hidden" name="stepId" value={step.id} />
                            <button
                                type="submit"
                                class="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors
                                       {isLocked || assignment.status === 'completed' ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/50 cursor-pointer'}
                                       {step.is_completed ? 'bg-green-50/50' : ''}"
                                disabled={assignment.status === 'completed' || isLocked}
                            >
                                <div class="shrink-0 size-4 rounded border-2 flex items-center justify-center
                                            {step.is_completed
                                                ? 'bg-green-600 border-green-600'
                                                : 'border-muted-foreground/50'}">
                                    {#if step.is_completed}
                                        <CheckCircle2 class="size-3 text-white" />
                                    {/if}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium leading-none
                                               {step.is_completed ? 'line-through text-muted-foreground' : ''}">
                                        {step.title}
                                    </p>
                                    {#if step.description}
                                        <p class="mt-1 text-xs text-muted-foreground truncate">{step.description}</p>
                                    {/if}
                                </div>
                                <div class="shrink-0 text-right">
                                    <span class="text-xs font-medium text-muted-foreground">
                                        {step.step_order}
                                    </span>
                                    {#if step.is_completed && step.completed_at}
                                        <p class="text-xs text-green-600 mt-0.5">{formatDate(step.completed_at)}</p>
                                    {/if}
                                </div>
                            </button>
                        </form>
                    {/each}
                </div>
            </Card.Content>
        </Card.Root>
    {:else}
        <Card.Root>
            <Card.Content class="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 class="size-10 text-muted-foreground/40 mb-3" />
                <p class="text-sm text-muted-foreground">Esta tarefa não tem etapas definidas.</p>
            </Card.Content>
        </Card.Root>
    {/if}

    {#if assignment.status === 'completed'}
        <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
            <CheckCircle2 class="size-4 shrink-0" />
            Tarefa concluída em {formatDate(assignment.completed_at)}.
        </div>
    {/if}
</div>
