<script lang="ts">
    import * as Dialog from '$lib/components/ui/dialog';
    import { Button } from '$lib/components/ui/button';
    import { Slider } from '$lib/components/ui/slider';
    import { ZoomIn, ZoomOut, RotateCcw } from '@lucide/svelte';

    type Shape = 'circle' | 'rect';

    let {
        file,
        shape = 'circle' as Shape,
        onconfirm,
        oncancel,
    }: {
        file: File | null;
        shape?: Shape;
        onconfirm: (blob: Blob) => void;
        oncancel: () => void;
    } = $props();

    // Tamanho do frame de visualização e do canvas de saída
    const FRAME_W = $derived(shape === 'circle' ? 300 : 460);
    const FRAME_H = $derived(shape === 'circle' ? 300 : 132);
    const OUT_W   = $derived(shape === 'circle' ? 512 : 920);
    const OUT_H   = $derived(shape === 'circle' ? 512 : 264);

    let imgSrc   = $state('');
    let imgEl    = $state<HTMLImageElement | undefined>();
    let natW     = $state(0);
    let natH     = $state(0);
    let minScale = $state(1);
    let maxScale = $state(3);
    let scale    = $state(1);

    let offsetX = $state(0);
    let offsetY = $state(0);
    let dragging = false;
    let lastPX   = 0;
    let lastPY   = 0;

    // Cria/revoga o object URL quando o arquivo muda
    $effect(() => {
        if (!file) { imgSrc = ''; return; }
        const url = URL.createObjectURL(file);
        imgSrc = url;
        return () => URL.revokeObjectURL(url);
    });

    // Sempre que o scale mudar, reaplica o clamp
    $effect(() => {
        scale; // dependência
        clamp();
    });

    function onImgLoad() {
        if (!imgEl) return;
        natW = imgEl.naturalWidth;
        natH = imgEl.naturalHeight;
        // Cover: a imagem sempre preenche o frame inteiramente
        const fit = Math.max(FRAME_W / natW, FRAME_H / natH);
        minScale = fit;
        maxScale = fit * 3;
        scale    = fit;
        offsetX  = 0;
        offsetY  = 0;
    }

    // Impede que a imagem saia dos limites do frame
    function clamp() {
        const hw = Math.max(0, (natW * scale - FRAME_W) / 2);
        const hh = Math.max(0, (natH * scale - FRAME_H) / 2);
        offsetX = Math.max(-hw, Math.min(hw, offsetX));
        offsetY = Math.max(-hh, Math.min(hh, offsetY));
    }

    function onPointerDown(e: PointerEvent) {
        dragging = true;
        lastPX = e.clientX;
        lastPY = e.clientY;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
        if (!dragging) return;
        offsetX += e.clientX - lastPX;
        offsetY += e.clientY - lastPY;
        lastPX = e.clientX;
        lastPY = e.clientY;
        clamp();
    }

    function onPointerUp() { dragging = false; }

    function reset() {
        scale   = minScale;
        offsetX = 0;
        offsetY = 0;
    }

    function confirm() {
        if (!imgEl) return;

        const canvas = document.createElement('canvas');
        canvas.width  = OUT_W;
        canvas.height = OUT_H;
        const ctx = canvas.getContext('2d')!;

        // Posição top-left da imagem dentro do frame
        const imgX = FRAME_W / 2 - (natW * scale) / 2 + offsetX;
        const imgY = FRAME_H / 2 - (natH * scale) / 2 + offsetY;

        // Converter para coordenadas naturais da imagem
        const srcX = -imgX / scale;
        const srcY = -imgY / scale;
        const srcW =  FRAME_W / scale;
        const srcH =  FRAME_H / scale;

        ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, OUT_W, OUT_H);
        canvas.toBlob(b => { if (b) onconfirm(b); }, 'image/jpeg', 0.92);
    }
</script>

{#if file}
    <Dialog.Root open={true} onOpenChange={(open) => { if (!open) oncancel(); }}>
        <Dialog.Content class="sm:max-w-[560px]">
            <Dialog.Header>
                <Dialog.Title>
                    {shape === 'circle' ? 'Recortar Foto de Perfil' : 'Recortar Banner'}
                </Dialog.Title>
                <Dialog.Description>
                    Arraste para reposicionar · use o slider para aplicar zoom
                </Dialog.Description>
            </Dialog.Header>

            <div class="flex flex-col items-center gap-5 py-2">

                <!-- Frame de recorte -->
                <div
                    class="relative overflow-hidden bg-muted/30
                           {shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
                           ring-2 ring-primary/30
                           cursor-grab active:cursor-grabbing select-none"
                    style="width:{FRAME_W}px; height:{FRAME_H}px;"
                    role="img"
                    aria-label="Área de recorte — arraste para reposicionar"
                    onpointerdown={onPointerDown}
                    onpointermove={onPointerMove}
                    onpointerup={onPointerUp}
                    onpointerleave={onPointerUp}
                >
                    {#if imgSrc}
                        <img
                            bind:this={imgEl}
                            src={imgSrc}
                            alt=""
                            draggable="false"
                            class="absolute pointer-events-none max-w-none"
                            onload={onImgLoad}
                            style="
                                width:{natW * scale}px;
                                height:{natH * scale}px;
                                left:{FRAME_W / 2 - (natW * scale) / 2 + offsetX}px;
                                top:{FRAME_H  / 2 - (natH * scale) / 2 + offsetY}px;
                            "
                        />
                    {/if}
                </div>

                <!-- Controles de zoom -->
                <div class="flex w-full max-w-xs items-center gap-2">
                    <button
                        onclick={() => { scale = Math.max(minScale, scale - (maxScale - minScale) * 0.1); }}
                        title="Diminuir zoom"
                        class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                        <ZoomOut class="size-4" />
                    </button>
                    <Slider
                        type="single"
                        bind:value={scale}
                        min={minScale}
                        max={maxScale}
                        step={0.005}
                        class="flex-1"
                    />
                    <button
                        onclick={() => { scale = Math.min(maxScale, scale + (maxScale - minScale) * 0.1); }}
                        title="Aumentar zoom"
                        class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                        <ZoomIn class="size-4" />
                    </button>
                    <button
                        onclick={reset}
                        title="Resetar zoom e posição"
                        class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                        <RotateCcw class="size-3.5" />
                    </button>
                </div>

            </div>

            <Dialog.Footer>
                <Button variant="outline" onclick={oncancel}>Cancelar</Button>
                <Button onclick={confirm}>Confirmar</Button>
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
{/if}
