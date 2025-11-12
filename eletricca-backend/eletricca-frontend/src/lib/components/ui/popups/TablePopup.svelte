<script>
    import { onMount, onDestroy } from "svelte";
    import { Ellipsis, Trash, Pencil } from "@lucide/svelte";
	import { fade } from "svelte/transition";
    
    export let onEdit;
    export let onDelete;
    
    let open = false;
    let menuRef;

    function outsideClickHandler(event) {
        if (open && menuRef && !menuRef.contains(event.target)) {
            open=false;
        }
    }
    onMount(() => {
        window.addEventListener("click", outsideClickHandler);
    })
    onDestroy(() => {
        window.removeEventListener("click", outsideClickHandler);
    })

</script>

<div>
    <!-- popup button -->
	<button 
        type="button"
        class="hover:bg-gray-200 rounded"
        onclick={(e) => {
            e.stopPropagation(); //evita auto destroy
            open = !open;
        }}
    >
        <Ellipsis />
    </button>

    <!-- popup-->
     {#if open}
        <div bind:this={menuRef}
        	transition:fade={{ duration: 100 }}
            class="absolute right-0 mt-2 w-32 rounded-lg bg-white border border-gray-200 shadow-md z-50"
            aria-label="popup"
            aria-roledescription="popup"
        >
            <button 
                class="block w-full text-left px-3 py-2 text-sm  hover:bg-red-50"
                type="button"
                onclick={() => {
                    onEdit?.(); 
                    open=false;
                }}    
            >
                <Pencil/>
                <span>Editar</span>
            </button>
            <button 
                class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
                type="button"
                onclick={()=>{
                    onDelete?.();
                    open=false;
                }}
            >
                <Trash/>
                <span>Apagar</span>
            </button>
        </div>
     {/if}
</div>

