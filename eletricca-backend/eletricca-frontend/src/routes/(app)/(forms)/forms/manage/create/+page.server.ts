import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAction } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

interface FieldInput {
    field_type: string;
    label: string;
    placeholder: string;
    options: string[];
    is_required: boolean;
    field_order: number;
    condition_field_id: string | null;
    condition_operator: string | null;
    condition_value: string | null;
    temp_id: string;
}

export const load: PageServerLoad = async ({ locals, route }) => {
    guardAction(route.id, locals.user, 'manage');
    return {};
};

export const actions: Actions = {
    default: async ({ request, locals, route }) => {
        guardAction(route.id, locals.user, 'manage');

        const data = await request.formData();
        const title = data.get('title') as string;
        const description = data.get('description') as string || '';
        const isActive = data.get('is_active') === 'true';
        const fieldsJson = data.get('fields') as string;

        // Validação Básica
        if (!title?.trim()) {
            return fail(400, { error: 'O título é obrigatório.', title, description });
        }

        let fields: FieldInput[];
        try {
            fields = JSON.parse(fieldsJson || '[]');
        } catch {
            return fail(400, { error: 'Erro no formato dos campos.', title, description });
        }

        if (fields.length === 0) {
            return fail(400, { error: 'Adicione pelo menos um campo.', title, description });
        }

        // Validação Detalhada e Limpeza
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            
            if (!field.label?.trim()) {
                return fail(400, { error: `Campo ${i + 1}: Rótulo obrigatório.`, title, description });
            }

            // Limpa opções vazias
            if (field.options && Array.isArray(field.options)) {
                field.options = field.options.filter(o => o.trim() !== '');
            }

            if ((field.field_type === 'select' || field.field_type === 'checkbox') &&
                (!field.options || field.options.length === 0)) {
                return fail(400, { error: `Campo "${field.label}": Adicione opções válidas.`, title, description });
            }
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Criar Formulário
            const formRes = await client.query(`
                INSERT INTO forms (title, description, created_by, is_active)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [title.trim(), description.trim(), locals.user!.user_id, isActive]);

            const formId = formRes.rows[0].id;

            // Mapa para traduzir IDs (Temp -> Real)
            const tempToRealIdMap: Record<string, number> = {};

            // 2. Inserir Campos (Primeira Passada: Dados Básicos)
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                
                // NOTA: Para JSONB no Postgres via node-postgres, 
                // passar o array direto costuma funcionar melhor que stringify manual
                // a não ser que você queira forçar uma string.
                const optionsValue = (field.options && field.options.length > 0) 
                    ? JSON.stringify(field.options) 
                    : '[]';

                const fieldRes = await client.query(`
                    INSERT INTO form_fields (
                        form_id, field_type, label, placeholder, 
                        options, is_required, field_order
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id
                `, [
                    formId,
                    field.field_type,
                    field.label.trim(),
                    field.placeholder?.trim() || null,
                    optionsValue, 
                    field.is_required || false,
                    i + 1 // Força a ordem sequencial correta baseada no array enviado
                ]);

                // Guarda o ID real mapeado pelo ID temporário do front
                tempToRealIdMap[field.temp_id] = fieldRes.rows[0].id;
            }

            // 3. Atualizar Condições (Segunda Passada: Lógica)
            for (const field of fields) {
                // Só processa se tiver lógica configurada E IDs mapeados válidos
                if (field.condition_field_id && field.condition_operator) {
                    const realConditionFieldId = tempToRealIdMap[field.condition_field_id];
                    const realFieldId = tempToRealIdMap[field.temp_id];

                    // Verifica se ambos os IDs existem no banco agora
                    if (realConditionFieldId && realFieldId) {
                        // Evita auto-referência (campo depender dele mesmo)
                        if (realConditionFieldId !== realFieldId) {
                            await client.query(`
                                UPDATE form_fields
                                SET
                                    condition_field_id = $1,
                                    condition_operator = $2,
                                    condition_value = $3
                                WHERE id = $4
                            `, [
                                realConditionFieldId,
                                field.condition_operator,
                                field.condition_value || null,
                                realFieldId
                            ]);
                        }
                    }
                }
            }

            await client.query('COMMIT');

        } catch (e: any) {
            await client.query('ROLLBACK');
            console.error('Erro transaction form:', e);
            return fail(500, { error: 'Erro interno ao salvar. Tente novamente.', title, description });
        } finally {
            client.release();
        }

        // Redirect fora do try/catch/finally para funcionar no SvelteKit
        throw redirect(303, '/forms/manage');
    }
};