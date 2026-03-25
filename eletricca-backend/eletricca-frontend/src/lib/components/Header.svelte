<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { layoutState } from "$lib/state/layoutState.svelte";
    import { themeState } from "$lib/state/themeState.svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Popover from "$lib/components/ui/popover";
    import { Separator } from "$lib/components/ui/separator";
    import { Menu, Megaphone, Sun, Moon, ExternalLink, Bell, ClipboardList, FileText, Info, CheckCircle2, MessageSquare } from "@lucide/svelte";

    interface Announcement { message: string; link: string | null; }
    interface Notification {
        id: number;
        title: string;
        message: string | null;
        type: string;
        reference_type: string | null;
        reference_id: number | null;
        is_read: boolean;
        created_at: string;
    }

    interface HeaderProps {
        announcement: Announcement | null;
        unreadCount: number;
        initialNotifications: Notification[];
    }

    let { announcement, unreadCount, initialNotifications }: HeaderProps = $props();

    let count = $state(unreadCount);
    let notifications = $state<Notification[]>(initialNotifications ?? []);
    let open = $state(false);

    let eventSource: EventSource | null = null;

    onMount(() => {
        eventSource = new EventSource('/stream/notifications');
        eventSource.onmessage = (e) => {
            const notif: Notification = JSON.parse(e.data);
            count += 1;
            notifications = [notif, ...notifications].slice(0, 10);
        };
    });

    onDestroy(() => {
        eventSource?.close();
    });

    function handleToggle() {
        if (window.innerWidth < 768) layoutState.toggleMobile();
        else layoutState.toggleCollapsed();
    }

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

    function notifHref(n: Notification): string | null {
        if (!n.reference_type || !n.reference_id) return null;
        if (n.reference_type === 'task_assignment') return `/tasks/assignment/${n.reference_id}`;
        if (n.reference_type === 'form_assignment') return `/forms/fill/${n.reference_id}`;
        if (n.reference_type === 'form_response')   return `/forms/manage/${n.reference_id}/responses`;
        return null;
    }

    function formatRelative(iso: string): string {
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60)    return 'agora';
        if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    }

    async function markRead(id: number) {
        await fetch(`/apiv2/notifications?id=${id}`, { method: 'PATCH' });
        notifications = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
        count = Math.max(0, count - 1);
    }

    async function markAllRead() {
        await fetch('/apiv2/notifications', { method: 'PATCH' });
        notifications = notifications.map(n => ({ ...n, is_read: true }));
        count = 0;
    }

    async function handleNotifClick(n: Notification) {
        if (!n.is_read) await markRead(n.id);
        const href = notifHref(n);
        if (href) { open = false; goto(href); }
    }
</script>

{#snippet announcementBadge(text: string, hasLink: boolean)}
    <div class={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        bg-blue-50 text-blue-700 border border-blue-100
        text-xs font-medium animate-in fade-in slide-in-from-top-2
        ${hasLink ? 'hover:bg-blue-100 hover:border-blue-200 transition-colors cursor-pointer group' : ''}
    `}>
        <Megaphone size={14} class={hasLink ? 'group-hover:rotate-[-10deg] transition-transform' : ''}/>
        <span class="truncate max-w-[200px] md:max-w-md">{text}</span>
        {#if hasLink}
            <ExternalLink size={10} class="opacity-50 group-hover:opacity-100" />
        {/if}
    </div>
{/snippet}

<header class="flex h-16 items-center justify-between border-b px-4 bg-background transition-all duration-300">
    <div class="flex items-center gap-4">
        <button
            type="button"
            class="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
            onclick={handleToggle}
            aria-label="Alternar Menu"
        >
            <Menu size={20}/>
        </button>
        <h2 class="font-medium text-sm text-muted-foreground hidden md:block">Painel de Controle</h2>
    </div>

    <div class="flex-1 flex justify-center px-4">
        {#if announcement?.message}
            {#if announcement.link}
                <a href={announcement.link} target="_blank" rel="noreferrer">
                    {@render announcementBadge(announcement.message, true)}
                </a>
            {:else}
                {@render announcementBadge(announcement.message, false)}
            {/if}
        {/if}
    </div>

    <div class="flex items-center gap-2">
        <!-- Bell: Popover só renderiza no client para evitar hydration mismatch -->
        {#if browser}
            <Popover.Root bind:open>
                <Popover.Trigger>
                    <Button variant="ghost" size="icon" class="rounded-full relative" aria-label="Notificações">
                        <Bell size={20} />
                        {#if count > 0}
                            <span class="absolute top-1 right-1 size-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
                                {count > 9 ? '9+' : count}
                            </span>
                        {/if}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-80 p-0" align="end">
                    <div class="flex items-center justify-between px-4 py-3 border-b">
                        <span class="font-semibold text-sm">Notificações</span>
                        {#if count > 0}
                            <button
                                class="text-xs text-muted-foreground hover:text-primary transition-colors"
                                onclick={markAllRead}
                            >
                                Marcar todas como lidas
                            </button>
                        {/if}
                    </div>

                    <div class="max-h-80 overflow-y-auto divide-y">
                        {#if notifications.length === 0}
                            <div class="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground gap-2">
                                <Bell size={28} class="opacity-30" />
                                <p>Nenhuma notificação</p>
                            </div>
                        {:else}
                            {#each notifications as n (n.id)}
                                {@const Icon = notifIcon(n.type)}
                                <button
                                    class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors
                                           {n.is_read ? 'hover:bg-muted/50' : 'bg-blue-50/60 hover:bg-blue-50 dark:bg-blue-950/20'}"
                                    onclick={() => handleNotifClick(n)}
                                >
                                    <div class="shrink-0 mt-0.5 size-7 rounded-full flex items-center justify-center
                                                {n.is_read ? 'bg-muted' : 'bg-primary/10'}">
                                        <Icon size={14} class={n.is_read ? 'text-muted-foreground' : 'text-primary'} />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-xs font-medium leading-snug {n.is_read ? 'text-muted-foreground' : 'text-foreground'}">
                                            {n.title}
                                        </p>
                                        {#if n.message}
                                            <p class="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                                        {/if}
                                    </div>
                                    <div class="shrink-0 flex flex-col items-end gap-1">
                                        <span class="text-[10px] text-muted-foreground">{formatRelative(n.created_at)}</span>
                                        {#if !n.is_read}
                                            <span class="size-1.5 rounded-full bg-blue-500"></span>
                                        {/if}
                                    </div>
                                </button>
                            {/each}
                        {/if}
                    </div>

                    <Separator />
                    <div class="px-4 py-2">
                        <button
                            class="text-xs text-muted-foreground hover:text-primary w-full text-center py-1 transition-colors"
                            onclick={() => { open = false; goto('/notifications'); }}
                        >
                            Ver todas as notificações
                        </button>
                    </div>
                </Popover.Content>
            </Popover.Root>
        {:else}
            <!-- SSR fallback estático, sem interatividade -->
            <Button variant="ghost" size="icon" class="rounded-full relative" aria-label="Notificações">
                <Bell size={20} />
                {#if unreadCount > 0}
                    <span class="absolute top-1 right-1 size-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                {/if}
            </Button>
        {/if}

        <!-- Theme toggle -->
        <Button variant="ghost" size="icon" class="rounded-full"
            onclick={() => themeState.toggle()}
            aria-label="Trocar Tema"
        >
            {#if themeState.isDark}
                <Moon size={20} class="text-blue-400"/>
            {:else}
                <Sun size={20} class="text-orange-500"/>
            {/if}
        </Button>
    </div>
</header>
