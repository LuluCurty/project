<script lang="ts">
    import {
        ArrowLeft, Plus, Trash2, Save, UserPlus, Users
    } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms';

    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Input } from '$lib/components/ui/input';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Label } from '$lib/components/ui/label';
    import * as Select from '$lib/components/ui/select';
    import * as Alert from '$lib/components/ui/alert';

    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let title = $state(data.task.title);
    let description = $state(data.task.description || '');
    let categoryId = $state(String(data.task.category_id || ''));
    let priority = $state(data.task.priority || 'medium');
    let recurrenceRule = $state(data.task.recurrence_rule || '');

    let steps = $state(data.task.steps.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description || ''
    })));
    let newStepTitle = $state('');
    let submitting = $state(false);

    // Re-sincroniza o estado local quando o load reexecuta após ação bem-sucedida
    $effect(() => {
        if (form?.success) {
            title = data.task.title;
            description = data.task.description || '';
            categoryId = String(data.task.category_id || '');
            priority = data.task.priority || 'medium';
            recurrenceRule = data.task.recurrence_rule || '';
            steps = data.task.steps.map((s: any) => ({
                id: s.id,
                title: s.title,
                description: s.description || ''
            }));
        }
    });

    function addStep() {
        if (!newStepTitle.trim() || steps.length >= 5) return;
        steps = [...steps, {
            id: Date.now(),
            title: newStepTitle.trim(),
            description: ''
        }];
        newStepTitle = '';
    }

    function removeStep(id: number) {
        steps = steps.filter((s: any) => s.id !== id);
    }

    function recurrenceLabel(rule: string) {
        switch (rule) {
            case 'daily': return 'Diário';
            case 'weekly': return 'Semanal';
            case 'biweekly': return 'Quinzenal';
            case 'monthly': return 'Mensal';
            case 'quarterly': return 'Trimestral';
            case 'yearly': return 'Anual';
            default: return 'Selecionar';
        }
    }
</script>

<form
    method="POST"
    action="?/updateTask"
    use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
            submitting = false;
            await update();
        };
    }}
>
    <!-- Hidden inputs -->
    <input type="hidden" name="title" value={title} />
    <input type="hidden" name="description" value={description} />
    <input type="hidden" name="category_id" value={categoryId} />
    <input type="hidden" name="priority" value={priority} />
    <input type="hidden" name="recurrence_rule" value={recurrenceRule} />
    <input type="hidden" name="steps" value={JSON.stringify(steps)} />

    <div class="max-w-3xl mx-auto space-y-6 pb-20">
        <!-- Header -->
        <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <Button type="button" variant="ghost" size="icon" onclick={() => goto('/tasks/manage')}>
                    <ArrowLeft class="size-5" />
                </Button>
                <div>
                    <h2 class="text-2xl font-bold tracking-tight text-primary">Editar Tarefa</h2>
                    <p class="text-muted-foreground">#{data.task.id} · Criada por {data.task.created_by_name}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <Button type="button" variant="outline" onclick={() => goto(`/tasks/manage/${data.task.id}/assign`)}>
                    <UserPlus class="mr-2 size-4" /> Atribuir
                </Button>
                <Button type="submit" disabled={submitting}>
                    <Save class="mr-2 size-4" /> Salvar
                </Button>
            </div>
        </div>

        {#if form?.error}
            <Alert.Root variant="destructive">
                <Alert.Description>{form.error}</Alert.Description>
            </Alert.Root>
        {/if}

        {#if form?.success}
            <Alert.Root class="border-green-200 bg-green-50 text-green-800">
                <Alert.Description>Tarefa salva com sucesso!</Alert.Description>
            </Alert.Root>
        {/if}

        <!-- Info banner -->
        <div class="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-3 text-sm">
            <Users class="size-4 text-muted-foreground shrink-0" />
            <span class="text-muted-foreground">
                Esta tarefa possui <strong class="text-foreground">{data.task.assignment_count}</strong> atribuição(ões).
            </span>
            <Button type="button" variant="link" class="ml-auto h-auto p-0 text-xs" onclick={() => goto(`/tasks/manage/${data.task.id}/assign`)}>
                Gerenciar atribuições
            </Button>
        </div>

        <!-- Task details -->
        <Card.Root>
            <Card.Header>
                <Card.Title class="text-base">Informações da Tarefa</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-4">
                <div class="space-y-1.5">
                    <Label>Título *</Label>
                    <Input bind:value={title} placeholder="Ex: Inspeção do sistema elétrico" />
                </div>
                <div class="space-y-1.5">
                    <Label>Descrição</Label>
                    <Textarea bind:value={description} rows={3} placeholder="Descreva o que precisa ser feito..." />
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div class="space-y-1.5">
                        <Label>Prioridade</Label>
                        <Select.Root type="single" value={priority} onValueChange={(v) => priority = v}>
                            <Select.Trigger class="w-full">
                                {priority === 'urgent' ? 'Urgente' : priority === 'high' ? 'Alta' : priority === 'medium' ? 'Média' : 'Baixa'}
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
                        <Label>Categoria</Label>
                        <Select.Root type="single" value={categoryId} onValueChange={(v) => categoryId = v}>
                            <Select.Trigger class="w-full">
                                {data.categories.find((c: any) => String(c.id) === categoryId)?.name || 'Selecionar categoria'}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="">Sem categoria</Select.Item>
                                {#each data.categories as cat (cat.id)}
                                    <Select.Item value={String(cat.id)}>{cat.name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div class="space-y-1.5">
                        <Label>Recorrência</Label>
                        <Select.Root type="single" value={recurrenceRule} onValueChange={(v) => recurrenceRule = v}>
                            <Select.Trigger class="w-full">
                                {recurrenceRule ? recurrenceLabel(recurrenceRule) : 'Sem recorrência'}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="">Sem recorrência</Select.Item>
                                <Select.Item value="daily">Diário</Select.Item>
                                <Select.Item value="weekly">Semanal</Select.Item>
                                <Select.Item value="biweekly">Quinzenal</Select.Item>
                                <Select.Item value="monthly">Mensal</Select.Item>
                                <Select.Item value="quarterly">Trimestral</Select.Item>
                                <Select.Item value="yearly">Anual</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>
            </Card.Content>
        </Card.Root>

        <!-- Steps -->
        <Card.Root>
            <Card.Header class="pb-3">
                <div class="flex items-center justify-between">
                    <Card.Title class="text-base">
                        Etapas
                        {#if steps.length > 0}
                            <Badge variant="secondary" class="ml-2 text-xs">{steps.length}/5</Badge>
                        {/if}
                    </Card.Title>
                </div>
                <Card.Description>
                    Defina até 5 etapas que os usuários deverão completar.
                </Card.Description>
            </Card.Header>

            <Card.Content class="space-y-3">
                {#if steps.length > 0}
                    <div class="rounded-md border divide-y">
                        {#each steps as step, i (step.id)}
                            <div class="flex items-start gap-3 px-4 py-3">
                                <div class="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                                    {i + 1}
                                </div>
                                <div class="flex-1 min-w-0 space-y-2">
                                    <Input
                                        bind:value={step.title}
                                        placeholder="Título da etapa"
                                        class="h-8 text-sm"
                                    />
                                    <Input
                                        bind:value={step.description}
                                        placeholder="Descrição (opcional)"
                                        class="h-8 text-xs"
                                    />
                                </div>
                                <Button type="button" variant="ghost" size="icon" class="size-7 text-muted-foreground hover:text-red-600 shrink-0" onclick={() => removeStep(step.id)}>
                                    <Trash2 class="size-3.5" />
                                </Button>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="flex flex-col items-center justify-center py-8 rounded-md border border-dashed text-center">
                        <p class="text-sm text-muted-foreground">Nenhuma etapa adicionada</p>
                        <p class="text-xs text-muted-foreground/70 mt-1">Adicione etapas abaixo</p>
                    </div>
                {/if}

                {#if steps.length < 5}
                    <div class="flex gap-2">
                        <Input
                            placeholder="Nome da etapa..."
                            bind:value={newStepTitle}
                            class="h-9 flex-1"
                            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }}
                        />
                        <Button type="button" variant="outline" size="sm" class="h-9" onclick={addStep} disabled={!newStepTitle.trim()}>
                            <Plus class="mr-1.5 size-3.5" /> Adicionar
                        </Button>
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>

        <!-- Bottom save -->
        <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" onclick={() => goto('/tasks/manage')}>Voltar</Button>
            <Button type="submit" disabled={submitting}>
                <Save class="mr-2 size-4" /> Salvar Alterações
            </Button>
        </div>
    </div>
</form>
