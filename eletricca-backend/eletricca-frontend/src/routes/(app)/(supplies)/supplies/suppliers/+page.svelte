<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto, invalidateAll } from '$app/navigation';
    import { page } from '$app/state';
    import { toast } from 'svelte-sonner';
    import type { PageData } from './$types';

    import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import * as Pagination from '$lib/components/ui/pagination';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import {
        Plus, Search, Pencil, Trash, Truck, MapPin,
        Upload, Download, ChevronLeft, ChevronRight,
        LoaderCircle, FileSpreadsheet, FileText,
        CircleAlert, CircleCheck as CheckCircle2,
    } from '@lucide/svelte';

    let { data }: { data: PageData } = $props();

    let searchTimer: ReturnType<typeof setTimeout>;

    function handleSearch(e: Event) {
        const v = (e.target as HTMLInputElement).value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const u = new URL(page.url);
            u.searchParams.set('search', v);
            u.searchParams.set('page', '1');
            goto(u.toString(), { noScroll: true, keepFocus: true });
        }, 500);
    }

    function handlePage(p: number) {
        const u = new URL(page.url);
        u.searchParams.set('page', p.toString());
        goto(u.toString(), { noScroll: true });
    }

    // ── Export ──────────────────────────────────────────────────────────────
    let isExporting = $state(false);

    async function handleExport(format: 'csv' | 'xlsx' | 'pdf') {
        isExporting = true;
        try {
            const res = await fetch(`/apiv2/suppliers/export?format=${format}`);
            if (!res.ok) throw new Error('Erro ao gerar arquivo.');
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `fornecedores_${new Date().toISOString().slice(0, 10)}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Exportado como ${format.toUpperCase()} com sucesso.`);
        } catch {
            toast.error('Erro ao exportar fornecedores.');
        } finally {
            isExporting = false;
        }
    }

    // ── Import ───────────────────────────────────────────────────────────────
    type ImportStep = 'upload' | 'preview' | 'confirming';
    let importOpen    = $state(false);
    let importStep    = $state<ImportStep>('upload');
    let previewRows   = $state<any[]>([]);
    let rowsJson      = $state('');
    let isUploading   = $state(false);
    let importError   = $state('');

    function openImport() {
        importOpen  = true;
        importStep  = 'upload';
        previewRows = [];
        rowsJson    = '';
        importError = '';
    }

    async function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        const file  = input.files?.[0];
        if (!file) return;

        isUploading = true;
        importError = '';

        const fd = new FormData();
        fd.append('file', file);

        try {
            const res  = await fetch('/apiv2/suppliers/import', { method: 'POST', body: fd });
            const body = await res.json();
            if (!res.ok || body.error) {
                importError = body.error || 'Erro ao processar arquivo.';
                return;
            }
            previewRows = body.rows;
            rowsJson    = JSON.stringify(body.rows);
            importStep  = 'preview';
        } catch {
            importError = 'Erro de conexão ao processar arquivo.';
        } finally {
            isUploading = false;
        }
    }
</script>

<div class="space-y-4">

    <!-- Cabeçalho -->
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h2 class="text-2xl font-bold tracking-tight text-primary">Fornecedores</h2>
            <p class="text-muted-foreground text-sm">Gerencie os seus parceiros de negócio.</p>
        </div>

        <div class="flex items-center gap-2">
            <!-- Botões de importar/exportar: apenas desktop -->
            <div class="hidden md:flex items-center gap-2">
                <!-- Exportar -->
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        class="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                        disabled={isExporting}
                    >
                        {#if isExporting}
                            <LoaderCircle class="size-4 animate-spin" />
                        {:else}
                            <Download class="size-4" />
                        {/if}
                        Exportar
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                        <DropdownMenu.Label>Escolha o formato</DropdownMenu.Label>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item onclick={() => handleExport('csv')}>
                            <FileText class="mr-2 size-4 text-green-600" /> CSV
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onclick={() => handleExport('xlsx')}>
                            <FileSpreadsheet class="mr-2 size-4 text-emerald-600" /> Excel (.xlsx)
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onclick={() => handleExport('pdf')}>
                            <FileText class="mr-2 size-4 text-red-500" /> PDF
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>

                <!-- Importar -->
                <Button variant="outline" onclick={openImport}>
                    <Upload class="mr-2 size-4" /> Importar
                </Button>
            </div>

            <Button onclick={() => goto('/supplies/suppliers/add')}>
                <Plus class="mr-2 size-4" /> Novo Fornecedor
            </Button>
        </div>
    </div>

    <!-- Card da tabela -->
    <Card.Root>
        <Card.Header class="pb-3">
            <div class="relative w-full max-w-sm">
                <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por nome, email ou CNPJ..."
                    class="pl-9"
                    value={data.search}
                    oninput={handleSearch}
                />
            </div>
        </Card.Header>

        <Card.Content>
            <div class="rounded-md border">
                <Table.Root>
                    <Table.Header>
                        <Table.Row class="bg-muted/50">
                            <Table.Head class="w-12">#</Table.Head>
                            <Table.Head>Fornecedor</Table.Head>
                            <Table.Head class="hidden lg:table-cell">Razão Social</Table.Head>
                            <Table.Head class="hidden lg:table-cell">CNPJ</Table.Head>
                            <Table.Head class="hidden sm:table-cell">Email</Table.Head>
                            <Table.Head class="hidden md:table-cell">Telefone</Table.Head>
                            <Table.Head class="text-right">Ações</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if data.suppliers.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={7} class="h-32 text-center text-muted-foreground">
                                    Nenhum fornecedor encontrado.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each data.suppliers as s (s.id)}
                                <Table.Row>
                                    <Table.Cell class="text-xs text-muted-foreground font-mono">#{s.id}</Table.Cell>

                                    <Table.Cell>
                                        <div class="flex items-center gap-2">
                                            <div class="rounded-full bg-blue-100 p-1.5 text-blue-600">
                                                <Truck class="size-4" />
                                            </div>
                                            <span class="font-medium">{s.supplier_name}</span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell class="hidden lg:table-cell text-sm text-muted-foreground">
                                        {s.supplier_legal_name ?? '—'}
                                    </Table.Cell>

                                    <Table.Cell class="hidden lg:table-cell">
                                        {#if s.supplier_legal_identifier}
                                            <Badge variant="outline" class="font-mono text-xs">
                                                {s.supplier_legal_identifier}
                                            </Badge>
                                        {:else}
                                            <span class="text-muted-foreground text-sm">—</span>
                                        {/if}
                                    </Table.Cell>

                                    <Table.Cell class="hidden sm:table-cell text-sm text-muted-foreground">
                                        {s.supplier_email}
                                    </Table.Cell>

                                    <Table.Cell class="hidden md:table-cell">
                                        {#if s.supplier_telephone}
                                            <Badge variant="outline">{s.supplier_telephone}</Badge>
                                        {:else}
                                            <span class="text-muted-foreground text-sm">—</span>
                                        {/if}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div class="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" class="size-8"
                                                onclick={() => goto(`/supplies/suppliers/edit/${s.id}`)}>
                                                <Pencil class="size-4" />
                                            </Button>

                                            <form method="POST" action="?/delete"
                                                use:enhance={() => async ({ result, update }) => {
                                                    if (result.type === 'success') {
                                                        toast.success('Fornecedor excluído.');
                                                        await invalidateAll();
                                                    } else if (result.type === 'failure') {
                                                        toast.error(String((result.data as any)?.error) || 'Erro ao excluir.');
                                                    }
                                                    await update({ reset: false });
                                                }}
                                            >
                                                <input type="hidden" name="id" value={s.id} />
                                                <Button type="submit" variant="ghost" size="icon"
                                                    class="size-8 text-muted-foreground hover:text-destructive">
                                                    <Trash class="size-4" />
                                                </Button>
                                            </form>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>

            {#if data.totalItems > 15}
                <div class="mt-4">
                    <Pagination.Root count={data.totalItems} perPage={15} page={data.currentPage}>
                        {#snippet children({ pages, currentPage })}
                            <Pagination.Content>
                                <Pagination.Item>
                                    <Pagination.PrevButton
                                        disabled={currentPage <= 1}
                                        onclick={() => handlePage(currentPage - 1)}
                                        class="cursor-pointer"
                                    >
                                        <ChevronLeft class="size-4" />
                                        <span class="hidden sm:block">Anterior</span>
                                    </Pagination.PrevButton>
                                </Pagination.Item>
                                {#each pages as p (p.key)}
                                    {#if p.type === 'ellipsis'}
                                        <Pagination.Item><Pagination.Ellipsis /></Pagination.Item>
                                    {:else}
                                        <Pagination.Item>
                                            <Pagination.Link
                                                page={p}
                                                isActive={currentPage === p.value}
                                                onclick={(e) => { e.preventDefault(); handlePage(p.value); }}
                                            >{p.value}</Pagination.Link>
                                        </Pagination.Item>
                                    {/if}
                                {/each}
                                <Pagination.Item>
                                    <Pagination.NextButton
                                        disabled={currentPage * 15 >= data.totalItems}
                                        onclick={() => handlePage(currentPage + 1)}
                                        class="cursor-pointer"
                                    >
                                        <span class="hidden sm:block">Próximo</span>
                                        <ChevronRight class="size-4" />
                                    </Pagination.NextButton>
                                </Pagination.Item>
                            </Pagination.Content>
                        {/snippet}
                    </Pagination.Root>
                </div>
            {/if}
        </Card.Content>
    </Card.Root>
</div>

<!-- ── Dialog de Importação ─────────────────────────────────────────────── -->
<Dialog.Root bind:open={importOpen}>
    <Dialog.Content class="max-w-3xl">
        <Dialog.Header>
            <Dialog.Title>Importar Fornecedores</Dialog.Title>
            <Dialog.Description>
                Selecione um arquivo <strong>.csv</strong> ou <strong>.xlsx</strong> exportado desta tela.
                As linhas com ID serão <em>atualizadas</em>; as sem ID serão <em>inseridas</em>.
            </Dialog.Description>
        </Dialog.Header>

        {#if importStep === 'upload'}
            <div class="space-y-4 py-4">
                {#if importError}
                    <div class="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <CircleAlert class="size-4 shrink-0" />
                        {importError}
                    </div>
                {/if}

                <label class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-10 cursor-pointer hover:bg-muted/50 transition-colors">
                    {#if isUploading}
                        <LoaderCircle class="size-8 animate-spin text-primary" />
                        <span class="text-sm text-muted-foreground">Processando arquivo...</span>
                    {:else}
                        <Upload class="size-8 text-muted-foreground" />
                        <span class="text-sm font-medium">Clique para selecionar o arquivo</span>
                        <span class="text-xs text-muted-foreground">.csv ou .xlsx (máx. 10 MB)</span>
                    {/if}
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        class="sr-only"
                        disabled={isUploading}
                        onchange={handleFileSelect}
                    />
                </label>
            </div>

        {:else if importStep === 'preview'}
            <div class="space-y-4 py-2">
                <p class="text-sm text-muted-foreground">
                    <strong>{previewRows.length}</strong> linha(s) encontrada(s).
                    Verifique antes de confirmar:
                </p>

                <div class="max-h-72 overflow-auto rounded-md border text-sm">
                    <table class="w-full">
                        <thead class="bg-muted/50 sticky top-0">
                            <tr>
                                <th class="px-3 py-2 text-left font-medium">ID</th>
                                <th class="px-3 py-2 text-left font-medium">Nome</th>
                                <th class="px-3 py-2 text-left font-medium">CNPJ</th>
                                <th class="px-3 py-2 text-left font-medium">Email</th>
                                <th class="px-3 py-2 text-left font-medium">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each previewRows as row, i}
                                <tr class="border-t {i % 2 === 0 ? '' : 'bg-muted/20'}">
                                    <td class="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                                        {row.id ?? '—'}
                                    </td>
                                    <td class="px-3 py-1.5 font-medium">{row.supplier_name}</td>
                                    <td class="px-3 py-1.5 text-muted-foreground">{row.supplier_legal_identifier || '—'}</td>
                                    <td class="px-3 py-1.5 text-muted-foreground">{row.supplier_email}</td>
                                    <td class="px-3 py-1.5">
                                        <Badge variant="outline" class="{row.id ? 'text-blue-700 border-blue-200 bg-blue-50' : 'text-green-700 border-green-200 bg-green-50'}">
                                            {row.id ? 'Atualizar' : 'Inserir'}
                                        </Badge>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <!-- Form de confirmação -->
                <form method="POST" action="?/import"
                    use:enhance={({ formElement }) => async ({ result, update }) => {
                        importStep = 'confirming';
                        if (result.type === 'success') {
                            const d = result.data as any;
                            const skipped = d.skipped ?? 0;
                            const msg = `Importação concluída: ${d.inserted ?? 0} inserido(s), ${d.updated ?? 0} atualizado(s)${skipped > 0 ? `, ${skipped} ignorado(s) (duplicados ou sem CNPJ)` : ''}.`;
                            toast.success(msg);
                            importOpen = false;
                            await invalidateAll();
                        } else if (result.type === 'failure') {
                            importError = String((result.data as any)?.error) || 'Erro na importação.';
                            importStep  = 'preview';
                            toast.error(importError);
                        }
                        await update({ reset: false });
                    }}
                >
                    <input type="hidden" name="rows" value={rowsJson} />
                    <div class="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onclick={() => { importStep = 'upload'; importError = ''; }}>
                            Voltar
                        </Button>
                        <Button type="submit" disabled={importStep === 'confirming'}>
                            {#if importStep === 'confirming'}
                                <LoaderCircle class="mr-2 size-4 animate-spin" /> Importando...
                            {:else}
                                <CheckCircle2 class="mr-2 size-4" /> Confirmar importação
                            {/if}
                        </Button>
                    </div>
                </form>
            </div>

        {:else}
            <div class="flex flex-col items-center gap-3 py-10">
                <LoaderCircle class="size-8 animate-spin text-primary" />
                <p class="text-muted-foreground text-sm">Importando fornecedores...</p>
            </div>
        {/if}

        {#if importStep === 'upload'}
            <Dialog.Footer>
                <Button variant="outline" onclick={() => (importOpen = false)}>Cancelar</Button>
            </Dialog.Footer>
        {/if}
    </Dialog.Content>
</Dialog.Root>
