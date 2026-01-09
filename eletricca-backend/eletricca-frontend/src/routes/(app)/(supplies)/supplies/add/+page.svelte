<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { ChevronLeft, Save, Loader2 } from 'lucide-svelte';
    
    import * as Card from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea';
    import * as Select from '$lib/components/ui/select';

    // Tipagem do Fornecedor para o dropdown
    interface SupplierOption {
        id: number;
        supplier_name: string;
    }

    // Estados do Formulário
    let isLoading = $state(false);
    let suppliersList = $state<SupplierOption[]>([]);
    
    // Dados do formulário
    let formData = $state({
        supply_name: '',
        quantity: 0,
        price: '',
        details: '',
        supplier_id: '' // Será preenchido pelo Select
    });

    // Buscar lista de fornecedores ao carregar
    onMount(async () => {
        try {
            const res = await fetch('/api/supplier/list'); // Rota do Passo 1
            if (res.ok) {
                suppliersList = await res.json();
            }
        } catch (e) {
            console.error("Erro ao carregar fornecedores", e);
        }
    });

    // Enviar Formulário
    async function handleSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;

        try {
            const res = await fetch('/api/supplies', { // Rota do Passo 2
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    // Converte ID para numero se existir, senão null
                    supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

            alert('Material criado com sucesso!');
            goto('/supplies'); // Volta para a listagem

        } catch (error) {
            console.error(error);
            alert('Erro ao criar material. Verifique o console.');
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="max-w-2xl mx-auto space-y-4">
    <div class="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onclick={() => goto('/supplies')}>
            <ChevronLeft class="size-5" />
        </Button>
        <h1 class="text-2xl font-bold tracking-tight text-primary">Novo Material</h1>
    </div>

    <Card.Root>
        <Card.Content class="pt-6">
            <form onsubmit={handleSubmit} class="space-y-6">
                
                <div class="space-y-2">
                    <Label for="name">Nome do Material *</Label>
                    <Input 
                        id="name" 
                        placeholder="Ex: Cabo Flexível 2.5mm" 
                        required 
                        bind:value={formData.supply_name}
                    />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label for="qtd">Quantidade em Estoque</Label>
                        <Input 
                            id="qtd" 
                            type="number" 
                            min="0"
                            bind:value={formData.quantity}
                        />
                    </div>

                    <div class="space-y-2">
                        <Label>Fornecedor Padrão</Label>
                        <Select.Root type="single" onValueChange={(v) => formData.supplier_id = v}>
                            <Select.Trigger>
                                {suppliersList.find(s => s.id.toString() === formData.supplier_id)?.supplier_name || "Selecione..."}
                            </Select.Trigger>
                            <Select.Content>
                                {#each suppliersList as sup}
                                    <Select.Item value={sup.id.toString()}>
                                        {sup.supplier_name}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>

                <div class="space-y-2">
                    <Label for="price">Preço Unitário (R$)</Label>
                    <Input 
                        id="price" 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00"
                        disabled={!formData.supplier_id} 
                        bind:value={formData.price}
                    />
                    {#if !formData.supplier_id}
                        <p class="text-[10px] text-muted-foreground">Selecione um fornecedor para definir o preço.</p>
                    {/if}
                </div>

                <div class="space-y-2">
                    <Label for="details">Detalhes / Descrição</Label>
                    <Textarea 
                        id="details" 
                        placeholder="Informações adicionais, marca, especificações..." 
                        class="resize-none h-32"
                        bind:value={formData.details}
                    />
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onclick={() => goto('/supplies')}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {#if isLoading}
                            <Loader2 class="mr-2 size-4 animate-spin" /> Salvando...
                        {:else}
                            <Save class="mr-2 size-4" /> Criar Material
                        {/if}
                    </Button>
                </div>

            </form>
        </Card.Content>
    </Card.Root>
</div>