<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    import type { PageData, ActionData } from './$types';

    import * as Card from '$lib/components/ui/card';
    import * as Select from '$lib/components/ui/select';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea';
    import { ChevronLeft, Save, LoaderCircle, Package } from '@lucide/svelte';


    let { data, form }: { data: PageData; form: ActionData } = $props();

    let isSubmitting = $state(false);
    let supplierId   = $state('');

    function handleKeydown(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            (document.querySelector<HTMLButtonElement>('button[type="submit"]'))?.click();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="mx-auto max-w-2xl space-y-4 p-4">

    <div class="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" onclick={() => goto('/supplies')}>
            <ChevronLeft class="size-5" />
        </Button>
        <h1 class="text-2xl font-bold tracking-tight">Novo Material</h1>
    </div>

    <Card.Root>
        <Card.Header>
            <div class="flex items-center gap-2">
                <div class="rounded-full bg-primary/10 p-2 text-primary">
                    <Package class="size-5" />
                </div>
                <div>
                    <Card.Title>Dados do Material</Card.Title>
                    <Card.Description>Preencha as informações do novo item.</Card.Description>
                </div>
            </div>
        </Card.Header>

        <Card.Content class="pt-4">
            <form method="POST"
                use:enhance={() => {
                    isSubmitting = true;
                    return async ({ result, update }) => {
                        isSubmitting = false;
                        if (result.type === 'failure') {
                            toast.error(String((result.data as any)?.error) || 'Erro ao salvar.');
                        } else if (result.type === 'redirect') {
                            toast.success('Material criado com sucesso!');
                        }
                        await update();
                    };
                }}
                class="space-y-5"
            >
                <!-- Nome -->
                <div class="space-y-2">
                    <Label for="supply_name">Nome do Material *</Label>
                    <Input id="supply_name" name="supply_name"
                        placeholder="Ex: Cabo Flexível 2.5mm" required />
                </div>

                <!-- Quantidade + Fornecedor -->
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                        <Label for="quantity">Quantidade em Estoque</Label>
                        <Input id="quantity" name="quantity" type="number" min="0" value="0" />
                    </div>

                    <div class="space-y-2">
                        <Label>Fornecedor Padrão</Label>
                        <Select.Root type="single" onValueChange={(v) => supplierId = v}>
                            <Select.Trigger class="w-full">
                                {data.suppliers.find(s => s.id.toString() === supplierId)?.supplier_name || 'Nenhum'}
                            </Select.Trigger>
                            <Select.Content>
                                {#each data.suppliers as sup}
                                    <Select.Item value={sup.id.toString()}>{sup.supplier_name}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                        <input type="hidden" name="supplier_id" value={supplierId} />
                    </div>
                </div>

                <!-- Preço -->
                <div class="space-y-2">
                    <Label for="price">Preço Unitário (R$)</Label>
                    <Input id="price" name="price" type="number" step="0.01"
                        placeholder="0,00" disabled={!supplierId} />
                    {#if !supplierId}
                        <p class="text-xs text-muted-foreground">Selecione um fornecedor para definir o preço.</p>
                    {/if}
                </div>

                <!-- Detalhes -->
                <div class="space-y-2">
                    <Label for="details">Detalhes / Descrição</Label>
                    <Textarea id="details" name="details" class="h-24 resize-none"
                        placeholder="Marca, especificações técnicas..." />
                </div>

                {#if form?.error}
                    <p class="text-sm text-destructive">{form.error}</p>
                {/if}

                <div class="flex justify-end gap-3 border-t pt-4">
                    <Button type="button" variant="outline" onclick={() => goto('/supplies')}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {#if isSubmitting}
                            <LoaderCircle class="mr-2 size-4 animate-spin" /> Salvando...
                        {:else}
                            <Save class="mr-2 size-4" /> Criar Material
                            <span class="ml-2 border-l border-white/20 pl-2 text-xs font-normal opacity-50">Ctrl S</span>
                        {/if}
                    </Button>
                </div>
            </form>
        </Card.Content>
    </Card.Root>
</div>
