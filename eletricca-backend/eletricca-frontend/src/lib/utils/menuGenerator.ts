import {
    House, Users, FileUser, Container, Settings,
    Folder, Calculator, FileText, LayoutDashboard,
    Briefcase, TableProperties, MessageCircleMore // Exemplo de mais ícones
} from '@lucide/svelte';

// =========================================================
// 1. DICIONÁRIO DE TRADUÇÃO (Edite aqui)
// =========================================================
// A chave deve ser o nome da pasta em minúsculo (sem parênteses)
const translations: Record<string, string> = {
    // Módulos Principais
    'dashboard': 'Painel de Controle',
    'users': 'Usuários',
    'client': 'Clientes',
    'clients': 'Clientes',
    'finance': 'Financeiro',
    'supplies': 'Materiais',
    'inventory': 'Estoque',
    'settings': 'Configurações',
    'profile': 'Perfil',
    'reports': 'Relatórios',
    'chat': 'Chat',

    // Sub-rotas comuns
    'list': 'Lista Geral',
    'new': 'Novo Cadastro',
    'history': 'Histórico',
    'suppliers': 'Fornecedores',
    'categories': 'Categorias'
};

// =========================================================
// 2. CONFIGURAÇÃO DE ÍCONES
// =========================================================
const iconMap: Record<string, any> = {
    'inicio': House,
    'dashboard': LayoutDashboard,
    'users': Users,
    'usuarios': Users,
    'client': FileUser,
    'clientes': FileUser,
    'supplies': Container,
    'materiais': Container,
    'finance': Calculator,
    'reports': FileText,
    'relatorios': FileText,
    'config': Settings,
    'settings': Settings,
    'chat': MessageCircleMore,
};

interface Menu {
    title: string,
    href: string,
    icon: string,
    type: string;
    children?: any[] | null;
}

// 3. Lista Negra
const blacklistedSegments = ['(admin)', 'admin', '(auth)', 'auth', 'api'];

// =========================================================
// FUNÇÃO DE TRADUÇÃO E FORMATAÇÃO
// =========================================================
function getTranslatedTitle(text: string) {
    // 1. Limpa o texto para buscar no dicionário (remove (), _ e deixa minúsculo)
    const key = text.toLowerCase().replace(/[\(\)]/g, '').replace(/[-_]/g, '');

    // 2. Verifica se existe tradução
    if (translations[key]) {
        return translations[key];
    }

    // 3. Se não tiver tradução, formata o texto original (Fallback)
    // Ex: "my_module" vira "My Module"
    return text
        .replace(/[\(\)]/g, '')
        .replace(/[-_]/g, ' ')
        .trim()
        .replace(/^\w/, c => c.toUpperCase());
}

export function generateMenuFromRoutes() {
    const modules = import.meta.glob('/src/routes/\\(app\\)/**/+page.svelte');

    const grouped: Record<string, any[]> = {};

    for (const path in modules) {
        // --- LIMPEZA ---
        const allSegments = path.split('/');

        const segments = allSegments.filter(s =>
            s !== '' && s !== '.' && s !== 'src' && s !== 'routes' &&
            s !== '(app)' && s !== '+page.svelte'
        );

        if (segments.length === 0) continue;

        // --- FILTROS ---
        if (segments.some(s =>
            blacklistedSegments.includes(s) ||
            ['add', 'edit', 'new'].includes(s) ||
            s.startsWith('[')
        )) {
            continue;
        }

        // --- LINK (URL) ---
        // (lembrando: removemos grupos para a URL)
        const hrefSegments = segments.filter(s => !s.startsWith('('));
        const href = '/' + hrefSegments.join('/');

        // --- DEFINIÇÃO DE GRUPOS E TÍTULOS ---
        const rootFolder = segments[0];
        const lastSegment = segments[segments.length - 1];

        // AQUI USAMOS A NOVA FUNÇÃO DE TRADUÇÃO
        const groupTitle = getTranslatedTitle(rootFolder);
        const itemTitle = getTranslatedTitle(lastSegment);

        if (!grouped[groupTitle]) {
            grouped[groupTitle] = [];
        }

        if (!grouped[groupTitle].find(i => i.href === href)) {
            grouped[groupTitle].push({
                title: itemTitle,
                href: href
            });
        }
    }

    // --- MENU FINAL ---
    const finalMenu = [];
    finalMenu.push({ title: 'Início', href: '/', icon: House, type: 'link' });

    for (const [groupTitle, routes] of Object.entries(grouped)) {
        // Busca ícone: tenta pelo nome traduzido ou original limpo
        // Como o groupTitle já está traduzido (ex: "Usuários"), precisamos ser espertos no match
        // Ou mapeamos 'usuários' no iconMap, ou tentamos manter uma referência.
        // O jeito mais fácil: Adicione as palavras em português no iconMap lá em cima.

        const iconKey = groupTitle.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos (Usuários -> usuarios)
            .replace(/\s/g, '');

        const modIcon = iconMap[iconKey] || Folder;

        if (routes.length === 1) {
            finalMenu.push({
                title: groupTitle,
                href: routes[0].href,
                icon: modIcon,
                type: 'link',
            });
        } else {
            routes.sort((a, b) => a.title.localeCompare(b.title));
            finalMenu.push({
                title: groupTitle,
                icon: modIcon,
                type: 'dropdown',
                children: routes
            });
        }
    }

    const [home, ...rest] = finalMenu;
    rest.sort((a, b) => a.title.localeCompare(b.title));

    return [home, ...rest];
}