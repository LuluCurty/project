import { fail, redirect, error } from "@sveltejs/kit"; 
import { pool } from "$lib/server/db";
import { guardAction } from "$lib/server/auth";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals, params}) => {
    const user= locals.user;
    if (!user) throw redirect(302, '/login');

    const assignmentId = params.assignmentId;

    try {
        // 1. Buscar assignment + detalhes do form
        // vericamos se pertence ao usuario por segurança

        const assignRes = await pool.query(`
                SELECT
                    fa.id, fa.form_id, fa.is_completed, fa.due_date, fa.period_reference,
                    f.title, f.description
                FROM form_assignments fa
                JOIN forms f ON fa.form_id = f.id
                WHERE fa.id = $1 AND fa.user_id = $2

            ;`, [assignmentId, user.user_id]
        );

        if (assignRes.rowCount === 0) throw error(404, 'Atribuicao não encontrada');

        const assignment = assignRes.rows[0];

        if (assignment.is_completed) {
            throw redirect(303, `/forms/view/${assignmentId}`);
        }

        // 2. buscar campos fields
        const fieldsRes = await pool.query(`
            SELECT id, field_type, label, placeholder, options, is_required, field_order,
                   condition_field_id, condition_operator, condition_value
            FROM form_fields
            WHERE form_id = $1 AND is_deleted = FALSE
            ORDER BY field_order ASC
        ;`, [assignment.form_id]);

        return {
            assignment,
            fields: fieldsRes.rows
        }
    } catch (e: any) {
        if (e.status || e.location) throw e; // Re-lançar error() e redirect() do SvelteKit
        console.error('Erro ao carregar formulário:', e);
        throw error(500, 'Erro ao carregar formulário');
    }
};

export const actions: Actions = {
    submit: async ({ request, locals, params }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const assignmentId = Number(params.assignmentId);
        const formData = await request.formData();
        
        // Verificar se a atribuição existe, pertence ao usuário e ainda não foi completada
        const assignCheck = await pool.query(
            'SELECT form_id, is_completed FROM form_assignments WHERE id = $1 AND user_id = $2',
            [assignmentId, user.user_id]
        );
        if (assignCheck.rowCount === 0) return fail(404, { error: 'Atribuição não encontrada.' });
        if (assignCheck.rows[0].is_completed) return fail(400, { error: 'Este formulário já foi respondido.' });
        const formId = assignCheck.rows[0].form_id;

        // Validação server-side: campos obrigatórios (respeitando lógica condicional)
        const fieldsRes = await pool.query(
            `SELECT id, field_type, is_required, label, condition_field_id, condition_operator, condition_value
             FROM form_fields WHERE form_id = $1 AND is_deleted = FALSE ORDER BY field_order ASC`,
            [formId]
        );

        // Montar mapa de respostas enviadas para verificar visibilidade condicional
        const submittedAnswers: Record<number, string> = {};
        for (const field of fieldsRes.rows) {
            const fKey = `field_${field.id}`;
            if (field.field_type === 'checkbox') {
                const vals = formData.getAll(fKey).map(v => v.toString()).filter(Boolean);
                submittedAnswers[field.id] = vals.join(',');
            } else {
                const val = formData.get(fKey);
                submittedAnswers[field.id] = val ? val.toString() : '';
            }
        }

        // Replicar lógica de visibilidade condicional do frontend
        function isFieldVisible(field: any): boolean {
            if (!field.condition_field_id) return true;
            const parentValue = submittedAnswers[field.condition_field_id];
            if (!parentValue || parentValue.trim() === '') return false;
            const condVal = field.condition_value;
            switch (field.condition_operator) {
                case 'equals': return parentValue === condVal;
                case 'not_equals': return parentValue !== condVal;
                case 'contains': return parentValue.includes(condVal);
                default: return true;
            }
        }

        for (const field of fieldsRes.rows) {
            if (!field.is_required) continue;
            if (!isFieldVisible(field)) continue; // Pular campos que não estão visíveis

            if (field.field_type === 'checkbox') {
                const values = formData.getAll(`field_${field.id}`);
                if (!values || values.length === 0 || (values.length === 1 && values[0] === '')) {
                    return fail(400, { error: `O campo "${field.label}" é obrigatório.` });
                }
            } else if (field.field_type !== 'file') {
                const value = formData.get(`field_${field.id}`);
                if (!value || value.toString().trim() === '') {
                    return fail(400, { error: `O campo "${field.label}" é obrigatório.` });
                }
            }
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Criar a "Resposta Mãe" (Response)
            const resQuery = await client.query(`
                INSERT INTO form_responses (form_id, user_id, assignment_id, submitted_at)
                VALUES ($1, $2, $3, NOW())
                RETURNING id
            `, [formId, user.user_id, assignmentId]);
            
            const responseId = resQuery.rows[0].id;

            // 2. Processar cada campo do FormData
            // O frontend manda os campos com nome "field_{ID}"
            for (const [key, value] of formData.entries()) {
                if (key.startsWith('field_')) {
                    const fieldId = Number(key.replace('field_', ''));
                    
                    // Verificamos o tipo do valor
                    if (value instanceof File) {
                        // === PROCESSAMENTO DE ARQUIVO ===
                        if (value.size > 0) {
                            const fileName = `${Date.now()}_${fieldId}_${value.name}`;
                            // Caminho relativo para salvar (crie a pasta static/uploads antes!)
                            const uploadDir = 'static/uploads'; 
                            const filePath = join(process.cwd(), uploadDir, fileName);
                            
                            // Cria pasta se não existir
                            try { mkdirSync(uploadDir, { recursive: true }); } catch {}

                            // Salva arquivo
                            const buffer = Buffer.from(await value.arrayBuffer());
                            writeFileSync(filePath, buffer);

                            // Salva metadados na tabela form_files
                            await client.query(`
                                INSERT INTO form_files 
                                (response_id, field_id, file_name, file_path, file_type, file_size)
                                VALUES ($1, $2, $3, $4, $5, $6)
                            `, [
                                responseId, fieldId, value.name, 
                                `/uploads/${fileName}`, // Caminho web
                                value.type, value.size
                            ]);
                        }
                    } else {
                        // === PROCESSAMENTO DE TEXTO/NUMERO ===
                        // Se for string vazia e não obrigatório, salvamos null ou string vazia?
                        // Vamos salvar string vazia se vier.
                        if (value !== null) {
                            await client.query(`
                                INSERT INTO form_response_values (response_id, field_id, value)
                                VALUES ($1, $2, $3)
                            `, [responseId, fieldId, value.toString()]);
                        }
                    }
                }
            }

            // 3. Marcar Assignment como Concluído
            await client.query(`
                UPDATE form_assignments 
                SET is_completed = TRUE, completed_at = NOW() 
                WHERE id = $1
            `, [assignmentId]);

            await client.query('COMMIT');

        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Erro no submit:', e);
            return fail(500, { error: 'Erro ao salvar resposta.' });
        } finally {
            client.release();
        }

        throw redirect(303, '/forms/assigned?status=completed');
    }
};