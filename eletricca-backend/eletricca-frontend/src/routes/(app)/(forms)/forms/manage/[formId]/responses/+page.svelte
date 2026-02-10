<script lang="ts">
	import {
		Search,
		ArrowLeft,
		ChevronLeft,
		ChevronRight,
		Eye,
		Calendar,
		User,
		Users,
		FileText,
		CircleCheck,
		Clock,
		TrendingUp,
		ListChecks,
		Mail
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Avatar from '$lib/components/ui/avatar';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchValue = $state(data.search || '');
	let searchTimeout: ReturnType<typeof setTimeout>;

	function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchValue = target.value;

		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const url = new URL(page.url);
			url.searchParams.set('search', searchValue);
			url.searchParams.set('page', '1');
			goto(url.toString(), { keepFocus: true, noScroll: true });
		}, 500);
	}

	function handlePageChange(newPage: number) {
		const url = new URL(page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString(), { keepFocus: true });
	}

	function formatDateTime(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getInitials(firstName: string, lastName: string): string {
		return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
	}
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex items-start gap-3">
			<Button
				variant="ghost"
				size="icon"
				class="mt-0.5 shrink-0"
				onclick={() => goto(`/forms/manage/${data.form.id}`)}
			>
				<ArrowLeft class="size-5" />
			</Button>
			<div>
				<h2 class="text-2xl font-bold tracking-tight text-primary">Respostas</h2>
				<p class="text-muted-foreground">{data.form.title}</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<Button variant="outline" onclick={() => goto(`/forms/manage/${data.form.id}`)}>
				<FileText class="mr-2 size-4" />
				Editar Formulário
			</Button>
			<Button variant="outline" onclick={() => goto(`/forms/manage/${data.form.id}/assign`)}>
				<Users class="mr-2 size-4" />
				Atribuir
			</Button>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Respostas</p>
						<p class="text-2xl font-bold">{data.stats.totalResponses}</p>
					</div>
					<div class="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
						<CircleCheck class="size-5 text-green-600 dark:text-green-400" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Pendentes</p>
						<p class="text-2xl font-bold text-amber-600">{data.stats.pendingAssignments}</p>
					</div>
					<div class="rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
						<Clock class="size-5 text-amber-600 dark:text-amber-400" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
						<p class="text-2xl font-bold text-blue-600">{data.stats.completionRate}%</p>
					</div>
					<div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
						<TrendingUp class="size-5 text-blue-600 dark:text-blue-400" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Campos</p>
						<p class="text-2xl font-bold">{data.stats.fieldCount}</p>
					</div>
					<div class="rounded-full bg-muted p-3">
						<ListChecks class="size-5 text-muted-foreground" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Main Card -->
	<Card.Root>
		<Card.Header class="pb-3">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<Card.Title class="text-lg">Lista de Respostas</Card.Title>
				<div class="relative w-full max-w-sm">
					<Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Buscar por nome, email ou período..."
						class="w-full pl-9"
						value={searchValue}
						oninput={handleSearchInput}
					/>
				</div>
			</div>
		</Card.Header>

		<Card.Content>
			{#if data.responses.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<div class="rounded-full bg-muted p-4">
						<FileText class="size-8 text-muted-foreground" />
					</div>
					<h3 class="mt-4 text-lg font-medium">Nenhuma resposta encontrada</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						{#if data.search}
							Nenhum resultado para "{data.search}"
						{:else}
							Este formulário ainda não recebeu respostas
						{/if}
					</p>
					{#if !data.search}
						<Button class="mt-4" onclick={() => goto(`/forms/manage/${data.form.id}/assign`)}>
							<Users class="mr-2 size-4" />
							Atribuir a Usuários
						</Button>
					{/if}
				</div>
			{:else}
				<!-- Desktop Table -->
				<div class="hidden md:block">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Usuário</Table.Head>
								<Table.Head>Período</Table.Head>
								<Table.Head>Enviado em</Table.Head>
								<Table.Head>Atribuído por</Table.Head>
								<Table.Head class="w-[100px]"></Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.responses as response (response.response_id)}
								<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/forms/manage/${data.form.id}/responses/${response.response_id}`)}>
									<Table.Cell>
										<div class="flex items-center gap-3">
											<Avatar.Root class="size-9">
												<Avatar.Fallback class="bg-primary/10 text-primary text-sm">
													{getInitials(response.first_name, response.last_name)}
												</Avatar.Fallback>
											</Avatar.Root>
											<div>
												<p class="font-medium">{response.first_name} {response.last_name}</p>
												<p class="text-xs text-muted-foreground">{response.email}</p>
											</div>
										</div>
									</Table.Cell>
									<Table.Cell>
										{#if response.period_reference}
											<Badge variant="outline" class="font-normal">
												{response.period_reference}
											</Badge>
										{:else}
											<span class="text-muted-foreground">-</span>
										{/if}
									</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-1.5 text-sm">
											<Calendar class="size-3.5 text-muted-foreground" />
											{formatDateTime(response.submitted_at)}
										</div>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm text-muted-foreground">
											{response.assigned_by_name}
										</span>
									</Table.Cell>
									<Table.Cell>
										<Button variant="ghost" size="sm">
											<Eye class="mr-2 size-4" />
											Ver
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>

				<!-- Mobile Cards -->
				<div class="space-y-3 md:hidden">
					{#each data.responses as response (response.response_id)}
						<button
							type="button"
							class="w-full rounded-lg border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm"
							onclick={() => goto(`/forms/manage/${data.form.id}/responses/${response.response_id}`)}
						>
							<div class="flex items-start justify-between gap-3">
								<div class="flex items-center gap-3">
									<Avatar.Root class="size-10">
										<Avatar.Fallback class="bg-primary/10 text-primary">
											{getInitials(response.first_name, response.last_name)}
										</Avatar.Fallback>
									</Avatar.Root>
									<div>
										<p class="font-medium">{response.first_name} {response.last_name}</p>
										<p class="text-xs text-muted-foreground">{response.email}</p>
									</div>
								</div>
								<Badge class="shrink-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
									<CircleCheck class="mr-1 size-3" />
									Respondido
								</Badge>
							</div>

							<div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
								{#if response.period_reference}
									<Badge variant="outline" class="font-normal text-xs">
										{response.period_reference}
									</Badge>
								{/if}
								<div class="flex items-center gap-1">
									<Calendar class="size-3" />
									{formatDateTime(response.submitted_at)}
								</div>
							</div>
						</button>
					{/each}
				</div>

				<!-- Pagination -->
				{#if data.pagination.totalItems > data.pagination.limit}
					<Pagination.Root
						count={data.pagination.totalItems}
						perPage={data.pagination.limit}
						page={data.pagination.page}
					>
						{#snippet children({ pages, currentPage })}
							<Pagination.Content class="mt-6">
								<Pagination.Item>
									<Pagination.PrevButton
										class="cursor-pointer"
										disabled={currentPage <= 1}
										onclick={() => handlePageChange(currentPage - 1)}
									>
										<ChevronLeft class="size-4" />
										<span class="hidden sm:block">Anterior</span>
									</Pagination.PrevButton>
								</Pagination.Item>

								{#each pages as p (p.key)}
									{#if p.type === 'ellipsis'}
										<Pagination.Item>
											<Pagination.Ellipsis />
										</Pagination.Item>
									{:else}
										<Pagination.Item>
											<Pagination.Link
												page={p}
												isActive={currentPage === p.value}
												onclick={(e: MouseEvent) => {
													e.preventDefault();
													handlePageChange(p.value);
												}}
											>
												{p.value}
											</Pagination.Link>
										</Pagination.Item>
									{/if}
								{/each}

								<Pagination.Item>
									<Pagination.NextButton
										onclick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage * data.pagination.limit >= data.pagination.totalItems}
										class="cursor-pointer"
									>
										<span class="hidden sm:block">Próximo</span>
										<ChevronRight class="size-4" />
									</Pagination.NextButton>
								</Pagination.Item>
							</Pagination.Content>
						{/snippet}
					</Pagination.Root>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>
</div>
