<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { Bell, ClipboardList, FileText, Info, MessageSquare, CheckCircle2, CheckCheck } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Separator } from '$lib/components/ui/separator';
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();

    let notifications = $state(data.notifications);
    let unreadCount   = $state(data.unreadCount);

    $effect(() => {
        notifications = data.notifications;
        unreadCount   = data.unreadCount;
    });

    const filters = [
        { value: 'all',    label: 'Todas' },
        { value: 'unread', label: 'Não lidas' },
        { value: 'task',   label: 'Tarefas' },
        { value: 'form',   label: 'Formulários' }
    ];

    function notifIcon(type: string) {
        switch (type) {
            case 'task_assigned':
            case 'task_completed': return ClipboardList;
            case 'form_assigned':  return FileText;
            case 'form_submitted': return CheckCircle2;
            case 'task_comment':   return MessageSquare;
            default:               return Info;
        }
    }

    function notifHref(n: typeof notifications[0]): string | null {
        if (!n.reference_type || !n.reference_id) return null;
        if (n.reference_type === 'task_assignment') return `/tasks/assignment/${n.reference_id}`;
        if (n.reference_type === 'form_assignment') return `/forms/fill/${n.reference_id}`;
        if (n.reference_type === 'form_response')   return `/forms/manage/${n.reference_id}/responses`;
        return null;
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function typeLabel(type: string): string {
        switch (type) {
            case 'task_assigned':  return 'Tarefa atribuída';
            case 'task_completed': return 'Tarefa concluída';
            case 'task_comment':   return 'Comentário';
            case 'form_assigned':  return 'Formulário atribuído';
            case 'form_submitted': return 'Formulário respondido';
            default:               return 'Sistema';
        }
    }

    function typeBadgeClass(type: string): string {
        if (type.startsWith('task')) return 'bg-blue-100 text-blue-700 border-none';
        if (type.startsWith('form')) return 'bg-purple-100 text-purple-700 border-none';
        return 'bg-gray-100 text-gray-600 border-none';
    }

    function changeFilter(f: string) {
        const params = new URLSearchParams($page.url.searchParams);
        params.set('filter', f);
        params.delete('page');
        goto(`?${params.toString()}`);
    }

    function changePage(p: number) {
        const params = new URLSearchParams($page.url.searchParams);
        params.set('page', String(p));
        goto(`?${params.toString()}`);
    }

    async function handleClick(n: typeof notifications[0]) {
        if (!n.is_read) {
            await fetch(`/apiv2/notifications?id=${n.id}`, { method: 'PATCH' });
            notifications = notifications.map(x => x.id === n.id ? { ...x, is_read: true } : x);
            unreadCount = Math.max(0, unreadCount - 1);
        }
        const href = notifHref(n);
        if (href) goto(href);
    }
</script>

<div class="space-y-6 max-w-3xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-semibold">Notificações</h1>
            {#if unreadCount > 0}
                <p class="text-sm text-muted-foreground mt-0.5">{unreadCount} não lida{unreadCount !== 1 ? 's' : ''}</p>
            {/if}
        </div>

        {#if unreadCount > 0}
            <form method="POST" action="?/markAllRead" use:enhance={() => {
                return ({ update }) => {
                    notifications = notifications.map(n => ({ ...n, is_read: true }));
                    unreadCount = 0;
                    update({ reset: false });
                };
            }}>
                <Button variant="outline" size="sm" type="submit" class="gap-2">
                    <CheckCheck size={15}/>
                    Marcar todas como lidas
                </Button>
            </form>
        {/if}
    </div>

    <!-- Filtros -->
    <div class="flex gap-2 flex-wrap">
        {#each filters as f}
            <button
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                       {data.filter === f.value
                           ? 'bg-primary text-primary-foreground'
                           : 'bg-muted text-muted-foreground hover:bg-muted/80'}"
                onclick={() => changeFilter(f.value)}
            >
                {f.label}
                {#if f.value === 'unread' && unreadCount > 0}
                    <span class="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{unreadCount}</span>
                {/if}
            </button>
        {/each}
    </div>

    <!-- Lista -->
    <div class="rounded-lg border divide-y bg-card">
        {#if notifications.length === 0}
            <div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
                <Bell size={36} class="opacity-25"/>
                <p class="text-sm">Nenhuma notificação{data.filter !== 'all' ? ' neste filtro' : ''}</p>
            </div>
        {:else}
            {#each notifications as n (n.id)}
                {@const Icon = notifIcon(n.type)}
                {@const href = notifHref(n)}
                <div
                    class="flex items-start gap-4 px-4 py-4 transition-colors
                           {n.is_read ? 'hover:bg-muted/40' : 'bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20'}
                           {href ? 'cursor-pointer' : ''}"
                    role={href ? 'button' : undefined}
                    tabindex={href ? 0 : undefined}
                    onclick={() => handleClick(n)}
                    onkeydown={(e) => e.key === 'Enter' && handleClick(n)}
                >
                    <!-- Ícone -->
                    <div class="shrink-0 mt-0.5 size-9 rounded-full flex items-center justify-center
                                {n.is_read ? 'bg-muted' : 'bg-primary/10'}">
                        <Icon size={16} class={n.is_read ? 'text-muted-foreground' : 'text-primary'} />
                    </div>

                    <!-- Conteúdo -->
                    <div class="flex-1 min-w-0 space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-sm font-medium {n.is_read ? 'text-muted-foreground' : 'text-foreground'}">
                                {n.title}
                            </span>
                            <Badge class="text-[10px] py-0 {typeBadgeClass(n.type)}">{typeLabel(n.type)}</Badge>
                        </div>
                        {#if n.message}
                            <p class="text-sm text-muted-foreground truncate">{n.message}</p>
                        {/if}
                        <p class="text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
                    </div>

                    <!-- Indicadores direita -->
                    <div class="shrink-0 flex flex-col items-end gap-2 pt-0.5">
                        {#if !n.is_read}
                            <span class="size-2 rounded-full bg-blue-500"></span>
                        {/if}
                        {#if href}
                            <span class="text-[10px] text-muted-foreground">Ver →</span>
                        {/if}
                    </div>
                </div>
            {/each}
        {/if}
    </div>

    <!-- Paginação -->
    {#if data.pagination.totalPages > 1}
        <div class="flex items-center justify-between text-sm text-muted-foreground">
            <span>{data.pagination.totalItems} notificações</span>
            <div class="flex gap-1">
                <Button
                    variant="outline" size="sm"
                    disabled={data.pagination.page <= 1}
                    onclick={() => changePage(data.pagination.page - 1)}
                >Anterior</Button>
                <span class="px-3 py-1.5 text-sm">
                    {data.pagination.page} / {data.pagination.totalPages}
                </span>
                <Button
                    variant="outline" size="sm"
                    disabled={data.pagination.page >= data.pagination.totalPages}
                    onclick={() => changePage(data.pagination.page + 1)}
                >Próxima</Button>
            </div>
        </div>
    {/if}
</div>
