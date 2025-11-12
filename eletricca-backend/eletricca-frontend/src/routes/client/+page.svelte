<script>
	import {
		Plus,
		FileUp,
		Search,
		Ellipsis,
		CircleX,
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
	import DataTable from '$lib/components/ui/uniqueTables/clients/data-table.svelte';
	import { columns } from '$lib/components/ui/uniqueTables/clients/columns';
	// quando eu aprender a usar as tabelas do shadcn eu volto aqui

	import TablePagFoot from '$lib/components/ui/uniqueTables/table-template/TablePagFoot.svelte';
	
	let loading = $state(false);
	let clients = $state([]);
	let page = $state(1);
	let limit = $state(20);
	let search = $state('');
	let totalPages = 1;

	$effect(() => {
		page = 1;
		getClients();
	});

	function addNewClient() {
		window.location.href = 'client/add';
	}
	async function getClients() {
		try {
			const res = await fetch(
				`/api/client?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
				{
					credentials: 'include'
				}
			);
			const data = await res.json();
			clients = data.clients;
			totalPages = data.totalPages;
			loading = true;
		} catch (error) {
			console.error(error);
			loading = false;
		}
	}
	function prevPage() {
		if (page > 1) {
			page--;
		}
		getClients();
	}
	function nextPage() {
		if (page < totalPages) {
			page++;
		}
		getClients();
	}
	function handleSearch() {
		page = 1;
		getClients();
	}
</script>

<div
	class="h-[50px] items-center border-b border-[#e7ecf0] bg-white
    font-normal leading-[50px] shadow-[0px_1px_10px_rgba(223,225,229,0.5)]"
>
	<div class="pl-[6]! items-center">
		<h3 class="pl-6! items-center text-[1.17rem]">Clientes</h3>
	</div>
</div>

<div class="main-app-table-wrapper h-[575px] p-3.5">
	<div class="main-app-buttons mb-2.5">
		<div class="app-buttons-wrapper flex items-center justify-between">
			<div>
				<button class="top-button general-buttons" onclick={addNewClient}>
					<Plus />
					<span>Add</span>
				</button>
				<button class="top-button general-buttons">
					<FileUp />
					<span>Import</span>
				</button>
				<input class="hidden" />
			</div>
			<form id="search-form">
				<div
					class="search-wrapper focus-within:border-[#155dfc]! inline-block rounded-sm border-2
                        border-solid border-[#e2e8ef] bg-white align-middle transition-colors"
				>
					<div class="ml-1 pl-1 pr-1">
						<span class="inline-block! relative bottom-[-7px] text-[#10131a]"><Search /></span>
						<input
							class="inline-block cursor-text border-none pb-1.5 pt-1.5 focus:ring-0"
							type="text"
							id="search-input"
							placeholder="Pesquisar"
							bind:value={search}
						/>
					</div>
				</div>
			</form>
		</div>
	</div>

	<div class="wrapper clear-both">
		<div class="main-container text-[#10131a]">
			<div class="main-table overflow-auto overflow-x-hidden">
				<table class="w-full">
					<thead>
						<tr
							class="[*]:uppercase [*]:text-left
                            [*]:align-middle [*]:font-normal
                            [*]:h-10 [*]:whitespace-nowrap
                            [*]:px-2 [*]:text-xs [*]:break-all
                            text-[#596680]
                            "
						>
							<th class="font-normal" colspan="1">
								<button aria-label="select-all">
									<input type="checkbox" name="select-all" id="select-all" />
								</button>
							</th>
							<th class="font-normal" colspan="1"><div>Nome</div></th>
							<th class="font-normal" colspan="1"><div>sobrenome</div></th>
							<th class="font-normal" colspan="1"><div>telefone</div></th>
							<th class="font-normal" colspan="1"><div>email</div></th>
							<th class="font-normal" colspan="1"><div>Opções</div></th>
						</tr>
					</thead>
					<tbody
						id="supplies-list-content"
						class="[*]:text-left
                    bg-white"
					>
						{#if loading}
							{#each clients as client}
								<tr>
									<td colspan="1">
										<input type="checkbox" name="selecionar-este" id="select-this" />
									</td>
									<td colspan="1"><span>{client.client_first_name}</span></td>
									<td colspan="1"><span>{client.client_last_name}</span></td>
									<td colspan="1"><span>{client.client_telephone}</span></td>
									<td colspan="1"><span>{client.client_email}</span></td>
									<td colspan="1">
										<div>
											<button type="button"><Ellipsis /></button>
											<button type="button"><CircleX /></button>
										</div>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td class="text-center" colspan="6"> NO DATA </td>
							</tr>
						{/if}
					</tbody>
				</table>
				<TablePagFoot bind:pagination={limit}/>
			</div>
		</div>
	</div>
</div>
