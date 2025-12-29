<script lang="ts">
    import { goto } from '$app/navigation';
    import { ChevronLeft, Save, LoaderCircle, Truck, CircleAlert } from '@lucide/svelte';
    
    // Componentes Shadcn
    import * as Card from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea'; // Importante para endereço

    // Estado
    let isLoading = $state(false);
    let errorMessage = $state('');

    let formData = $state({
        supplier_name: '',
        supplier_email: '',
        supplier_telephone: '',
        supplier_address: ''
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMessage = '';

        try {
            const res = await fetch('/api/supplier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                // Captura erro do backend (ex: email duplicado)
                throw new Error(data.error || 'Erro ao criar fornecedor');
            }

            alert('Fornecedor cadastrado com sucesso!');
            goto('/suppliers'); // Volta para a lista

        } catch (error: any) {
            console.error(error);
            errorMessage = error.message;
        } finally {
            isLoading = false;
        }
    }

    // 2. Eventos do teclaod:
    function handleKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 's') {
			event.preventDefault();
			if (isLoading) {
				return;
			}
			handleSubmit(event);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="max-w-2xl mx-auto space-y-4 p-4">
    
    <div class="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onclick={() => goto('/suppliers')}>
            <ChevronLeft class="size-5" />
        </Button>
        <h1 class="text-2xl font-bold tracking-tight">Novo Fornecedor</h1>
    </div>

    <Card.Root>
        <Card.Header>
            <div class="flex items-center gap-2">
                <div class="p-2 bg-blue-100 text-blue-600 rounded-full">
                    <Truck class="size-5" />
                </div>
                <div>
                    <Card.Title>Dados da Empresa</Card.Title>
                    <Card.Description>Preencha os dados para registrar um novo parceiro.</Card.Description>
                </div>
            </div>
        </Card.Header>

        <Card.Content class="pt-6">
            <form onsubmit={handleSubmit} class="space-y-6">
                
                <div class="space-y-2">
                    <Label for="name">Nome da Empresa / Fornecedor *</Label>
                    <Input 
                        id="name" 
                        placeholder="Ex: Construtora ABC Ltda" 
                        required 
                        bind:value={formData.supplier_name}
                    />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label for="email">Email Comercial *</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder="contato@fornecedor.com" 
                            required 
                            bind:value={formData.supplier_email}
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="phone">Telefone / WhatsApp *</Label>
                        <Input 
                            id="phone" 
                            type="tel" 
                            placeholder="(00) 0000-0000" 
                            required 
                            bind:value={formData.supplier_telephone}
                        />
                    </div>
                </div>

                <div class="space-y-2">
                    <Label for="address">Endereço Completo</Label>
                    <Textarea 
                        id="address" 
                        placeholder="Rua, Número, Bairro, Cidade..." 
                        class="resize-none h-24"
                        bind:value={formData.supplier_address}
                    />
                </div>

                {#if errorMessage}
                    <div class="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                        <CircleAlert class="size-4" />
                        <span>{errorMessage}</span>
                    </div>
                {/if}

                <div class="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onclick={() => goto('/suppliers')}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {#if isLoading}
                            <LoaderCircle class="mr-2 size-4 animate-spin" /> Salvando...
                        {:else}
                            <Save class="mr-2 size-4" />
                            <span>Salvar Fornecedor</span>
                            <span class="ml-2 border-l border-white/20 pl-2 text-xs font-normal opacity-50">
									Ctrl S
							</span>
                        {/if}
                    </Button>
                </div>
            </form>
        </Card.Content>
    </Card.Root>
</div>