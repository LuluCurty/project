<script>
	import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "@lucide/svelte";
	export let pagination = 20;
	export let count = 0;
	export let totalPages = 1;
	export let totalItems = 0;
	export let page = 1;
	export let itemsSelected = 1;
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
				<button aria-label="first-page" type="button"><ChevronsLeft /></button>
				<button aria-label="previous-page" type="button"><ChevronLeft /></button>
				<button aria-label="next-page" type="button"><ChevronRight /></button>
				<button aria-label="last-page" type="button"><ChevronsRight /></button>
			</div>
		</div>
	</div>
</div>
