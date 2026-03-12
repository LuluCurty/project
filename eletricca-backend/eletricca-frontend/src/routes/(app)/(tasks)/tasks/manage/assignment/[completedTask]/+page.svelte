<script lang="ts">
    import {
        ArrowLeft, Calendar, Tag, User, Mail,
        CircleCheck as CheckCircle2, Clock, CircleAlert as AlertCircle,
        ClipboardList, History, RefreshCw, Repeat
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
    let history = $derived(data.history ?? []);
    let submittingReset = $state(false);

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

    function formatDateTime(iso: string | null) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
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
</script>

<div class="max-w-2xl mx-auto space-y-6 pb-16">
    <!-- Header -->
    <div class="flex items-start gap-4">
        <Button variant="ghost" size="icon" class="shrink-0 mt-0.5" onclick={() => goto('/tasks/manage/assignment')}>
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
                {#if assignment.is_recurring}
                    <Badge class="bg-purple-100 text-purple-700 border-none text-xs">
                        <Repeat class="mr-1 size-3" />{recurrenceLabel(assignment.recurrence_rule)}
                    </Badge>
                {/if}
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

    <!-- Usuário atribuído -->
    <Card.Root>
        <Card.Content class="pt-5">
            <div class="flex items-center gap-3">
                <div class="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User class="size-5 text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm">{assignment.user_name}</p>
                    <p class="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail class="size-3" />{assignment.user_email}
                    </p>
                </div>
                <div class="text-right text-xs text-muted-foreground shrink-0">
                    <p>Atribuído por</p>
                    <p class="font-medium text-foreground">{assignment.assigned_by_name}</p>
                </div>
            </div>
        </Card.Content>
    </Card.Root>

    <!-- Datas e progresso -->
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
                        Prazo: <span class="font-medium {overdue ? 'text-red-600' : 'text-foreground'}">
                            {formatDate(assignment.due_date)}
                        </span>
                    </span>
                </div>
                <div class="flex items-center gap-2 text-muted-foreground">
                    <ClipboardList class="size-4 shrink-0" />
                    <span>
                        Atribuído: <span class="font-medium text-foreground">{formatDateTime(assignment.assigned_at)}</span>
                    </span>
                </div>
            </div>

            {#if assignment.status === 'completed' && assignment.completed_at}
                <div class="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800 flex items-center gap-2">
                    <CheckCircle2 class="size-4 shrink-0" />
                    Concluída em <span class="font-medium">{formatDateTime(assignment.completed_at)}</span>
                </div>
            {/if}

            {#if assignment.is_recurring && assignment.status === 'completed'}
                <form method="POST" action="/tasks/manage/assignment?/resetAssignment"
                      use:enhance={() => {
                          submittingReset = true;
                          return async ({ update }) => { submittingReset = false; await update(); goto('/tasks/manage/assignment'); };
                      }}>
                    <input type="hidden" name="assignmentId" value={assignment.assignment_id} />
                    <Button type="submit" class="w-full" disabled={submittingReset}>
                        <RefreshCw class="mr-2 size-4 {submittingReset ? 'animate-spin' : ''}" />
                        {submittingReset ? 'Reiniciando...' : 'Reiniciar Ciclo'}
                    </Button>
                </form>
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
                            class="h-full rounded-full transition-all duration-300
                                   {progressPct === 100 ? 'bg-green-600' : 'bg-primary'}"
                            style="width: {progressPct}%"
                        ></div>
                    </div>
                </div>
            {/if}
        </Card.Content>
    </Card.Root>

    <!-- Etapas (read-only) -->
    {#if steps.length > 0}
        <Card.Root>
            <Card.Header class="pb-2">
                <Card.Title class="text-base">Etapas</Card.Title>
                <Card.Description>Progresso individual do usuário nesta tarefa</Card.Description>
            </Card.Header>
            <Card.Content class="p-0">
                <div class="divide-y">
                    {#each steps as step (step.id)}
                        <div class="flex items-center gap-4 px-5 py-4
                                    {step.is_completed ? 'bg-green-50/50' : ''}">
                            <div class="shrink-0 size-4 rounded border-2 flex items-center justify-center
                                        {step.is_completed
                                            ? 'bg-green-600 border-green-600'
                                            : 'border-muted-foreground/30'}">
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
                                    Etapa {step.step_order}
                                </span>
                                {#if step.is_completed && step.completed_at}
                                    <p class="text-xs text-green-600 mt-0.5">{formatDateTime(step.completed_at)}</p>
                                {:else if !step.is_completed}
                                    <p class="text-xs text-muted-foreground/60 mt-0.5">Pendente</p>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </Card.Content>
        </Card.Root>
    {:else}
        <Card.Root>
            <Card.Content class="flex flex-col items-center justify-center py-10 text-center">
                <ClipboardList class="size-10 text-muted-foreground/40 mb-3" />
                <p class="text-sm text-muted-foreground">Esta tarefa não tem etapas definidas.</p>
            </Card.Content>
        </Card.Root>
    {/if}

    <!-- Histórico de ciclos anteriores -->
    {#if history.length > 0}
        <Card.Root>
            <Card.Header class="pb-2">
                <Card.Title class="text-base flex items-center gap-2">
                    <History class="size-4" />
                    Histórico de Ciclos Anteriores
                </Card.Title>
                <Card.Description>Cada vez que a tarefa foi concluída e reatribuída</Card.Description>
            </Card.Header>
            <Card.Content class="p-0">
                <div class="divide-y">
                    {#each history as h (h.id)}
                        <div class="px-5 py-4 space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <Badge class="bg-purple-100 text-purple-700 border-none text-xs">
                                        <RefreshCw class="size-2.5 mr-1" />
                                        Ciclo {h.cycle}
                                    </Badge>
                                </div>
                                <div class="text-xs text-muted-foreground text-right">
                                    <span>Reatribuído por <span class="font-medium text-foreground">{h.reset_by_name ?? '—'}</span></span>
                                    <p class="mt-0.5">{formatDateTime(h.reset_at)}</p>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <div class="flex items-center gap-1.5">
                                    <Calendar class="size-3 shrink-0" />
                                    Atribuído: <span class="font-medium text-foreground">{formatDateTime(h.assigned_at)}</span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <CheckCircle2 class="size-3 shrink-0 text-green-600" />
                                    Concluído: <span class="font-medium text-green-700">{formatDateTime(h.completed_at)}</span>
                                </div>
                            </div>

                            {#if h.steps_snapshot && h.steps_snapshot.length > 0}
                                <div class="mt-1 space-y-1">
                                    {#each h.steps_snapshot as s}
                                        <div class="flex items-center gap-2 text-xs rounded-sm bg-muted/40 px-2.5 py-1.5">
                                            <CheckCircle2 class="size-3 shrink-0 text-green-600" />
                                            <span class="flex-1 min-w-0 truncate">{s.title}</span>
                                            <span class="shrink-0 text-muted-foreground">{formatDateTime(s.completed_at)}</span>
                                        </div>
                                    {/each}
                                </div>
                            {:else}
                                <p class="text-xs text-muted-foreground italic">Sem etapas registradas neste ciclo.</p>
                            {/if}
                        </div>
                    {/each}
                </div>
            </Card.Content>
        </Card.Root>
    {/if}
</div>
