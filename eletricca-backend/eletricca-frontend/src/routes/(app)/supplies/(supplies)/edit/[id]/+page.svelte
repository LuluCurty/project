<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import FormTitle from "$lib/components/ui/titles/FormTitle.svelte";
    import { capitalizeFirstChar } from "$lib/utils/utils";
    
    let title = $state<string>('');
    let strId = page.params.id;
    parseInt(strId, 10);

    interface Item {
        id: number;
        
    };

    interface ApiResponse{
        id: number;
    }


    async function saveChanges() {
        
    }
    async function getItems(id:number) {
        try {
            const res = await fetch(`/api/supplies/${id}`,{
                credentials: 'include'
            });

            const data = 
            console.log(data);
        } catch (e) {
            console.error(e);
            alert('Erro ao buscar informações');
        }
    }
    function cancelChanges() {
        goto('/supplies');
    }

    async function getItem() {
        try {
            
        } catch (e) {
            console.error(e);
            alert('Erro ao buscar informações');
        }
    }
</script>
<form action="" method="post">
    <FormTitle {title} {cancelChanges} {saveChanges} />
    <button type="button" onclick={getItem(id)}>
        aperta ai
    </button>
</form>