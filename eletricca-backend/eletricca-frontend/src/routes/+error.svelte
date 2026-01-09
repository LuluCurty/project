<script lang="ts">
    import { page } from '$app/state';
    import { Button } from '$lib/components/ui/button';
    import * as Card from '$lib/components/ui/card';
    import { 
        ShieldAlert, 
        FileQuestionMark, 
        ServerCrash, 
        TriangleAlert, 
        ArrowLeft, 
        House 
    } from '@lucide/svelte';

    // Pega o status (404, 403, etc) e a mensagem de erro
    let status = $derived(page.status);
    let message = $derived(page.error?.message || 'Ocorreu um erro inesperado.');

    // Configuração visual para cada tipo de erro
    // Usamos $derived para reagir caso o status mude
    let errorConfig = $derived.by(() => {
        switch (status) {
            case 404:
                return {
                    icon: FileQuestionMark,
                    title: 'Página não encontrada',
                    description: 'O recurso ou página que você está procurando não existe ou foi movido.',
                    color: 'text-orange-500'
                };
            case 403:
                return {
                    icon: ShieldAlert,
                    title: 'Acesso Negado',
                    description: 'Você não tem permissão para acessar este recurso.',
                    color: 'text-red-600' // Destaca bem o erro de permissão
                };
            case 500:
                return {
                    icon: ServerCrash,
                    title: 'Erro Interno do Servidor',
                    description: 'Algo deu errado do nosso lado. Tente novamente mais tarde.',
                    color: 'text-destructive'
                };
            default:
                return {
                    icon: TriangleAlert,
                    title: `Erro ${status}`,
                    description: 'Ocorreu um problema ao processar sua solicitação.',
                    color: 'text-primary'
                };
        }
    });

    let Icon = $derived(errorConfig.icon);
</script>

<div class="h-screen w-full flex flex-col items-center justify-center bg-muted/30 p-4">
    <Card.Root class="max-w-md w-full shadow-lg border-muted">
        <Card.Content class="pt-10 pb-8 px-8 flex flex-col items-center text-center space-y-6">
            
            <div class={`p-4 rounded-full bg-background border shadow-sm ${errorConfig.color}`}>
                <Icon class="size-12" />
            </div>

            <div class="space-y-2">
                <h1 class="text-3xl font-bold tracking-tight">{errorConfig.title}</h1>
                
                <p class="text-muted-foreground font-medium">
                    "{message}"
                </p>
                
                <p class="text-sm text-muted-foreground/80 pt-2">
                    {errorConfig.description}
                </p>
            </div>

            <div class="flex flex-col gap-3 w-full pt-4">
                <Button variant="outline" class="w-full gap-2" onclick={() => history.back()}>
                    <ArrowLeft class="size-4" /> Voltar
                </Button>
                
                <Button variant="default" class="w-full gap-2" href="/">
                    <House class="size-4" /> Ir para Início
                </Button>
            </div>

            <div class="text-[10px] text-muted-foreground uppercase tracking-widest pt-4">
                Código de Erro: {status}
            </div>

        </Card.Content>
    </Card.Root>
</div>