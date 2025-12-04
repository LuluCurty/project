<script lang="ts">
    import { goto } from "$app/navigation";
	import TablePagFoot from '$lib/components/ui/uniqueTables/table-template/TablePagFoot.svelte';
	import TablePopup from '$lib/components/ui/popups/TablePopup.svelte';
	import TableTitle from '$lib/components/ui/titles/TableTitle.svelte';
    import ListButtons from "$lib/components/ListButtons.svelte";

    interface Item {
        id: number;
        supply_name: string;
        quantity: number;
        price: string;
        details: string;
        supplier: string;
    }
    interface ApiResponse {
        limit: number;
        page: number;
        totalItems: number;
        totalPages: number;
        supplies: Array<Item>;
    }

    let page        = $state<number>(1);
    let search      = $state<string>('');
    let selectedCount = $state<number>(0);
    let selectAll   = $state<boolean>(false);

    let limit       = $state<number>(20);
    let totalItems  = $state<number>(1);
    let totalPages  = $state<number>(1);
    let loading     = $state<boolean>(false);

    let itemArray   = $state<Array<Item>>([]);
    let selectedItems = $state<Set<number>>(new Set());    
        
    function toggleSelect(id: number){

    }
    function toggleSelectAll() {
        
    }
    function isSelected(){

    }
    
    async function exportItem(){
        console.log('export');
    }
    async function importItem(){
        console.log('import');
        
    }
    function addItem() {
        goto('supplies/add');
    }
    function updateItem(itemId: number) {
        console.log('funciona?');
    }
    async function deleteItem(item: number) {
        
    }
    
    async function batchDelete(){
        try {
            const res = await fetch('',{
                credentials: 'include',
                method: "DELETE"
            });
        } catch (error) {
            console.error(error);
            alert('Erro!');
        }

        await getItems();
    }
    async function getItems() {
        try {
            const res = await fetch(`/api/supplies?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
                credentials: 'include'
            });

            const data: ApiResponse = await res.json();
            itemArray = data.supplies;
            limit = data.limit;
            totalItems = data.totalItems;
            totalPages = data.totalPages;
            loading = true;
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar informações');
        }
    }

    $effect(() => {
        getItems();
        page = 1;
    });

</script>

<TableTitle title="Materiais" />

<div class="main-app-table-wrapper h-[575px] p-3.5">
    <ListButtons
        bind:search
        bind:selectedCount
        addNewItem={addItem}
        importItemFile={importItem}
        exportItemFile={exportItem}
        batchDelete={batchDelete}
    />

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
									<input 
										type="checkbox" 
										name="select-all" 
										id="select-all"
										checked={selectAll} 
										onclick={toggleSelectAll} />
								</button>
							</th>
							<th class="font-normal" colspan="1"><div>Nome</div></th>
							<th class="font-normal" colspan="1"><div>Quantidade</div></th>
							<th class="font-normal" colspan="1"><div>Preço</div></th>
							<th class="font-normal" colspan="1"><div>Detalhes</div></th>
							<th class="font-normal" colspan="1"><div>Fornecedor</div></th>
						</tr>
					</thead>
					<tbody
						id="supplies-list-content"
						class="[*]:text-left
                    bg-white"
					>
						{#if loading}
							{#each itemArray as item}
								<tr class:bg-gray-200={selectedItems.has(item.id)}>
									<td colspan="1">
										<input 
										type="checkbox" 
										name="select-this" 
										id="select-this"
										checked={selectedItems.has(item.id)}
										onclick={() => toggleSelect(item.id)} />
									</td>
									<td colspan="1"><span>{item.supply_name}</span></td>
									<td colspan="1"><span>{item.quantity}</span></td>
									<td colspan="1"><span>{item.price}</span></td>
									<td colspan="1"><span>{item.details}</span></td>
									<td colspan="1"><span>{item.supplier}</span></td>
									<td colspan="1">
										<TablePopup
											onDelete={() => deleteItem(item.id)}
											onEdit={() => updateItem(item.id)}
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
				<TablePagFoot
					bind:pagination={limit}
					bind:totalPages
					bind:totalItems
					bind:page
					bind:itemsSelected={selectedCount}
				/>
			</div>
		</div>
	</div>
</div>

