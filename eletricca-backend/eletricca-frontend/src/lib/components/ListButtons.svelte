<script lang="ts">
	import { Plus, FileUp, Search, Trash, FileDown } from '@lucide/svelte';

    export let addNewItem;
    export let importItemFile;
    export let exportItemFile;
    export let batchDelete;

    export let selectedCount: number;
    export let search: string;

</script>

<div class="main-app-buttons mb-2.5">
	<div class="app-buttons-wrapper flex items-center justify-between">
		<div>
			<button class="top-button general-buttons" type="button" onclick={addNewItem}>
				<Plus />
				<span>Add</span>
			</button>
			<button class="top-button general-buttons" type="button" onclick={importItemFile}>
				<FileUp />
				<span>Import</span>
			</button>
			<button type="button" class="top-button general-buttons" onclick={exportItemFile}>
				<FileDown />
				<span>Export</span>
			</button>
			<button
				type="button"
				class="top-button general-buttons"
				class:!bg-red-400={selectedCount > 0}
				class:!bg-red-300={selectedCount === 0}
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
