<script>
	import { Plus, FileUp, Search, Trash, List } from '@lucide/svelte';
	import './s.css';
</script>

<div
	class="h-[50px] items-center border-b border-[#e7ecf0] bg-white
    font-normal leading-[50px] shadow-[0px_1px_10px_rgba(223,225,229,0.5)]"
>
	<div class="pl-[6]! items-center">
		<h3 class="pl-6! items-center text-[1.17rem]">Listas de Materiais</h3>
	</div>
</div>

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
                        <tr>
                            <td class="text-center" colspan="7">
                                NO DATA
                            </td> 
                        </tr>
                    </tbody>
                </table>
            </div>

			<div class="pagination clear-both">
				<select name="items-per-page" id="items-per-page-selection">
					<option value="10">10</option>
					<option value="20" selected>20</option>
					<option value="50">50</option>
					<option value="100">100</option>
				</select>
			</div>
		</div>
	</div>
</div>


