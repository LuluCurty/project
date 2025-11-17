// @ts-nocheck

// template page for svelte runes
let itemToEdit = $state(null);

export function setItemToEdit(item) {
    itemToEdit = item
}

export function getItemToEdit() {
    return itemToEdit;
}
