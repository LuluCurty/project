class LayoutState {
    // estado para desktop
    collapsed = $state(false);
    // estado para o mobile :)
    mobileOpen = $state(false);

    // Alterna o tamanho no desktop
    toggleCollapsed() {
        this.collapsed = !this.collapsed;
    }

    // alternar o tamanho no ceular
    toggleMobile() {
        this.mobileOpen = !this.mobileOpen;
    }

    // FGehcar o mobile
    closeMobile() {
        this.mobileOpen = false;
    }

    toggle() {
        this.toggleCollapsed();
    }
}

export const layoutState = new LayoutState();