<script lang="ts">
	import { Plus, FileUp, Search, Trash, FileDown } from '@lucide/svelte';

	// import components
	import TablePagFoot from '$lib/components/ui/uniqueTables/table-template/TablePagFoot.svelte';
	import TableTitle from '$lib/components/ui/titles/TableTitle.svelte';
	import TablePopup from '$lib/components/ui/popups/TablePopup.svelte';

	// import do svelte
	import { goto } from '$app/navigation';
	import { setItemToEdit } from "$lib/state/client-to-edit.svelte";
	// variaveis dos items!

	// variaveis de ambiente
	let loading = $state(false);
	let items = $state<Array<any>>([]); //placeholder

	// funções GET, DELETE do db
	async function deleteItem(item) {
		
	}
	async function getItems() {

	}
	// funções de redirecionamento
	function addItem() {
		
	}
	function updateItem(item) {

	}
	// funções do selectbox
	let selectAll = $state(false);
	let selectedItems = $state<Array<any>>([]);

	function clearSelection() {
		
	}
	function selectedItemsNAOSEIOQUEEISSOPORENQUANTO() {

	}
	function isSelected() {
		
	}
	function toggleSelect(){

	}
	function toggleSelectAll() {
		
	}
	// paginação
	let limit = $state(20);
	let page = $state(1);
	let totalItems = $state(1);
	let totalPages = $state(1);
	let selectedCount = $state(0);


	import './s.css';
</script>

<TableTitle title="Lista de Materiais"/>

<div class="main-app-table-wrapper h-[575px] p-3.5">
	<div class="main-app-buttons mb-2.5">
		<div class="app-buttons-wrapper flex items-center justify-between">
			<div>
				<button class="top-button general-buttons">
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
							class="inline-block cursor-text border-none focus:ring-0 pt-1.5 pb-1.5 "
							type="text"
							id="search-input"
							placeholder="Pesquisar"
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
								<tr class:bg-gray-200={}> <!---NAO ESQUECER DISSO-->
									<td colspan="1">
										<input 
										type="checkbox" 
										name="select-this" 
										id="select-this" 
										checked={.includes()} 
										onclick={() => toggleSelect()} /> <!---NAO ESQUECER DISSO-->
									</td>
									<td colspan="1"><span>{}</span></td>
									<td colspan="1"><span>{}</span></td>
									<td colspan="1"><span>{}</span></td>
									<td colspan="1"><span>{}</span></td>
									<td colspan="1">
										<TablePopup
											onDelete={() => deleteItem()}
											onEdit={() => updateItem()}
										/>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td class="text-center" colspan="7">
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


