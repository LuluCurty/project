<script lang="ts">
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Save, Plus, Trash2, ArrowLeft, Star, StarOff, Loader2 } from '@lucide/svelte';

    // UI Components
    import * as Card from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea'; // Importante para descrição
    import * as Table from "$lib/components/ui/table";
    import * as Select from '$lib/components/ui/select';
    import { Badge } from "$lib/components/ui/badge"; // Opcional, para visual

    // --- TIPAGEM (Interfaces) ---
    interface SupplyData {
        supply_name: string;
        quantity: number;
        details: string;
    }

    interface SupplierOption {
        id: number;
        supplier_name: string;
    }

    interface PricingEntry {
        supplier_id: number;
        supplier_name: string;
        price: string; // Vem como string do banco decimal/money
        is_default: boolean; // Novo campo vital
    }

    // --- ESTADO ---
    let supplyId = page.params.id;
    let isLoading = $state(true);
    let isSavingBasic = $state(false);

    // Dados do Material (Tipado)
    let supply = $state<SupplyData>({
        supply_name: '',
        quantity: 0,
        details: ''
    });

    // Listas (Tipadas)
    let prices = $state<PricingEntry[]>([]); 
    let allSuppliers = $state<SupplierOption[]>([]); 
    
    // Form de adição
    let newSupplierId = $state('');
    let newSupplierPrice = $state('');

    // --- CARREGAMENTO ---
    onMount(async () => {
        try {
            await Promise.all([loadSupplyData(), loadAllSuppliers()]);
        } catch (error) {
            console.error(error);
            alert("Erro ao carregar dados.");
        } finally {
            isLoading = false;
        }
    });

    async function loadSupplyData() {
        const res = await fetch(`/api/supplies/${supplyId}`);
        if (res.ok) {
            const data = await res.json();
            supply = { 
                supply_name: data.supply_name, 
                quantity: data.quantity, 
                details: data.details || '' 
            };
            // Garante que prices é um array
            prices = data.pricing || [];
        }
    }

    async function loadAllSuppliers() {
        const res = await fetch('/api/supplier/list');
        if (res.ok) allSuppliers = await res.json();
    }

    // --- AÇÕES ---

    // 1. Atualizar dados básicos (PUT)
    async function updateBasicInfo() {
        isSavingBasic = true;
        try {
            const res = await fetch(`/api/supplies/${supplyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supply)
            });
            if (!res.ok) throw new Error('Falha ao atualizar');
            alert('Informações atualizadas com sucesso!');
        } catch (e) {
            alert('Erro ao salvar informações.');
        } finally {
            isSavingBasic = false;
        }
    }

    // 2. Adicionar Fornecedor
    async function addSupplierPrice() {
        if (!newSupplierId) return alert('Selecione um fornecedor');

        try {
            const res = await fetch(`/api/supplies/pricing/${supplyId}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    supplier_id: newSupplierId,
                    price: parseFloat(newSupplierPrice || '0')
                })
            });

            if (res.ok) {
                await loadSupplyData(); // Recarrega para ver o novo item
                newSupplierId = '';
                newSupplierPrice = '';
            } else {
                alert('Erro ao vincular (talvez já exista?).');
            }
        } catch (e) {
            console.error(e);
        }
    }

    // 3. Remover Fornecedor
    async function removeSupplier(supplierId: number) {
        if(!confirm("Tem certeza que deseja remover este fornecedor?")) return;

        try {
            const res = await fetch(`/api/supplies/pricing/${supplyId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ supplier_id: supplierId })
            });
            if (res.ok) {
                await loadSupplyData();
            } else {
                alert('Erro ao remover.');
            }
        } catch (e) {
            console.error(e);
        }
    }

    // 4. Definir como Padrão
    async function setAsDefault(supplierId: number) {
        try {
            const res = await fetch(`/api/supplies/pricing/${supplyId}/default`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ supplier_id: supplierId })
            });

            if (res.ok) {
                await loadSupplyData();
            } else {
                alert('Erro ao definir como padrão.');
            }
        } catch (e) {
            console.error(e);
        }
    }
</script>

<div class="max-w-4xl mx-auto space-y-6 pb-10">
    
    <div class="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onclick={() => goto('/supplies')}>
            <ArrowLeft class="size-5" />
        </Button>
        <h1 class="text-2xl font-bold">Editar Material</h1>
    </div>

    {#if isLoading}
        <div class="flex justify-center py-10">
            <Loader2 class="size-8 animate-spin text-muted-foreground" />
        </div>
    {:else}

        <Card.Root>
            <Card.Header>
                <Card.Title>Informações Principais</Card.Title>
            </Card.Header>
            <Card.Content class="grid gap-4">
                <div class="grid gap-2">
                    <Label>Nome do Material</Label>
                    <Input bind:value={supply.supply_name} />
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="grid gap-2">
                        <Label>Quantidade Atual</Label>
                        <Input type="number" bind:value={supply.quantity} />
                    </div>
                </div>

                <div class="grid gap-2">
                    <Label>Descrição / Detalhes</Label>
                    <Textarea 
                        bind:value={supply.details} 
                        class="resize-none h-24" 
                        placeholder="Detalhes técnicos..." 
                    />
                </div>

                <div class="flex justify-end">
                    <Button onclick={updateBasicInfo} disabled={isSavingBasic} class="w-fit">
                        {#if isSavingBasic}
                            <Loader2 class="mr-2 size-4 animate-spin" /> Salvando...
                        {:else}
                            <Save class="mr-2 size-4" /> Atualizar Dados Básicos
                        {/if}
                    </Button>
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Header>
                <Card.Title>Fornecedores e Preços</Card.Title>
                <Card.Description>Gerencie quem fornece este item. A estrela indica o fornecedor preferencial.</Card.Description>
            </Card.Header>
            
            <Card.Content>
                <Table.Root class="mb-6 border rounded-md">
                    <Table.Header>
                        <Table.Row>
                            <Table.Head class="w-[50px]">Padrão</Table.Head>
                            <Table.Head>Fornecedor</Table.Head>
                            <Table.Head>Preço</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#each prices as item}
                            <Table.Row>
                                <Table.Cell class="text-center">
                                    {#if item.is_default}
                                        <div title="Fornecedor Padrão" class="flex justify-center">
                                            <Star class="size-5 text-yellow-500 fill-yellow-500" />
                                        </div>
                                    {:else}
                                        <Button variant="ghost" size="icon" 
                                                title="Definir como padrão"
                                                onclick={() => setAsDefault(item.supplier_id)}>
                                            <StarOff class="size-4 text-muted-foreground hover:text-yellow-500" />
                                        </Button>
                                    {/if}
                                </Table.Cell>

                                <Table.Cell class="font-medium">
                                    {item.supplier_name}
                                    {#if item.is_default}
                                        <Badge variant="secondary" class="ml-2 text-[10px]">PADRÃO</Badge>
                                    {/if}
                                </Table.Cell>
                                
                                <Table.Cell>R$ {Number(item.price).toFixed(2)}</Table.Cell>
                                
                                <Table.Cell class="text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        class="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onclick={() => removeSupplier(item.supplier_id)}
                                    >
                                        <Trash2 class="size-4" />
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        {/each}

                        {#if prices.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={4} class="text-center text-muted-foreground py-4">
                                    Nenhum fornecedor vinculado a este material.
                                </Table.Cell>
                            </Table.Row>
                        {/if}
                    </Table.Body>
                </Table.Root>

                <div class=" p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-end">
                    <div class="w-full md:w-1/2 space-y-2">
                        <Label>Adicionar Fornecedor</Label>
                        <Select.Root type="single" bind:value={newSupplierId}>
                            <Select.Trigger class="w-full">
                                {
                                    allSuppliers.find(s => s.id.toString() === newSupplierId)?.supplier_name 
                                    || "Selecione..."
                                }
                            </Select.Trigger>
                            <Select.Content>
                                {#each allSuppliers as s}
                                    <Select.Item value={s.id.toString()} label={s.supplier_name}>
                                        {s.supplier_name}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <div class="w-full md:w-1/3 space-y-2">
                        <Label>Preço (R$)</Label>
                        <Input type="number" step="0.01" bind:value={newSupplierPrice} placeholder="0.00" />
                    </div>

                    <Button onclick={addSupplierPrice} disabled={!newSupplierId}>
                        <Plus class="mr-2 size-4" /> Vincular
                    </Button>
                </div>

            </Card.Content>
        </Card.Root>

    {/if}
</div>