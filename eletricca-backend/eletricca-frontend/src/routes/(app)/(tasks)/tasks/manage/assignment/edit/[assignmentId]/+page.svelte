<script lang="ts">
    import { ArrowLeft, User, ClipboardList, Save, Calendar, Lock } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms';

    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Label } from '$lib/components/ui/label';
    import { Input } from '$lib/components/ui/input';
    import * as Select from '$lib/components/ui/select';
    import * as Alert from '$lib/components/ui/alert';

    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let a = $derived(data.assignment);

    let priority = $state(a.priority);
    let dueDate = $state(a.due_date ? (a.due_date as string).slice(0, 10) : '');
    let availableFrom = $state(a.available_from ? (a.available_from as string).slice(0, 10) : '');
    let submitting = $state(false);

    function priorityLabel(p: string) {
        return p === 'urgent' ? 'Urgente' : p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa';
    }

    function statusLabel(s: string) {
        return s === 'completed' ? 'Concluído' : s === 'in_progress' ? 'Em Andamento' : s === 'cancelled' ? 'Cancelado' : 'Pendente';
    }

    function statusClass(s: string) {
        return s === 'completed' ? 'bg-green-100 text-green-700 border-none'
             : s === 'in_progress' ? 'bg-yellow-100 text-yellow-700 border-none'
             : 'bg-blue-50 text-blue-700 border-none';
    }
</script>

<div class="max-w-lg mx-auto space-y-6 pb-16">
    <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" onclick={() => goto('/tasks/manage/assignment')}>
            <ArrowLeft class="size-5" />
        </Button>
        <div>
            <h2 class="text-xl font-bold tracking-tight text-primary">Editar Atribuição</h2>
            <p class="text-sm text-muted-foreground">Ajuste prioridade, prazo e disponibilidade</p>
        </div>
    </div>

    {#if form?.error}
        <Alert.Root variant="destructive">
            <Alert.Description>{form.error}</Alert.Description>
        </Alert.Root>
    {/if}

    <!-- Assignment info (read-only) -->
    <Card.Root>
        <Card.Content class="pt-5 space-y-3">
            <div class="flex items-start gap-3">
                <ClipboardList class="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">Tarefa</p>
                    <p class="font-medium text-sm">{a.task_title}</p>
                </div>
            </div>
            <div class="flex items-start gap-3">
                <User class="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">Usuário</p>
                    <p class="font-medium text-sm">{a.user_name}</p>
                    <p class="text-xs text-muted-foreground">{a.user_email}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <Badge class={statusClass(a.status)}>{statusLabel(a.status)}</Badge>
                {#if a.status === 'completed'}
                    <span class="text-xs text-muted-foreground">Não é possível editar atribuições concluídas</span>
                {/if}
            </div>
        </Card.Content>
    </Card.Root>

    <!-- Edit form -->
    <form method="POST"
          use:enhance={() => {
              submitting = true;
              return async ({ update }) => { submitting = false; await update(); };
          }}>
        <input type="hidden" name="priority" value={priority} />

        <Card.Root>
            <Card.Header class="pb-3">
                <Card.Title class="text-base">Dados da Atribuição</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-4">
                <div class="space-y-2">
                    <Label>Prioridade</Label>
                    <Select.Root type="single" value={priority} onValueChange={(v) => priority = v}>
                        <Select.Trigger class="w-full">
                            {priorityLabel(priority)}
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="low">Baixa</Select.Item>
                            <Select.Item value="medium">Média</Select.Item>
                            <Select.Item value="high">Alta</Select.Item>
                            <Select.Item value="urgent">Urgente</Select.Item>
                        </Select.Content>
                    </Select.Root>
                </div>

                <div class="space-y-2">
                    <Label class="flex items-center gap-1.5">
                        <Lock class="size-3.5 text-muted-foreground" />
                        Disponível a partir de
                    </Label>
                    <Input
                        type="date"
                        name="available_from"
                        value={availableFrom}
                        oninput={(e) => availableFrom = (e.target as HTMLInputElement).value}
                    />
                    <p class="text-xs text-muted-foreground">Deixe em branco para disponibilidade imediata</p>
                </div>

                <div class="space-y-2">
                    <Label class="flex items-center gap-1.5">
                        <Calendar class="size-3.5 text-muted-foreground" />
                        Prazo
                    </Label>
                    <Input
                        type="date"
                        name="due_date"
                        value={dueDate}
                        oninput={(e) => dueDate = (e.target as HTMLInputElement).value}
                    />
                    <p class="text-xs text-muted-foreground">Deixe em branco para sem prazo</p>
                </div>
            </Card.Content>
            <Card.Footer class="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onclick={() => goto('/tasks/manage/assignment')}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                    <Save class="mr-2 size-4" />
                    {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </Card.Footer>
        </Card.Root>
    </form>
</div>
