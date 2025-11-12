<script>
	import { Plus, FileUp, Search, Trash, FileDown } from '@lucide/svelte';
	// quando eu aprender a usar as tabelas do shadcn eu volto aqui
	// import de componentes
	import TablePagFoot from '$lib/components/ui/uniqueTables/table-template/TablePagFoot.svelte';
	import TablePopup from '$lib/components/ui/popups/TablePopup.svelte';
	import TableTitle from '$lib/components/ui/titles/TableTitle.svelte';
	
	let loading = $state(false);
	let clients = $state([]);
	let limit = $state(20);
	let search = $state('');
	// usado na TableFoot
	let page = $state(1);
	let totalPages = $state(1); 
	let totalItems = $state(1);
	// usado nas checkbox para fazer multipla seleção
	let allSelectedClients = $state(false);
	let selectedClients = $state([])

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
			totalItems = data.totalItems;
			loading = true;
		} catch (error) {
			console.error(error);
			loading = false;
		}
	}
	async function importClientFile() {
		console.log("nao implementado ainda");
	}
	async function exportClientFile() {
		console.log("nao implementado ainda");		
	}
	// funções usadas no popup
	function updateClient(client) {
		console.log("Editado");
		// mandar o id como parametro para a pagina client/edit/${id}
	}
	async function deleteClient(client) {
		if(confirm(`Deseja Excluir cliente ${client.client_first_name}`)){
			const res = await fetch(`/api/client/delete/${client.id}`,{
				method: "DELETE",
				credentials: "include",
			});
			if(!res.ok){
				throw new Error("ERRO AO EXCLUIR");
			}
			console.log('Client excluido:', client.id);
			await getClients();
		}
	}
</script>

<TableTitle title='Cliente'/>

<div class="main-app-table-wrapper h-[575px] p-3.5">
	<div class="main-app-buttons mb-2.5">
		<div class="app-buttons-wrapper flex items-center justify-between">
			<div>
				<button 
					class="top-button general-buttons" type="button" onclick={addNewClient}>
					<Plus />
					<span>Add</span>
				</button>
				<button 
					class="top-button general-buttons" type="button" onclick={importClientFile}>
					<FileUp />
					<span>Import</span>
				</button>
				<button type="button" class="top-button general-buttons" onclick={exportClientFile}>
					<FileDown/>
					<span>Export</span>
				</button>
				<input class="hidden" />
			</div>
			<form id="search-form">
				<div
					class="search-wrapper focus-within:border-[#155dfc]! inline-block rounded-sm border-2
                        border-solid border-[#e2e8ef] bg-white align-middle transition-colors"
				>
					<div class="ml-1 pl-1 pr-1">
						<span class="inline-block! relative bottom-[-7px] text-[#10131a]">
							<Search />
						</span>
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
										<TablePopup
											onDelete={()=> deleteClient(client)}
											onEdit={()=> updateClient(client)}
										/>
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
				<TablePagFoot bind:pagination={limit}
					bind:totalPages={totalPages}
					bind:totalItems={totalItems}
					bind:page={page}
				/>
			</div>
		</div>
	</div>
</div>
