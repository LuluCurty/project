<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageProps } from './$types';

    let { data, form }: PageProps = $props();

    let uploading = $state(false);
    let deleting = $state<string | null>(null);
    let selectedFile = $state<File | null>(null);
    let selectedBucket = $state<'forms' | 'tasks'>('forms');

    function formatSize(bytes: number) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function formatDate(iso: string | null) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('pt-BR');
    }

    function getIcon(key: string) {
        const ext = key.split('.').pop()?.toLowerCase();
        if (['jpg','jpeg','png','gif','webp'].includes(ext ?? '')) return '🖼️';
        if (['mp3','wav','ogg'].includes(ext ?? '')) return '🎵';
        if (ext === 'pdf') return '📄';
        if (['xlsx','xls'].includes(ext ?? '')) return '📊';
        if (['docx','doc'].includes(ext ?? '')) return '📝';
        return '📁';
    }
</script>

<div class="max-w-4xl mx-auto p-6 space-y-8">

    <div>
        <h1 class="text-2xl font-bold">Teste — VersityGW Storage</h1>
        <p class="text-sm text-muted-foreground mt-1">Endpoint: <code class="bg-muted px-1 rounded">localhost:17017</code> · Buckets: <code class="bg-muted px-1 rounded">forms</code>, <code class="bg-muted px-1 rounded">tasks</code></p>
    </div>

    <!-- Upload -->
    <div class="border rounded-lg p-5 space-y-4">
        <h2 class="font-semibold text-lg">Upload de arquivo</h2>

        <form
            method="POST"
            action="?/upload"
            enctype="multipart/form-data"
            use:enhance={() => {
                uploading = true;
                return async ({ update }) => {
                    await update();
                    uploading = false;
                    selectedFile = null;
                };
            }}
            class="space-y-3"
        >
            <!-- Bucket selector -->
            <div class="flex gap-2">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="bucket"
                        value="forms"
                        bind:group={selectedBucket}
                        class="accent-primary"
                    />
                    <span class="text-sm font-medium">forms</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="bucket"
                        value="tasks"
                        bind:group={selectedBucket}
                        class="accent-primary"
                    />
                    <span class="text-sm font-medium">tasks</span>
                </label>
            </div>

            <input
                type="file"
                name="file"
                accept="image/*,audio/*,.pdf,.xlsx,.docx,.txt"
                class="block w-full text-sm border rounded-md p-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-sm cursor-pointer"
                onchange={(e) => { selectedFile = (e.target as HTMLInputElement).files?.[0] ?? null; }}
            />

            {#if selectedFile}
                <p class="text-sm text-muted-foreground">
                    {selectedFile.name} · {formatSize(selectedFile.size)} · {selectedFile.type}
                </p>
            {/if}

            {#if form?.error}
                <p class="text-sm text-destructive">{form.error}</p>
            {/if}

            {#if form?.success && form?.key}
                <p class="text-sm text-green-600">
                    Enviado para <code class="bg-muted px-1 rounded">{form.bucket}</code>: <code>{form.key}</code>
                </p>
            {/if}

            <button
                type="submit"
                disabled={uploading || !selectedFile}
                class="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
                {uploading ? 'Enviando...' : `Enviar para ${selectedBucket}`}
            </button>
        </form>
    </div>

    <!-- Bucket: forms -->
    <div class="border rounded-lg p-5 space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="font-semibold text-lg">Bucket: <code class="bg-muted px-1 rounded text-base">forms</code></h2>
            <span class="text-sm text-muted-foreground">{data.forms.length} arquivo(s)</span>
        </div>

        {#if data.formsError}
            <p class="text-sm text-destructive">Erro: {data.formsError}</p>
        {:else if data.forms.length === 0}
            <p class="text-sm text-muted-foreground">Bucket vazio.</p>
        {:else}
            <ul class="divide-y">
                {#each data.forms as file}
                    <li class="py-3 flex items-center gap-3">
                        <span class="text-2xl">{getIcon(file.key)}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate">{file.key}</p>
                            <p class="text-xs text-muted-foreground">{formatSize(file.size)} · {formatDate(file.lastModified)}</p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <a href={file.url} target="_blank" rel="noopener noreferrer"
                                class="text-xs px-3 py-1 rounded border hover:bg-muted transition-colors">
                                Download
                            </a>
                            <form method="POST" action="?/delete"
                                use:enhance={() => {
                                    deleting = `forms:${file.key}`;
                                    return async ({ update }) => { await update(); deleting = null; };
                                }}
                            >
                                <input type="hidden" name="key" value={file.key} />
                                <input type="hidden" name="bucket" value="forms" />
                                <button type="submit" disabled={deleting === `forms:${file.key}`}
                                    class="text-xs px-3 py-1 rounded border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50">
                                    {deleting === `forms:${file.key}` ? '...' : 'Deletar'}
                                </button>
                            </form>
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>

    <!-- Bucket: tasks -->
    <div class="border rounded-lg p-5 space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="font-semibold text-lg">Bucket: <code class="bg-muted px-1 rounded text-base">tasks</code></h2>
            <span class="text-sm text-muted-foreground">{data.tasks.length} arquivo(s)</span>
        </div>

        {#if data.tasksError}
            <p class="text-sm text-destructive">Erro: {data.tasksError}</p>
        {:else if data.tasks.length === 0}
            <p class="text-sm text-muted-foreground">Bucket vazio.</p>
        {:else}
            <ul class="divide-y">
                {#each data.tasks as file}
                    <li class="py-3 flex items-center gap-3">
                        <span class="text-2xl">{getIcon(file.key)}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate">{file.key}</p>
                            <p class="text-xs text-muted-foreground">{formatSize(file.size)} · {formatDate(file.lastModified)}</p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <a href={file.url} target="_blank" rel="noopener noreferrer"
                                class="text-xs px-3 py-1 rounded border hover:bg-muted transition-colors">
                                Download
                            </a>
                            <form method="POST" action="?/delete"
                                use:enhance={() => {
                                    deleting = `tasks:${file.key}`;
                                    return async ({ update }) => { await update(); deleting = null; };
                                }}
                            >
                                <input type="hidden" name="key" value={file.key} />
                                <input type="hidden" name="bucket" value="tasks" />
                                <button type="submit" disabled={deleting === `tasks:${file.key}`}
                                    class="text-xs px-3 py-1 rounded border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50">
                                    {deleting === `tasks:${file.key}` ? '...' : 'Deletar'}
                                </button>
                            </form>
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>

</div>
