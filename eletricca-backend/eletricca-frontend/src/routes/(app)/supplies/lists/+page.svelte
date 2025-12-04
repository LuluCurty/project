<script lang="ts">
	import { Plus, FileUp, Search, Trash, FileDown } from '@lucide/svelte';
	import './s.css';

	// /supplies/lists/ <- pagina referida, colocar em todo começo de +page

	import TablePagFoot from '$lib/components/ui/uniqueTables/table-template/TablePagFoot.svelte';
	import TableTitle from '$lib/components/ui/titles/TableTitle.svelte';
	import TablePopup from '$lib/components/ui/popups/TablePopup.svelte';
	import { goto } from '$app/navigation';
	import { setItemToEdit } from '$lib/state/item-to-edit.svelte';

	type ListStatus = "denied" | "pending" | "approved";
	type Priority = "low" | "medium" | "high";

	interface SupplyList {
		id: number;
		list_name: string;
		list_status: ListStatus;
		priority: Priority;
		client_id: number;
		created_by: number;
		client_first_name?: string;
		client_last_name?: string;
		creator_first_name?: string;
		creator_last_name?:string;
	}
	interface ApiResponse {
		lists: SupplyList[];
		ok: boolean;
		page: number;
		limit: number;
		totalItems: number;
		totalPages: number;
	}
	interface DeleteResponse {
		ok: boolean;
		message: string;
		success?: boolean;
		deletedId?: number;
	}
	interface BatchDeleteResponse {
		ok: boolean;
		message?: string;
		deletedCount: number;
	}

	// page state variables:
	let loading = $state<boolean>(false);
	let items = $state<SupplyList[]>([]); 
	let search = $state<string>('');

	// pagination
	let limit = $state<number>(20);
	let page = $state<number>(1);
	let totalItems = $state<number>(1);
	let totalPages = $state<number>(1);
	let selectedCount = $state<number>(0);

	// variaveis do select
	let selectAll = $state<boolean>(false);
	let selectedItems = $state<Set<number>>(new Set());
	
	$effect(() => {
		getItems();
		page = 1;
	});

	// GET items from API DELETE item from API
	async function getItems() {
		try {
			const res = await fetch(
				`/api/suplist?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, 
				{
					credentials: 'include'	
				}
			);
			const data: ApiResponse = await res.json();
			// Update State
			items = data.lists || [];
			totalItems = data.totalItems || 0;
			totalPages = data.totalPages || 0;

			// Update & Reset Selection and State
			selectedItems.clear();
			selectedCount = 0;
			selectAll = false;

			loading = items.length > 0;			
		} catch (error) {
			console.error(error);
			alert('Erro ao carregar items');
			loading = false;
		}
	};
	async function deleteItem(item: SupplyList) {
		if (!confirm(`Deseja apagar ${item.list_name}?`)) { return; };

		try {
			const res = await fetch(`/api/suplist/${item.id}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!res.ok) {
				throw new Error('Erro ao excluir lista.');
			}

			alert('Lista excluida com sucesso');
			await getItems();
		} catch (error) {
			console.error(error);
			alert('Erro ao deletar item');
		}
	}

	// funções de redirecionamento
	function addItem() {
		goto(`/supplies/lists/add`);
	}
	function updateItem(item: any) {
		setItemToEdit(item);
		goto(`/supplies/lists/edit/${item.id}`);
	}

	// funções do selectbox
	function isSelected(itemId: number): boolean {
		return selectedItems.has(itemId);
	};
	function toggleSelect(itemId: number) {
		if (selectedItems.has(itemId)) {
			selectedItems.delete(itemId);
		} else {
			selectedItems.add(itemId);
		}

		selectedCount = selectedItems.size;
		selectAll = selectedItems.size === items.length;
	};
	function toggleSelectAll () {
		if (selectAll) {
			selectedItems.clear();
			selectedCount = 0;
			selectAll = false;
		} else {
			selectedItems = new Set(items.map(item => item.id));
			selectedCount = selectedItems.size;
			selectAll = true;
		}
	};
	function clearSelection() {
		selectedItems.clear();
		selectedCount = 0;
		selectAll = false;		
	};
	async function batchDelete() {
		if (selectedItems.size === 0) { return; };

		if (!confirm(`Deseja realmente excluir ${selectedItems.size} items?`)) { return; };

		try {
			const res =  await fetch(`/api/suplist/batch-delete`,{
				method: "DELETE",
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					ids: Array.from(selectedItems)
				})
			});
			
			if (!res.ok) { throw new Error(`Erro ao excluir as listas`); };

			const data: BatchDeleteResponse = await res.json();
			alert(data.message);
			await getItems();
		} catch (error) {
			console.error(error);
			alert("Erro ao excluir usuario");
		}

		await getItems();
	};
	// futuro import e export de arquivos excel ou csv
	async function exportClientFile() {
		console.log('funciona?');
	}
	async function importClientFile () {
		console.log('FUNCIONA!');
	}
</script>

<TableTitle title="Lista de Materiais"/>

<div class="main-app-table-wrapper h-[575px] p-3.5">
	<div class="main-app-buttons mb-2.5">
		<div class="app-buttons-wrapper flex items-center justify-between">
			<div>
				<button class="top-button general-buttons" onclick={addItem}>
					<Plus />
					<span>Add</span>
				</button>
				<button class="top-button general-buttons">
					<FileUp />
					<span>Import</span>
				</button>
				<button type="button" class="top-button general-buttons" onclick={exportClientFile}>
					<FileDown />
					<span>Export</span>
				</button>
				<button
					type="button"
					class="top-button general-buttons "
					class:!bg-red-400={selectedCount > 0 }
					class:!bg-red-300={selectedCount === 0 }
					onclick={batchDelete}
					disabled={selectedCount === 0}
				>
					<Trash />
					<span>Apagar</span>
				</button>
			</div>
			<form id="search-form">
				<div
					class="search-wrapper focus-within:border-[#155dfc]! inline-block rounded-sm border-2
                        border-solid border-[#e2e8ef] bg-white align-middle transition-colors"
				>
					<div class="ml-1 pl-1 pr-1">
						<span class="inline-block! relative bottom-[-7px] text-[#10131a]"><Search /></span>
						<input
							class="inline-block cursor-text border-none focus:ring-0 pt-1.5 pb-1.5 "
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
                        <tr class="[*]:uppercase [*]:text-left 
                            [*]:align-middle [*]:font-normal
                            [*]:h-10 [*]:whitespace-nowrap
                            [*]:px-2 [*]:text-xs text-[#596680]
                            [*]:break-all
                            "
                        >
                            <th class="font-normal" colspan="1"><button>-</button></th>
                            <th class="font-normal" colspan="1"><div>lista</div></th>
                            <th class="font-normal" colspan="1"><div>nome do cliente</div></th>
                            <th class="font-normal" colspan="1"><div>status</div></th>
                            <th class="font-normal" colspan="1"><div>prioridade</div></th>
                            <th class="font-normal" colspan="1"><div>criado por</div></th>
                            <th class="font-normal" colspan="1">Opções</th>
                        </tr>
                    </thead>
                    <tbody id="supplies-list-content" class="bg-white
                    [*]:text-left" 
                    >
                        {#if loading} 
							{#each items as item}
								<tr class:bg-gray-200={isSelected}> <!---NAO ESQUECER DISSO-->
									<td colspan="1">
										<input 
										type="checkbox" 
										name="select-this" 
										id="select-this" 
										checked={false} 
										onclick={() => toggleSelect()} /> <!---NAO ESQUECER DISSO-->
									</td>
									<td colspan="1"><span>{item.list_name}</span></td>
									<td colspan="1"><span>{item.client_first_name} {item.client_last_name}</span></td>
									<td colspan="1"><span>{item.list_status}</span></td>
									<td colspan="1"><span>{item.priority}</span></td>
									<td colspan="1"><span>{item.creator_first_name} {item.creator_last_name}</span></td>
									<td colspan="1">
										<TablePopup
											onDelete={() => deleteItem(item)}
											onEdit={() => updateItem(item)}
										/>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td class="text-center" colspan="6">
									NO DATA
								</td> 
                        	</tr>
						{/if}
                    </tbody>
                </table>
            </div>
			<TablePagFoot
				bind:pagination={limit}
				bind:totalPages
				bind:totalItems
				bind:page
				bind:itemsSelected={selectedCount}/>
		</div>
	</div>
</div>
