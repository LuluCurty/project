class LayoutState {
    collapsed = $state(false);

    toggle() {
        this.collapsed = !this.collapsed;
    }
}

export const layoutState = new LayoutState();