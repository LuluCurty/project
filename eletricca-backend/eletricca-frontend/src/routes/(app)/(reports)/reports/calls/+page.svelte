<script lang="ts">
    import { enhance } from '$app/forms';
    import {
        Chart, BarElement, BarController,
        CategoryScale, LinearScale, Legend, Tooltip,
    } from 'chart.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import {
        Upload, Phone, PhoneIncoming, PhoneOutgoing,
        PhoneCall, PhoneMissed, CircleAlert as AlertCircle,
        FileSpreadsheet,
    } from '@lucide/svelte';
    import type { PageData, ActionData } from './$types';

    Chart.register(BarElement, BarController, CategoryScale, LinearScale, Legend, Tooltip);

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let uploading = $state(false);
    let fileInput: HTMLInputElement | undefined = $state();
    let selectedFileName = $state('');

    // ─── Chart ────────────────────────────────────────────────────────────────
    let canvas: HTMLCanvasElement | undefined = $state();
    let chart: Chart | undefined;

    const COLORS = {
        total:    { bg: 'rgba(59,130,246,0.7)',  border: 'rgba(59,130,246,1)'  },
        inbound:  { bg: 'rgba(34,197,94,0.7)',   border: 'rgba(34,197,94,1)'   },
        outbound: { bg: 'rgba(251,146,60,0.7)',  border: 'rgba(251,146,60,1)'  },
        internal: { bg: 'rgba(168,85,247,0.7)',  border: 'rgba(168,85,247,1)'  },
    } as const;

    $effect(() => {
        if (!canvas || !data.stats?.by_day?.length) return;

        const days   = data.stats.by_day;
        const labels = days.map((d: any) => {
            const [, m, day] = d.date.split('-');
            return `${day}/${m}`;
        });

        const config = {
            labels,
            datasets: [
                { label: 'Total',    data: days.map((d: any) => d.total),    backgroundColor: COLORS.total.bg,    borderColor: COLORS.total.border,    borderWidth: 1, borderRadius: 3 },
                { label: 'Entrantes',data: days.map((d: any) => d.inbound),  backgroundColor: COLORS.inbound.bg,  borderColor: COLORS.inbound.border,  borderWidth: 1, borderRadius: 3 },
                { label: 'Saintes',  data: days.map((d: any) => d.outbound), backgroundColor: COLORS.outbound.bg, borderColor: COLORS.outbound.border, borderWidth: 1, borderRadius: 3 },
                { label: 'Internas', data: days.map((d: any) => d.internal), backgroundColor: COLORS.internal.bg, borderColor: COLORS.internal.border, borderWidth: 1, borderRadius: 3 },
            ],
        };

        if (chart) {
            chart.data = config;
            chart.update();
            return;
        }

        chart = new Chart(canvas, {
            type: 'bar',
            data: config,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 20 } },
                    tooltip: { mode: 'index', intersect: false },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 45 } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
                },
            },
        });

        return () => { chart?.destroy(); chart = undefined; };
    });

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const s = $derived(data.stats?.summary);
    const pct = (n: number) => s?.total ? ((n / s.total) * 100).toFixed(1) + '%' : '—';
    const answerRatePct = $derived(s ? (s.answer_rate * 100).toFixed(1) + '%' : '—');
</script>

<!-- ─── Page ──────────────────────────────────────────────────────────────── -->
<div class="space-y-6">

    <!-- Header -->
    <div>
        <h1 class="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Estatísticas de Chamadas — CSV
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
            Carregue o relatório CSV exportado do UCM · o arquivo substitui o anterior
        </p>
    </div>

    <!-- Upload Card -->
    <Card.Root>
        <Card.Header>
            <Card.Title class="flex items-center gap-2">
                <FileSpreadsheet class="size-4" />
                {data.hasFile ? 'Substituir arquivo' : 'Carregar relatório'}
            </Card.Title>
            {#if data.stats}
                <Card.Description>
                    Arquivo atual cobre <strong>{data.stats.period.from}</strong> → <strong>{data.stats.period.to}</strong>
                    · {data.stats.count} chamadas únicas
                </Card.Description>
            {/if}
        </Card.Header>
        <Card.Content>
            <form
                method="POST"
                action="?/upload"
                enctype="multipart/form-data"
                use:enhance={() => {
                    uploading = true;
                    return async ({ update }) => {
                        uploading = false;
                        await update();
                    };
                }}
                class="flex flex-wrap items-center gap-3"
            >
                <label
                    class="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted/50"
                    for="csv-input"
                >
                    <Upload class="size-4" />
                    {selectedFileName || 'Selecionar .csv'}
                </label>
                <input
                    id="csv-input"
                    name="csv"
                    type="file"
                    accept=".csv"
                    class="hidden"
                    bind:this={fileInput}
                    onchange={(e) => {
                        const f = (e.target as HTMLInputElement).files?.[0];
                        selectedFileName = f?.name ?? '';
                    }}
                />
                <Button type="submit" disabled={uploading || !selectedFileName} size="sm">
                    {uploading ? 'Enviando…' : 'Enviar e processar'}
                </Button>
            </form>

            <!-- Upload error -->
            {#if form?.error}
                <p class="mt-3 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle class="size-4 shrink-0" />
                    {form.error}
                </p>
            {/if}
        </Card.Content>
    </Card.Root>

    <!-- S3 / parse error -->
    {#if data.error}
        <div class="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle class="size-4 shrink-0" />
            {data.error}
        </div>
    {/if}

    <!-- Empty state -->
    {#if !data.hasFile && !data.error}
        <div class="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
            <FileSpreadsheet class="mb-4 size-12 text-muted-foreground/30" />
            <p class="text-sm font-medium text-muted-foreground">Nenhum relatório carregado ainda</p>
            <p class="mt-1 text-xs text-muted-foreground">Exporte o CSV pelo UCM e faça o upload acima</p>
        </div>
    {/if}

    <!-- Stats (only when file exists and parsed) -->
    {#if data.stats && s}

        <!-- Summary Cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between pb-2">
                    <Card.Title class="text-sm font-medium text-muted-foreground">Total</Card.Title>
                    <Phone class="size-4 text-blue-500" />
                </Card.Header>
                <Card.Content>
                    <p class="text-3xl font-bold">{s.total.toLocaleString('pt-BR')}</p>
                    <p class="mt-1 text-xs text-muted-foreground">chamadas únicas</p>
                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between pb-2">
                    <Card.Title class="text-sm font-medium text-muted-foreground">Atendidas</Card.Title>
                    <Phone class="size-4 text-green-500" />
                </Card.Header>
                <Card.Content>
                    <p class="text-3xl font-bold text-green-600">{s.answered.toLocaleString('pt-BR')}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{answerRatePct} de atendimento</p>
                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between pb-2">
                    <Card.Title class="text-sm font-medium text-muted-foreground">Não atendidas</Card.Title>
                    <PhoneMissed class="size-4 text-red-500" />
                </Card.Header>
                <Card.Content>
                    <p class="text-3xl font-bold text-red-600">{s.no_answer.toLocaleString('pt-BR')}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{pct(s.no_answer)} do total</p>
                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between pb-2">
                    <Card.Title class="text-sm font-medium text-muted-foreground">Entrantes</Card.Title>
                    <PhoneIncoming class="size-4 text-green-500" />
                </Card.Header>
                <Card.Content>
                    <p class="text-3xl font-bold">{s.inbound.toLocaleString('pt-BR')}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{pct(s.inbound)} do total</p>
                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between pb-2">
                    <Card.Title class="text-sm font-medium text-muted-foreground">Saintes</Card.Title>
                    <PhoneOutgoing class="size-4 text-orange-500" />
                </Card.Header>
                <Card.Content>
                    <p class="text-3xl font-bold">{s.outbound.toLocaleString('pt-BR')}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{pct(s.outbound)} do total</p>
                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between pb-2">
                    <Card.Title class="text-sm font-medium text-muted-foreground">Internas</Card.Title>
                    <PhoneCall class="size-4 text-purple-500" />
                </Card.Header>
                <Card.Content>
                    <p class="text-3xl font-bold">{s.internal.toLocaleString('pt-BR')}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{pct(s.internal)} do total</p>
                </Card.Content>
            </Card.Root>
        </div>

        <!-- Daily Chart -->
        {#if data.stats.by_day.length > 0}
            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between">
                    <div>
                        <Card.Title>Chamadas por Dia</Card.Title>
                        <Card.Description>Distribuição diária no período do arquivo</Card.Description>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <Badge variant="outline" class="gap-1 border-blue-300 text-blue-600">
                            <span class="inline-block size-2 rounded-full bg-blue-500"></span>Total
                        </Badge>
                        <Badge variant="outline" class="gap-1 border-green-300 text-green-600">
                            <span class="inline-block size-2 rounded-full bg-green-500"></span>Entrantes
                        </Badge>
                        <Badge variant="outline" class="gap-1 border-orange-300 text-orange-600">
                            <span class="inline-block size-2 rounded-full bg-orange-500"></span>Saintes
                        </Badge>
                        <Badge variant="outline" class="gap-1 border-purple-300 text-purple-600">
                            <span class="inline-block size-2 rounded-full bg-purple-500"></span>Internas
                        </Badge>
                    </div>
                </Card.Header>
                <Card.Content>
                    <div class="relative h-72 w-full">
                        <canvas bind:this={canvas}></canvas>
                    </div>
                </Card.Content>
            </Card.Root>
        {/if}

        <!-- Extension Table -->
        {#if data.stats.by_extension.length > 0}
            <Card.Root>
                <Card.Header>
                    <Card.Title>Chamadas por Ramal</Card.Title>
                    <Card.Description>Recebidas, realizadas e internas por ramal</Card.Description>
                </Card.Header>
                <Card.Content>
                    <div class="custom-scrollbar relative max-h-80 overflow-y-auto">
                        <table class="w-full text-sm">
                            <thead class="sticky top-0 z-10 border-b bg-card text-left">
                                <tr>
                                    <th class="pb-2 pr-4 font-medium text-muted-foreground">Ramal</th>
                                    <th class="pb-2 pr-4 font-medium text-muted-foreground">Nome</th>
                                    <th class="pb-2 pr-4 text-right font-medium text-blue-600">Total</th>
                                    <th class="pb-2 pr-4 text-right font-medium text-green-600">Recebidas</th>
                                    <th class="pb-2 pr-4 text-right font-medium text-orange-600">Realizadas</th>
                                    <th class="pb-2 text-right font-medium text-purple-600">Internas</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-muted/50">
                                {#each data.stats.by_extension as row (row.number)}
                                    <tr class="transition-colors hover:bg-muted/30">
                                        <td class="py-2 pr-4 font-mono font-semibold">{row.number}</td>
                                        <td class="py-2 pr-4 text-muted-foreground">{row.name || '—'}</td>
                                        <td class="py-2 pr-4 text-right font-semibold">{row.total}</td>
                                        <td class="py-2 pr-4 text-right text-green-600">{row.received}</td>
                                        <td class="py-2 pr-4 text-right text-orange-600">{row.made}</td>
                                        <td class="py-2 text-right text-purple-600">{row.internal}</td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </Card.Content>
            </Card.Root>
        {/if}

        <!-- Trunk Table -->
        {#if data.stats.by_trunk.length > 0}
            {@const hasIvr = data.stats.by_trunk.some((t: any) => t.ivr_presented > 0)}
            <Card.Root>
                <Card.Header>
                    <Card.Title>Chamadas por Tronco</Card.Title>
                    <Card.Description>
                        Entrantes e saintes por linha externa
                        {#if hasIvr}· troncos com IVR mostram detalhes de abandono{/if}
                    </Card.Description>
                </Card.Header>
                <Card.Content>
                    <div class="custom-scrollbar relative max-h-72 overflow-y-auto">
                        <table class="w-full text-sm">
                            <thead class="sticky top-0 z-10 border-b bg-card text-left">
                                <tr>
                                    <th class="pb-2 pr-4 font-medium text-muted-foreground">Tronco</th>
                                    <th class="pb-2 pr-4 text-right font-medium text-blue-600">Total</th>
                                    <th class="pb-2 pr-4 text-right font-medium text-green-600">Entrantes</th>
                                    <th class="pb-2 pr-4 text-right font-medium text-orange-600">Saintes</th>
                                    {#if hasIvr}
                                        <th class="pb-2 pr-4 text-right font-medium text-violet-600">IVR Apresen.</th>
                                        <th class="pb-2 pr-4 text-right font-medium text-red-500">Abandono IVR</th>
                                        <th class="pb-2 text-right font-medium text-teal-600">Humano Atend.</th>
                                    {/if}
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-muted/50">
                                {#each data.stats.by_trunk as row (row.name)}
                                    <tr class="transition-colors hover:bg-muted/30">
                                        <td class="py-2 pr-4 font-mono">{row.name}</td>
                                        <td class="py-2 pr-4 text-right font-semibold">{row.total}</td>
                                        <td class="py-2 pr-4 text-right text-green-600">{row.inbound}</td>
                                        <td class="py-2 pr-4 text-right text-orange-600">{row.outbound}</td>
                                        {#if hasIvr}
                                            <td class="py-2 pr-4 text-right text-violet-600">
                                                {row.ivr_presented > 0 ? row.ivr_presented : '—'}
                                            </td>
                                            <td class="py-2 pr-4 text-right">
                                                {#if row.ivr_presented > 0}
                                                    <span class="font-semibold text-red-500">{row.ivr_dropout}</span>
                                                    <span class="ml-1 text-xs text-muted-foreground">
                                                        ({row.ivr_presented > 0 ? Math.round(row.ivr_dropout / row.ivr_presented * 100) : 0}%)
                                                    </span>
                                                {:else}
                                                    <span class="text-muted-foreground">—</span>
                                                {/if}
                                            </td>
                                            <td class="py-2 text-right text-teal-600">
                                                {row.inbound > 0 ? row.human_answered : '—'}
                                            </td>
                                        {/if}
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </Card.Content>
            </Card.Root>
        {/if}

    {/if}

</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: hsl(var(--muted-foreground) / 0.2);
        border-radius: 4px;
    }
    .custom-scrollbar:hover::-webkit-scrollbar-thumb {
        background: hsl(var(--muted-foreground) / 0.4);
    }
</style>
