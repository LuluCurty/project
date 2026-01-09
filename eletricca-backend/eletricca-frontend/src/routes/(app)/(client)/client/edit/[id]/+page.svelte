<script lang="ts">
	import { page } from '$app/state'; // SvelteKit 5 state
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ChevronLeft, Save, LoaderCircle, UserCog, CircleAlert } from '@lucide/svelte';

	// Componentes Shadcn
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	// Estados
	let clientId = page.params.id;
	let isLoadingData = $state(true); // Carregamento inicial (GET)
	let isSaving = $state(false); // Carregamento do salvamento (PUT)
	let errorMessage = $state('');

	// Dados do formulário (chaves combinam com o que o teu backend PUT espera)
	let formData = $state({
		client_first_name: '',
		client_last_name: '',
		client_email: '',
		client_telephone: ''
	});

	// 1. Carregar dados ao abrir a página
	onMount(async () => {
		try {
			const res = await fetch(`/api/client/${clientId}`, { credentials: 'include' });
			if (res.ok) {
				const { client } = await res.json();
				formData.client_first_name = client.client_first_name;
				formData.client_last_name = client.client_last_name;
				formData.client_email = client.client_email;
				formData.client_telephone = client.client_telephone;
			} else {
				errorMessage = 'Cliente não encontrado.';
			}
		} catch (e) {
			console.error(e);
			errorMessage = 'Erro ao carregar dados do cliente.';
		} finally {
			isLoadingData = false;
		}
	});

	// 2. Enviar atualização
	async function handleUpdate(e: Event) {
		e.preventDefault();
		isSaving = true;
		errorMessage = '';

		try {
			// Nota: A rota inclui '/edit' conforme teu backend
			const res = await fetch(`/api/client/edit/${clientId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData) // Envia firstName, lastName, etc.
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || data.message || 'Erro ao atualizar');
			}

			alert('Cliente atualizado com sucesso!');
			goto('/client');
		} catch (error: any) {
			console.error(error);
			errorMessage = error.message;
		} finally {
			isSaving = false;
		}
	}

	// 3. Atalho do teclaodo
	function handleKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 's') {
			event.preventDefault();
			if (isSaving) {
				return;
			}
			handleUpdate(event);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="mx-auto max-w-2xl space-y-4 p-4">
	<div class="mb-6 flex items-center gap-2">
		<Button variant="ghost" size="icon" onclick={() => goto('/client')}>
			<ChevronLeft class="size-5" />
		</Button>
		<h1 class="text-2xl font-bold tracking-tight">Editar Cliente</h1>
	</div>

	{#if isLoadingData}
		<div class="flex flex-col items-center justify-center space-y-4 py-12">
			<LoaderCircle class="size-8 animate-spin text-primary" />
			<p class="text-muted-foreground">Carregando informações...</p>
		</div>
	{:else}
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<div class="rounded-full bg-orange-100 p-2 text-orange-600">
						<UserCog class="size-5" />
					</div>
					<div>
						<Card.Title>Dados Pessoais</Card.Title>
						<Card.Description>Atualize as informações do cliente ID #{clientId}.</Card.Description>
					</div>
				</div>
			</Card.Header>

			<Card.Content class="pt-6">
				<form onsubmit={handleUpdate} class="space-y-6">
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="firstname">Primeiro Nome</Label>
							<Input id="firstname" bind:value={formData.client_first_name} required />
						</div>

						<div class="space-y-2">
							<Label for="lastname">Sobrenome</Label>
							<Input id="lastname" bind:value={formData.client_last_name} required />
						</div>
					</div>

					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input id="email" type="email" bind:value={formData.client_email} required />
					</div>

					<div class="space-y-2">
						<Label for="phone">Telefone</Label>
						<Input id="phone" type="tel" bind:value={formData.client_telephone} required />
					</div>

					{#if errorMessage}
						<div
							class="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600"
						>
							<CircleAlert class="size-4" />
							<span>{errorMessage}</span>
						</div>
					{/if}

					<div class="flex justify-end gap-3 border-t pt-4">
						<Button type="button" variant="outline" onclick={() => goto('/client')}>
							Cancelar
						</Button>
						<Button type="submit" disabled={isSaving} class="relative w-full sm:w-auto">
							{#if isSaving}
								<LoaderCircle class="mr-2 size-4 animate-spin" /> Salvando...
							{:else}
								<Save class="mr-2 size-4" />
								<span>Atualizar Cliente</span>
								<span class="ml-2 border-l border-white/20 pl-2 text-xs font-normal opacity-50">
									Ctrl S
								</span>
							{/if}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
