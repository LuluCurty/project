<script lang="ts">
    import { goto } from '$app/navigation';
    import { ChevronLeft, Save, Loader2, UserPlus, AlertCircle } from 'lucide-svelte';
    
    // Componentes Shadcn
    import * as Card from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';

    // Estado do formulário
    let isLoading = $state(false);
    let errorMessage = $state('');

    // Objeto correspondente ao teu Schema SQL
    let formData = $state({
        client_first_name: '',
        client_last_name: '',
        client_email: '',
        client_telephone: ''
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMessage = '';

        try {
            const res = await fetch('/api/client', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

			const data = await res.json();

            if (!res.ok) {
                // Se o email já existir (constraint unique), o backend deve avisar
                throw new Error(data.error || 'Erro ao criar cliente');
            }

            alert('Cliente cadastrado com sucesso!');
            goto('/client'); // Volta para a lista

        } catch (error: any) {
            console.error(error);
            errorMessage = error.message;
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="max-w-2xl mx-auto space-y-4">
    
    <div class="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onclick={() => goto('/client')}>
            <ChevronLeft class="size-5" />
        </Button>
        <h1 class="text-2xl font-bold tracking-tight">Novo Cliente</h1>
    </div>

    <Card.Root>
        <Card.Header>
            <div class="flex items-center gap-2">
                <div class="p-2 bg-primary/10 rounded-full">
                    <UserPlus class="size-5 text-primary" />
                </div>
                <div>
                    <Card.Title>Dados Pessoais</Card.Title>
                    <Card.Description>Preencha os campos abaixo para cadastrar um novo cliente.</Card.Description>
                </div>
            </div>
        </Card.Header>

        <Card.Content class="pt-6">
            <form onsubmit={handleSubmit} class="space-y-6">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label for="firstname">Primeiro Nome *</Label>
                        <Input 
                            id="firstname" 
                            placeholder="Ex: João" 
                            required 
                            bind:value={formData.client_first_name}
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="lastname">Sobrenome *</Label>
                        <Input 
                            id="lastname" 
                            placeholder="Ex: Silva" 
                            required 
                            bind:value={formData.client_last_name}
                        />
                    </div>
                </div>

                <div class="space-y-2">
                    <Label for="email">Email *</Label>
                    <Input 
                        id="email" 
                        type="email" 
                        placeholder="cliente@exemplo.com" 
                        required 
                        bind:value={formData.client_email}
                    />
                    <p class="text-[11px] text-muted-foreground">Este email deve ser único no sistema.</p>
                </div>

                <div class="space-y-2">
                    <Label for="phone">Telefone / Celular *</Label>
                    <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="(00) 00000-0000" 
                        required 
                        bind:value={formData.client_telephone}
                    />
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t">

                    {#if errorMessage}
                <div class="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md animate-in fade-in slide-in-from-top-1">
                    <AlertCircle class="size-4" />
                    <span class="font-medium">{errorMessage}</span>
                </div>
            {/if}

            <div class="flex justify-end gap-3 pt-4 border-t">
                </div>


                    <Button type="button" variant="outline" onclick={() => goto('/client')}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {#if isLoading}
                            <Loader2 class="mr-2 size-4 animate-spin" /> Salvando...
                        {:else}
                            <Save class="mr-2 size-4" /> Cadastrar Cliente
                        {/if}
                    </Button>
                </div>

            </form>
        </Card.Content>
    </Card.Root>
</div>