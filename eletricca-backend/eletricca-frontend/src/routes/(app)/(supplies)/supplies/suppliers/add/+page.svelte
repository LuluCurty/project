<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    import type { ActionData } from './$types';

    import * as Card from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from '$lib/components/ui/textarea';
    import { ChevronLeft, Save, LoaderCircle, Truck } from '@lucide/svelte';

    let { form }: { form: ActionData } = $props();

    let isSubmitting = $state(false);

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
        <Button variant="ghost" size="icon" onclick={() => goto('/supplies/suppliers')}>
            <ChevronLeft class="size-5" />
        </Button>
        <h1 class="text-2xl font-bold tracking-tight">Novo Fornecedor</h1>
    </div>

    <Card.Root>
        <Card.Header>
            <div class="flex items-center gap-2">
                <div class="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Truck class="size-5" />
                </div>
                <div>
                    <Card.Title>Dados da Empresa</Card.Title>
                    <Card.Description>Preencha os dados para registrar um novo parceiro.</Card.Description>
                </div>
            </div>
        </Card.Header>

        <Card.Content class="pt-6">
            <form method="POST"
                use:enhance={() => {
                    isSubmitting = true;
                    return async ({ result, update }) => {
                        isSubmitting = false;
                        if (result.type === 'failure') {
                            toast.error(String((result.data as any)?.error) || 'Erro ao salvar.');
                        } else if (result.type === 'redirect') {
                            toast.success('Fornecedor cadastrado com sucesso!');
                        }
                        await update();
                    };
                }}
                class="space-y-5"
            >
                <!-- Nome fantasia + Razão social -->
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                        <Label for="supplier_name">Nome / Fantasia *</Label>
                        <Input id="supplier_name" name="supplier_name" placeholder="Ex: Distribuidora ABC" required />
                    </div>
                    <div class="space-y-2">
                        <Label for="supplier_legal_name">Razão Social *</Label>
                        <Input id="supplier_legal_name" name="supplier_legal_name" placeholder="Ex: ABC Comércio Ltda." required />
                    </div>
                </div>

                <!-- CNPJ + Telefone -->
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                        <Label for="supplier_legal_identifier">CNPJ *</Label>
                        <Input id="supplier_legal_identifier" name="supplier_legal_identifier" placeholder="00.000.000/0001-00" required />
                    </div>
                    <div class="space-y-2">
                        <Label for="supplier_telephone">Telefone / WhatsApp</Label>
                        <Input id="supplier_telephone" name="supplier_telephone" type="tel" placeholder="(00) 00000-0000" />
                    </div>
                </div>

                <!-- Email -->
                <div class="space-y-2">
                    <Label for="supplier_email">Email Comercial</Label>
                    <Input id="supplier_email" name="supplier_email" type="email" placeholder="contato@fornecedor.com" />
                </div>

                <!-- Endereço -->
                <div class="space-y-2">
                    <Label for="supplier_address">Endereço</Label>
                    <Input id="supplier_address" name="supplier_address" placeholder="Rua, Número, Bairro, Cidade..." />
                </div>

                <!-- Descrição -->
                <div class="space-y-2">
                    <Label for="description">Descrição / Observações</Label>
                    <Textarea id="description" name="description" class="h-20 resize-none"
                        placeholder="Notas internas sobre este fornecedor..." />
                </div>

                {#if form?.error}
                    <p class="text-sm text-destructive">{form.error}</p>
                {/if}

                <div class="flex justify-end gap-3 border-t pt-4">
                    <Button type="button" variant="outline" onclick={() => goto('/supplies/suppliers')}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {#if isSubmitting}
                            <LoaderCircle class="mr-2 size-4 animate-spin" /> Salvando...
                        {:else}
                            <Save class="mr-2 size-4" /> Salvar Fornecedor
                            <span class="ml-2 border-l border-white/20 pl-2 text-xs font-normal opacity-50">Ctrl S</span>
                        {/if}
                    </Button>
                </div>
            </form>
        </Card.Content>
    </Card.Root>
</div>
