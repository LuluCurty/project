<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";

    let pageData = page.data.roles;
    console.log(page.data.roles)
</script>

<span class="text-muted-foreground">
    Pagina de edição do cargo: {pageData}
</span>