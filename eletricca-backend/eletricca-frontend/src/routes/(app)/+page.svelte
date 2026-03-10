<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/';
	import { Separator } from '$lib/components/ui/separator/';
	import {
		Phone,
		Search,
		ChartColumn as BarChart3,
		Zap,
		Construction,
		CircleDot
	} from '@lucide/svelte';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Busca de ramais
	let searchQuery = $state('');

	let filteredExtensions = $derived(
		data.extensions.filter((ext) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				ext.extension.toLowerCase().includes(q) ||
				ext.fullname.toLowerCase().includes(q)
			);
		})
	);

	// Saudação baseada na hora
	function getGreeting(): string {
		const hour = new Date().getHours();
		if (hour < 12) return 'Bom dia';
		if (hour < 18) return 'Boa tarde';
		return 'Boa noite';
	}

	function formatDate(): string {
		return new Date().toLocaleDateString('pt-BR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	const firstName = data.user?.first_name || 'Usuário';
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
			{getGreeting()}, {firstName}
		</h1>
		<p class="mt-1 text-sm capitalize text-muted-foreground">
			{formatDate()}
		</p>
	</div>

	<!-- Grid principal -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Ramais (col-span-2) -->
		<div class="lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-center gap-2">
							<Phone class="size-5 text-primary" />
							<Card.Title class="text-lg">Ramais</Card.Title>
							<Badge variant="secondary">{data.extensions.length}</Badge>
						</div>
						<div class="relative w-full sm:w-64">
							<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Buscar ramal ou nome..."
								bind:value={searchQuery}
								class="h-9 pl-9"
							/>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="custom-scrollbar relative max-h-[500px] overflow-y-auto">
						<Table.Root>
							<Table.Header class="sticky top-0 z-10 border-b bg-card">
								<Table.Row class="border-b border-muted">
									<Table.Head class="w-24 text-primary">Ramal</Table.Head>
									<Table.Head class="text-primary">Nome</Table.Head>
									<Table.Head class="w-24 text-right text-primary">Status</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each filteredExtensions as ext (ext.extension)}
									{@const isOnline = ext.addr && ext.addr.trim() !== '' && ext.addr.trim() !== '-'}
									<Table.Row class="border-b border-muted transition-colors hover:bg-muted/30">
										<Table.Cell class="font-mono font-semibold text-foreground">
											{ext.extension}
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{ext.fullname || '—'}
										</Table.Cell>
										<Table.Cell class="text-right">
											{#if isOnline}
												<Badge variant="outline" class="gap-1 border-green-300 text-green-600">
													<CircleDot class="size-3" />
													Online
												</Badge>
											{:else}
												<Badge variant="outline" class="gap-1 text-muted-foreground">
													<CircleDot class="size-3" />
													Offline
												</Badge>
											{/if}
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={3} class="py-8 text-center text-muted-foreground">
											{#if searchQuery}
												Nenhum ramal encontrado para "{searchQuery}"
											{:else}
												Nenhum ramal disponível
											{/if}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</Card.Content>
				{#if filteredExtensions.length !== data.extensions.length}
					<Card.Footer class="text-xs text-muted-foreground">
						Mostrando {filteredExtensions.length} de {data.extensions.length} ramais
					</Card.Footer>
				{/if}
			</Card.Root>
		</div>

		<!-- Sidebar (col-span-1) -->
		<div class="space-y-6">
			<!-- Relatórios placeholder -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center gap-2">
						<BarChart3 class="size-5 text-primary" />
						<Card.Title class="text-lg">Relatórios</Card.Title>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
						<Construction class="mb-3 size-10 text-muted-foreground/40" />
						<p class="text-sm font-medium text-muted-foreground">Em breve</p>
						<p class="mt-1 text-xs text-muted-foreground/70">
							Relatórios e exportações estarão disponíveis aqui
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Acesso Rápido placeholder -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center gap-2">
						<Zap class="size-5 text-primary" />
						<Card.Title class="text-lg">Acesso Rápido</Card.Title>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
						<Construction class="mb-3 size-10 text-muted-foreground/40" />
						<p class="text-sm font-medium text-muted-foreground">Em breve</p>
						<p class="mt-1 text-xs text-muted-foreground/70">
							Atalhos e ações rápidas estarão disponíveis aqui
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: hsl(var(--muted-foreground) / 0.2);
		border-radius: 4px;
	}
	.custom-scrollbar:hover::-webkit-scrollbar-thumb {
		background: hsl(var(--muted-foreground) / 0.4);
	}
</style>
