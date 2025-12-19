<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let isAuthenticated = $state(false);

	interface ApiResponse {
		account: Extension[];
		total_item: number;
		total_page: number;
		page: number;
	}
	interface Extension {
		fullname: string;
		extension: string;
		addr: string;
	}

	let extensions = $state<Extension[]>([]);
	let apiResponse = $state<ApiResponse>();
	async function getExtensions() {
		try {
			const res = await fetch(`/api/ucm/`, {
				credentials: 'include'
			});

			const { data } = await res.json();

			if (data.status !== 0) {
				throw new Error(data.message);
			}

			apiResponse = data.response;
			if (apiResponse) {
				extensions = apiResponse.account;
			} else {
				throw new Error('Data missing' + data.message);
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function authenticate() {
		try {
			const res = await fetch('/api/auth/check', {
				credentials: 'include'
			});

			if (!res.ok) {
				goto('/login');
			}

			const data = await res.json();
			isAuthenticated = data.authenticated;

			if (!isAuthenticated) {
				goto('/login');
			}

			isAuthenticated = true;
		} catch (e) {
			console.error(e);
		}
		getExtensions();
	}

	onMount(authenticate);
</script>
<Tabs.Root value="ramais" class="w-full border-muted">
	<Tabs.List
		class="grid w-full grid-cols-3 rounded-lg border-b
				border-primary/20 bg-muted/30 p-1 shadow-inner md:w-[500px]"
	>
		<Tabs.Trigger value="ramais">Ramais</Tabs.Trigger>
		<Tabs.Trigger value="relatorios">Relatórios</Tabs.Trigger>
		<Tabs.Trigger value="acesso-rapido">Acesso Rápido</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="ramais" class="mt-4 ">
		<Card.Root class="border-none border-muted">
			<Card.Header>
				<Card.Title>Lista de Ramais</Card.Title>
			</Card.Header>

			<Card.Content class="border-muted">
				<div class="relative max-h-[500px] overflow-y-auto">
					<Table.Root>
						<Table.Caption>Dados dos ramais</Table.Caption>
						<Table.Header class="border-b border-muted bg-card">
							<Table.Row class="border-b border-muted">
								<Table.Head class="w-[100px] text-primary">Ramal</Table.Head>
								<Table.Head class="text-primary">Nome</Table.Head>
								<Table.Head class="text-primary">Email</Table.Head>
								<Table.Head class="text-start text-primary">IP</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each extensions as extension}
								<Table.Row class="border-b border-muted transition-colors hover:bg-gray-300/50">
									<Table.Cell class="font-semibold text-muted-foreground">{extension.extension}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{extension.fullname}</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">a@a</Table.Cell>

									<Table.Cell class="text-start font-mono text-xs">
										{@const ips = extension.addr
											? extension.addr.split(',').map((ip) => ip.trim())
											: []}

										{#if ips.length > 0}
											<div class="flex flex-row items-center justify-start gap-2">
												<Badge
													variant="secondary"
													class="bg-slate-200/70 text-slate-700 hover:bg-slate-300"
												>
													{ips[0]}
												</Badge>

												{#if ips.length > 1}
													<Tooltip.Root>
														<Tooltip.Trigger
															class="inline-flex h-6 w-6 
                                    							cursor-help items-center justify-center 
                                   								rounded-full border border-dashed font-bold text-muted-foreground hover:bg-muted"
														>
															...
														</Tooltip.Trigger>
														<Tooltip.Content
															class="z-50 flex flex-col items-start border bg-popover p-2 shadow-lg"
														>
															{#each ips.slice(1) as ip}
																<Badge class="bg-slate-200/70 font-mono text-xs text-slate-700">
																	{ip}
																</Badge>
															{/each}
														</Tooltip.Content>
													</Tooltip.Root>
												{/if}
											</div>
										{:else}
											<Badge
												variant="destructive"
												class="bg-slate-200 text-slate-700 hover:bg-slate-300"
											>
												Não Registrado
											</Badge>
										{/if}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
			<Card.Footer class="text-xs text-muted-foreground">
				Ultima atualização: {new Date().toLocaleString()}
			</Card.Footer>
		</Card.Root>
	</Tabs.Content>

	<Tabs.Content value="relatorios">Em criação</Tabs.Content>

	<Tabs.Content value="acesso-rapido">Em criação 2</Tabs.Content>
</Tabs.Root>
