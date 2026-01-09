<script lang="ts">
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { ChevronLeft, Save, Loader2, Truck, AlertCircle } from 'lucide-svelte';
    
    // Componentes Shadcn
    import * as Card from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea';

    // Estados
    let supplierId = page.params.id;
    let isLoadingData = $state(true);
    let isSaving = $state(false);
    let errorMessage = $state('');

    // Dados do formulário
    let formData = $state({
        supplier_name: '',
        supplier_email: '',
        supplier_telephone: '',
        supplier_address: ''
    });

    // 1. Carregar dados ao iniciar
    onMount(async () => {
        try {
            // Precisas de uma rota GET /api/supplier/:id (similar à de clientes)
            const res = await fetch(`/api/supplier/${supplierId}`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                // Assumindo que o backend retorna o objeto direto ou dentro de uma chave
                // Ajuste aqui conforme teu GET retorna (ex: data.supplier ou data direto)
                const s = data.supplier || data; 
                
                formData.supplier_name = s.supplier_name;
                formData.supplier_email = s.supplier_email;
                formData.supplier_telephone = s.supplier_telephone;
                formData.supplier_address = s.supplier_address || ''; // Garante string vazia se for null
            } else {
                errorMessage = "Fornecedor não encontrado.";
            }
        } catch (e) {
            console.error(e);
            errorMessage = "Erro ao carregar dados.";
        } finally {
            isLoadingData = false;
        }
    });

    // 2. Salvar Alterações
    async function handleUpdate(e?: Event) {
        if (e) e.preventDefault();
        
        isSaving = true;
        errorMessage = '';

        try {
            const res = await fetch(`/api/supplier/update/${supplierId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao atualizar');
            }

            alert('Fornecedor atualizado com sucesso!');
            goto('/suppliers');

        } catch (error: any) {
            console.error(error);
            errorMessage = error.message;
        } finally {
            isSaving = false;
        }
    }

    // Atalho de Teclado (Ctrl + S)
    function handleKeydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (!isSaving) handleUpdate();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="max-w-2xl mx-auto space-y-4 p-4">
    
    <div class="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onclick={() => goto('/suppliers')}>
            <ChevronLeft class="size-5" />
        </Button>
        <h1 class="text-2xl font-bold tracking-tight">Editar Fornecedor</h1>
    </div>

    {#if isLoadingData}
        <div class="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 class="size-8 animate-spin text-primary" />
            <p class="text-muted-foreground">Carregando informações...</p>
        </div>
    {:else}
        <Card.Root>
            <Card.Header>
                <div class="flex items-center gap-2">
                    <div class="p-2 bg-orange-100 text-orange-600 rounded-full">
                        <Truck class="size-5" />
                    </div>
                    <div>
                        <Card.Title>Dados da Empresa</Card.Title>
                        <Card.Description>Atualize os dados do fornecedor ID #{supplierId}.</Card.Description>
                    </div>
                </div>
            </Card.Header>

            <Card.Content class="pt-6">
                <form onsubmit={handleUpdate} class="space-y-6">
                    
                    <div class="space-y-2">
                        <Label for="name">Nome da Empresa</Label>
                        <Input 
                            id="name" 
                            bind:value={formData.supplier_name} 
                            required
                        />
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <Label for="email">Email Comercial</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                bind:value={formData.supplier_email} 
                                required
                            />
                        </div>

                        <div class="space-y-2">
                            <Label for="phone">Telefone</Label>
                            <Input 
                                id="phone" 
                                type="tel" 
                                bind:value={formData.supplier_telephone} 
                                required
                            />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <Label for="address">Endereço Completo</Label>
                        <Textarea 
                            id="address" 
                            class="resize-none h-24"
                            bind:value={formData.supplier_address} 
                        />
                    </div>

                    {#if errorMessage}
                        <div class="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                            <AlertCircle class="size-4" />
                            <span>{errorMessage}</span>
                        </div>
                    {/if}

                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onclick={() => goto('/suppliers')}>
                            Cancelar
                        </Button>
                        
                        <Button type="submit" disabled={isSaving}>
                            {#if isSaving}
                                <Loader2 class="mr-2 size-4 animate-spin" /> Salvando...
                            {:else}
                                <Save class="mr-2 size-4" /> 
                                <span class="mr-2">Salvar Alterações</span>
                                <kbd class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-black/20 px-1.5 font-mono text-[10px] font-medium text-white opacity-50">
                                    CTRL S
                                </kbd>
                            {/if}
                        </Button>
                    </div>

                </form>
            </Card.Content>
        </Card.Root>
    {/if}
</div>