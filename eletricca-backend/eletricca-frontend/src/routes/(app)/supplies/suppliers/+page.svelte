<script lang="ts">
	import TableTitle from '$lib/components/ui/titles/TableTitle.svelte';
	import { goto } from '$app/navigation';
	import TablePopup from '$lib/components/ui/popups/TablePopup.svelte';
	import ListButtons from '$lib/components/ListButtons.svelte';
	import TablePagFoot from '$lib/components/ui/uniqueTables/table-template/TablePagFoot.svelte';

	let page = $state<number>(1);
	let search = $state<string>('');
	let selectedCount = $state<number>(0);
	let selectAll = $state<boolean>(false);

	let limit = $state<number>(20);
	let totalItems = $state<number>(1);
	let totalPages = $state<number>(1);
	let loading = $state<boolean>(false);

	let itemArray = $state<Array<any>>([]);
	let selectedItems = $state<Set<number>>(new Set());

	function addItem() {
		goto('supplies/suppliers/add');
	}

	async function importItem() {}
	async function exportItem() {}
	async function batchDelete() {}
</script>

<TableTitle title="Fornecedores" />

<div class="main-app-table-wrapper h-[575px] p-3.5">
	<ListButtons
		bind:search
		bind:selectedCount
		addNewItem={addItem}
		importItemFile={importItem}
		exportItemFile={exportItem}
		{batchDelete}
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
							<th class="font-normal" colspan="1"><button>-</button></th>
							<th class="font-normal" colspan="1"><div>Nome</div></th>
							<th class="font-normal" colspan="1"><div>email</div></th>
							<th class="font-normal" colspan="1"><div>telefone</div></th>
							<th class="font-normal" colspan="1"><div>endereço</div></th>
							<th class="font-normal" colspan="1">Opções</th>
						</tr>
					</thead>
					<tbody
						id="supplies-list-content"
						class="[*]:text-left
                    bg-white"
					>
						<tr>
							<td class="text-center" colspan="6"> NO DATA </td>
						</tr>
					</tbody>
				</table>
			</div>

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
