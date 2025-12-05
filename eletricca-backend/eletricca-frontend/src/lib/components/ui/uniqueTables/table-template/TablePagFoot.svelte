<script lang="ts">
	import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "@lucide/svelte";
	let { page = $bindable(), 
		pagination = $bindable(), 
		totalPages = $bindable(), 
		totalItems = $bindable(), 
		itemsSelected = $bindable() 
	} = $props();

	function nextPage() {
		page = page + 1;
	}
	function previousPage() {
		page = page - 1;
	}
	function lastPage() {
		page = totalPages;
	}
	function firstPage() {
		page = 1;
	}
</script>

<div class="table-foot flex justify-between">
	<div class="selected-rows">
		<span>{itemsSelected} de {totalItems} selecionado</span>
	</div>
	<div class="flex justify-between">
		<div class="pagination clear-both">
			<label for="items-per-page">Items por pagina:</label>
			<select bind:value={pagination} name="items-per-page" id="items-per-page-selection">
				<option value={10}>10</option>
				<option value={20}>20</option>
				<option value={50}>50</option>
				<option value={100}>100</option>
			</select>
		</div>
		<div class="pagination-quantity">
			<span>Pagina {page} de {totalPages}</span>
		</div>
		<div class="pagination-nav">
			<div class="pagination-nav-wrapper">
				<button aria-label="first-page" type="button" onclick={firstPage} ><ChevronsLeft /></button>
				<button aria-label="previous-page" type="button" onclick={previousPage}><ChevronLeft /></button>
				<button aria-label="next-page" type="button" onclick={nextPage}><ChevronRight /></button>
				<button aria-label="last-page" type="button" onclick={lastPage}><ChevronsRight /></button>
			</div>
		</div>
	</div>
</div>
