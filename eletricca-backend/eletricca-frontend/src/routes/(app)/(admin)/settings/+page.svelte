<script lang="ts">
    import { goto } from '$app/navigation';
    
    // UI
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';

    // Ícones
    import { 
        Shield, 
        Users, 
        Settings2, 
        Lock, 
        CreditCard, 
        Mail, 
        Database, 
        Activity,
        ChevronRight
    } from '@lucide/svelte';

    // Recebe a lista de pastas do servidor
    let { data } = $props();
    let routes = $derived(data.settingsRoutes); // ex: ['permissions', 'roles', 'users']

    // --- DICIONÁRIO DE METADADOS ---
    // Aqui você embeleza os módulos que você conhece.
    // Se criar um módulo novo e esquecer de por aqui, ele funciona com o fallback (padrão).
    const metaMap: Record<string, any> = {
        'permissions': {
            label: 'Módulos & Permissões',
            description: 'Gerencie quais módulos existem e o que pode ser feito neles.',
            icon: Lock,
            color: 'text-blue-500 bg-blue-500/10'
        },
        'roles': {
            label: 'Cargos e Funções',
            description: 'Defina grupos de acesso (Admin, Gerente) e vincule permissões.',
            icon: Shield,
            color: 'text-purple-500 bg-purple-500/10'
        },
        'users': {
            label: 'Usuários do Sistema',
            description: 'Gerencie contas, redefina senhas e atribua cargos.',
            icon: Users,
            color: 'text-green-500 bg-green-500/10'
        },
        'finance': {
            label: 'Financeiro',
            description: 'Configurações de faturamento e chaves de API de pagamento.',
            icon: CreditCard,
            color: 'text-emerald-600 bg-emerald-600/10'
        }
        // Adicione outros conforme criar...
    };

    // Função para obter os dados finais (Customizado OU Automático)
    function getMeta(slug: string) {
        // Se existir no dicionário, usa.
        if (metaMap[slug]) return metaMap[slug];

        // SE NÃO EXISTIR (Fallback Automático):
        // Transforma "email-logs" em "Email Logs"
        const formattedName = slug
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        return {
            label: formattedName,
            description: `Configurações do módulo ${formattedName}.`,
            icon: Settings2, // Ícone genérico
            color: 'text-gray-500 bg-gray-500/10' // Cor genérica
        };
    }
</script>

<div class="space-y-6 max-w-5xl mx-auto pt-6">
    
    <div class="space-y-2">
        <h1 class="text-3xl font-bold tracking-tight text-primary">Configurações</h1>
        <p class="text-muted-foreground">
            Central de controle do sistema. Selecione um módulo para configurar.
        </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each routes as route}
            {@const meta = getMeta(route)}
            {@const Icon = meta.icon}
            
            <button 
                class="text-left group transition-all duration-200 focus:outline-none"
                onclick={() => goto(`/settings/${route}`)}
            >
                <Card.Root class="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden">
                    <Card.Header class="flex flex-row items-start gap-4 pb-2 space-y-0">
                        <div class={`p-3 rounded-lg ${meta.color} transition-transform group-hover:scale-110`}>
                            <Icon class="size-6"/>
                        </div>
                        
                        <div class="space-y-1 flex-1">
                            <Card.Title class="text-lg flex items-center justify-between">
                                {meta.label}
                                <ChevronRight class="size-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </Card.Title>
                            <Card.Description class="line-clamp-2 text-sm">
                                {meta.description}
                            </Card.Description>
                        </div>
                    </Card.Header>
                    
                    <Card.Content>
                        <div class="pt-2">
                             <Badge variant="secondary" class="text-[10px] font-mono text-muted-foreground">
                                /settings/{route}
                             </Badge>
                        </div>
                    </Card.Content>
                </Card.Root>
            </button>
        {/each}
    </div>

    {#if routes.length === 0}
        <div class="text-center py-10 border rounded-lg bg-muted/20 border-dashed">
            <Activity class="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-3" />
            <h3 class="text-lg font-medium">Nenhum módulo encontrado</h3>
            <p class="text-sm text-muted-foreground">
                Crie pastas dentro de <code>src/routes/(admin)/settings/</code> para começar.
            </p>
        </div>
    {/if}
</div>