import {
    House, Users, FileUser, Container, Settings,
    Folder, Calculator, FileText, LayoutDashboard,
    Briefcase, TableProperties, MessageCircleMore, Form ,
    ListTodo// Exemplo de mais ícones
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
    'forms': 'Formulários',
    'manage': 'Gerenciar',
    'assign': 'Atribuir',
    'assigned': 'Atribuido',
    'assignment': 'Atribuição',
    'assignments': 'Atribuições',
    'tasks': 'Tarefas',
    

    // Sub-rotas comuns
    'calls': 'Chamadas',
    'stats': 'Estatísticas',
    'lists': 'Lista Geral',
    'new': 'Novo Cadastro',
    'history': 'Histórico',
    'suppliers': 'Fornecedores',
    'categories': 'Categorias',
    'view': 'Visualizar',
    'edit': 'Editar',
    'delete': 'Excluir'
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
    'formulários': Form,
    'tarefas': ListTodo,
};

interface Menu {
    title: string,
    href: string,
    icon: string,
    type: string;
    children?: any[] | null;
}

interface GroupData {
    routes: { title: string; href: string }[];
    moduleSlug: string | null; // null = sem restrição de permissão (ex: Início)
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

export function generateMenuFromRoutes(userPermissions: string[] = []) {
    const modules = import.meta.glob('/src/routes/\\(app\\)/**/+page.svelte');

    const grouped: Record<string, GroupData> = {};

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
            ['add', 'edit', 'new', 'create', 'update',
                'delete', 'responses', 'response', 'fill',
                'view', 'assignment', 'statistics', 'notifications'
            ]
            .includes(s) ||
            s.startsWith('[')
        )) {
            continue;
        }

        // --- LINK (URL) ---
        const hrefSegments = segments.filter(s => !s.startsWith('('));
        const href = '/' + hrefSegments.join('/');

        // --- MÓDULO E GRUPO ---
        const rootFolder = segments[0];
        const lastSegment = segments[segments.length - 1];

        // Se segments[0] é um route group "(xxx)", extrai o slug de permissão
        const moduleSlug = rootFolder.startsWith('(')
            ? rootFolder.replace(/[()]/g, '')
            : null;

        const groupTitle = getTranslatedTitle(rootFolder);
        const itemTitle = getTranslatedTitle(lastSegment);

        if (!grouped[groupTitle]) {
            grouped[groupTitle] = { routes: [], moduleSlug };
        }

        if (!grouped[groupTitle].routes.find(i => i.href === href)) {
            grouped[groupTitle].routes.push({ title: itemTitle, href });
        }
    }

    // --- MENU FINAL ---
    const finalMenu = [];
    finalMenu.push({ title: 'Início', href: '/', icon: House, type: 'link' });

    for (const [groupTitle, { routes, moduleSlug }] of Object.entries(grouped)) {
        // Filtra módulos que exigem permissão de visualização
        if (moduleSlug && !userPermissions.includes(`${moduleSlug}.view`)) continue;

        const iconKey = groupTitle.toLowerCase().replace(/\s/g, '');
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