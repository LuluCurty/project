import { fail, redirect, error } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { guardAction } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

interface FieldInput {
    id: string | number; // Pode ser ID real (number) ou Temp (string)
    field_type: string;
    label: string;
    placeholder: string;
    options: string[];
    is_required: boolean;
    field_order: number;
    condition_field_id: string | number | null;
    condition_operator: string | null;
    condition_value: string | null;
    temp_id?: string; // Usado pelo front para mapear novos campos
}

export const load: PageServerLoad = async ({ locals, route, params }) => {
    guardAction(route.id, locals.user, 'edit');

    const formId = Number(params.formId);
    if (!formId) throw error(404, 'Formulário não encontrado');

    try {
        // 1. Buscar Metadados do Form
        const formRes = await pool.query('SELECT * FROM forms WHERE id = $1', [formId]);
        
        if (formRes.rowCount === 0) throw error(404, 'Formulário não encontrado');

        // 2. Buscar Campos Ativos (ignorando os deletados)
        const fieldsRes = await pool.query(`
            SELECT * FROM form_fields 
            WHERE form_id = $1 AND is_deleted = FALSE 
            ORDER BY field_order ASC
        `, [formId]);

        return {
            form: formRes.rows[0],
            fields: fieldsRes.rows
        };
    } catch (e) {
        console.error(e);
        throw error(500, 'Erro ao carregar formulário');
    }
};

export const actions: Actions = {
    default: async ({ request, locals, route, params }) => {
        guardAction(route.id, locals.user, 'edit');

        const formId = Number(params.formId);
        const data = await request.formData();
        
        const title = data.get('title') as string;
        const description = data.get('description') as string || '';
        const isActive = data.get('is_active') === 'true';
        const fieldsJson = data.get('fields') as string;

        // Validações básicas (iguais ao Create)
        if (!title?.trim()) return fail(400, { error: 'Título obrigatório' });
        
        let fields: FieldInput[];
        try {
            fields = JSON.parse(fieldsJson || '[]');
        } catch {
            return fail(400, { error: 'Dados inválidos' });
        }

        if (fields.length === 0) return fail(400, { error: 'Adicione pelo menos um campo' });

        // Validação de inputs vazios
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            if (!field.label?.trim()) return fail(400, { error: `Campo ${i + 1}: Rótulo obrigatório` });
            if (field.options && Array.isArray(field.options)) {
                field.options = field.options.filter(o => o.trim() !== '');
            }
            if ((field.field_type === 'select' || field.field_type === 'checkbox') && 
                (!field.options || field.options.length === 0)) {
                return fail(400, { error: `Campo "${field.label}": Adicione opções` });
            }
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Atualizar Metadados do Form
            await client.query(`
                UPDATE forms 
                SET title = $1, description = $2, is_active = $3, updated_at = NOW()
                WHERE id = $4
            `, [title.trim(), description.trim(), isActive, formId]);

            // 2. Identificar Campos Removidos (Soft Delete)
            // Pegamos todos os IDs que vieram do front (apenas os numéricos são existentes)
            const incomingIds = fields
                .map(f => f.id)
                .filter((id): id is number => typeof id === 'number');

            // Usando ANY($2) com array parametrizado para evitar SQL injection
            const safeIds = incomingIds.length > 0 ? incomingIds : [0];

            await client.query(`
                UPDATE form_fields
                SET is_deleted = TRUE, deleted_at = NOW()
                WHERE form_id = $1
                AND id != ALL($2::int[])
                AND is_deleted = FALSE
            `, [formId, safeIds]);

            // 3. Upsert (Insert ou Update) dos Campos
            // Mapa para traduzir IDs (Temp/Real -> Real)
            const idMap: Record<string | number, number> = {};

            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                const optionsValue = (field.options && field.options.length > 0) 
                    ? JSON.stringify(field.options) : '[]';

                let realId: number;

                // Se ID é string (ex: "field_123"), é NOVO -> INSERT
                if (typeof field.id === 'string') {
                    const res = await client.query(`
                        INSERT INTO form_fields (
                            form_id, field_type, label, placeholder, 
                            options, is_required, field_order
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id
                    `, [
                        formId, field.field_type, field.label.trim(), 
                        field.placeholder?.trim() || null, optionsValue, 
                        field.is_required || false, i + 1
                    ]);
                    realId = res.rows[0].id;
                    // Mapeia o ID temporário para o novo ID real
                    idMap[field.id] = realId;
                } 
                // Se ID é number, é EXISTENTE -> UPDATE
                else {
                    await client.query(`
                        UPDATE form_fields SET
                            field_type = $1, label = $2, placeholder = $3,
                            options = $4, is_required = $5, field_order = $6
                        WHERE id = $7
                    `, [
                        field.field_type, field.label.trim(), 
                        field.placeholder?.trim() || null, optionsValue, 
                        field.is_required || false, i + 1, field.id
                    ]);
                    realId = field.id;
                    // Mapeia ele para ele mesmo
                    idMap[realId] = realId;
                }
            }

            // 4. Atualizar Condições (Segunda passada para resolver dependências)
            for (const field of fields) {
                // Se o campo tem condição configurada
                if (field.condition_field_id && field.condition_operator) {
                    
                    // Descobrimos o ID real de quem estamos editando
                    // Se era novo, usa o ID mapeado. Se era velho, usa o ID numérico.
                    const currentRealId = typeof field.id === 'string' ? idMap[field.id] : field.id;
                    
                    // Descobrimos o ID real do campo alvo da condição
                    const targetRealId = idMap[field.condition_field_id];

                    if (currentRealId && targetRealId && currentRealId !== targetRealId) {
                        await client.query(`
                            UPDATE form_fields
                            SET condition_field_id = $1, condition_operator = $2, condition_value = $3
                            WHERE id = $4
                        `, [
                            targetRealId, 
                            field.condition_operator, 
                            field.condition_value || null, 
                            currentRealId
                        ]);
                    }
                } else {
                    // Se não tem condição (ou foi removida no front), limpamos no banco
                    // Mas precisamos do ID real
                    const currentRealId = typeof field.id === 'string' ? idMap[field.id] : field.id;
                    await client.query(`
                        UPDATE form_fields
                        SET condition_field_id = NULL, condition_operator = NULL, condition_value = NULL
                        WHERE id = $1
                    `, [currentRealId]);
                }
            }

            await client.query('COMMIT');

        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Erro ao atualizar formulário' });
        } finally {
            client.release();
        }

        throw redirect(303, '/forms/manage');
    }
};