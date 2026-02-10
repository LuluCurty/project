import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

interface OptionStat {
    option: string;
    count: number;
    percentage: number;
}

interface FieldStat {
    id: number;
    label: string;
    fieldType: string;
    totalResponses: number;
    optionStats?: OptionStat[];
    numberStats?: { min: number; max: number; avg: number; total: number };
    textStats?: { avgLength: number; totalResponses: number };
}

export const load: PageServerLoad = async ({ url }) => {
    const selectedFormId = Number(url.searchParams.get('formId')) || 0;

    try {
        // Visão geral
        const overviewQuery = `
            SELECT
                (SELECT COUNT(*) FROM forms) as total_forms,
                (SELECT COUNT(*) FROM forms WHERE is_active = TRUE) as active_forms,
                (SELECT COUNT(*) FROM forms WHERE is_active = FALSE) as inactive_forms,
                (SELECT COUNT(*) FROM form_responses) as total_responses,
                (SELECT COUNT(*) FROM form_assignments) as total_assignments
        `;

        // Estatísticas de atribuições
        const assignmentStatsQuery = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN is_completed = FALSE AND (due_date IS NULL OR due_date >= NOW()) THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN is_completed = FALSE AND due_date < NOW() THEN 1 ELSE 0 END) as overdue
            FROM form_assignments
        `;

        // Top 10 formulários por respostas
        const topFormsQuery = `
            SELECT
                f.id,
                f.title,
                f.is_active,
                COUNT(DISTINCT fr.id) as response_count,
                COUNT(DISTINCT fa.id) as assignment_count,
                CASE
                    WHEN COUNT(DISTINCT fa.id) > 0
                    THEN ROUND((COUNT(DISTINCT fr.id)::numeric / COUNT(DISTINCT fa.id)) * 100, 1)
                    ELSE 0
                END as completion_rate
            FROM forms f
            LEFT JOIN form_responses fr ON fr.form_id = f.id
            LEFT JOIN form_assignments fa ON fa.form_id = f.id
            GROUP BY f.id, f.title, f.is_active
            ORDER BY response_count DESC
            LIMIT 10
        `;

        // Respostas por mês (últimos 6 meses)
        const monthlyQuery = `
            SELECT
                to_char(submitted_at, 'YYYY-MM') as month,
                to_char(submitted_at, 'Mon/YYYY') as month_label,
                COUNT(*) as count
            FROM form_responses
            WHERE submitted_at >= NOW() - INTERVAL '6 months'
            GROUP BY month, month_label
            ORDER BY month ASC
        `;

        // Top 10 respondedores
        const topRespondersQuery = `
            SELECT
                u.user_id,
                u.first_name || ' ' || u.last_name as name,
                u.email,
                COUNT(DISTINCT fr.id) as response_count,
                COUNT(DISTINCT CASE WHEN fa.is_completed = TRUE THEN fa.id END) as completed_assignments,
                COUNT(DISTINCT fa.id) as total_assignments
            FROM users u
            LEFT JOIN form_responses fr ON fr.user_id = u.user_id
            LEFT JOIN form_assignments fa ON fa.user_id = u.user_id
            WHERE fr.id IS NOT NULL
            GROUP BY u.user_id, u.first_name, u.last_name, u.email
            ORDER BY response_count DESC
            LIMIT 10
        `;

        // Lista de formulários para o seletor
        const formsListQuery = `
            SELECT f.id, f.title,
                   COUNT(DISTINCT fr.id) as response_count
            FROM forms f
            LEFT JOIN form_responses fr ON fr.form_id = f.id
            GROUP BY f.id, f.title
            ORDER BY f.title ASC
        `;

        const queries: Promise<any>[] = [
            pool.query(overviewQuery),
            pool.query(assignmentStatsQuery),
            pool.query(topFormsQuery),
            pool.query(monthlyQuery),
            pool.query(topRespondersQuery),
            pool.query(formsListQuery)
        ];

        // Se um formulário foi selecionado, buscar dados por campo
        if (selectedFormId) {
            queries.push(
                pool.query(`
                    SELECT ff.id, ff.field_type, ff.label, ff.options, ff.field_order,
                           frv.value
                    FROM form_fields ff
                    LEFT JOIN form_response_values frv ON frv.field_id = ff.id
                    WHERE ff.form_id = $1 AND ff.is_deleted = FALSE
                    ORDER BY ff.field_order ASC
                `, [selectedFormId])
            );
        }

        const results = await Promise.all(queries);

        const [overviewRes, assignmentRes, topFormsRes, monthlyRes, topRespondersRes, formsListRes] = results;

        const overview = overviewRes.rows[0];
        const assignments = assignmentRes.rows[0];

        const completionRate = Number(assignments.total) > 0
            ? Math.round((Number(assignments.completed) / Number(assignments.total)) * 100)
            : 0;

        // Processar estatísticas por campo
        let fieldStats: FieldStat[] = [];

        if (selectedFormId && results[6]) {
            const rawRows = results[6].rows;

            // Agrupar por campo
            const fieldMap = new Map<number, {
                id: number;
                field_type: string;
                label: string;
                options: any;
                values: string[];
            }>();

            for (const row of rawRows) {
                if (!fieldMap.has(row.id)) {
                    fieldMap.set(row.id, {
                        id: row.id,
                        field_type: row.field_type,
                        label: row.label,
                        options: row.options,
                        values: []
                    });
                }
                if (row.value !== null && row.value !== '') {
                    fieldMap.get(row.id)!.values.push(row.value);
                }
            }

            for (const field of fieldMap.values()) {
                const stat: FieldStat = {
                    id: field.id,
                    label: field.label,
                    fieldType: field.field_type,
                    totalResponses: field.values.length
                };

                if (field.field_type === 'select' || field.field_type === 'radio') {
                    // Contar cada opção selecionada
                    const counts = new Map<string, number>();
                    for (const val of field.values) {
                        counts.set(val, (counts.get(val) || 0) + 1);
                    }
                    const total = field.values.length;
                    stat.optionStats = Array.from(counts.entries())
                        .map(([option, count]) => ({
                            option,
                            count,
                            percentage: total > 0 ? Math.round((count / total) * 100) : 0
                        }))
                        .sort((a, b) => b.count - a.count);

                } else if (field.field_type === 'checkbox') {
                    // Checkbox: valores separados por vírgula, contar cada opção
                    const counts = new Map<string, number>();
                    let totalSelections = 0;
                    for (const val of field.values) {
                        const options = val.split(',').map(o => o.trim()).filter(Boolean);
                        for (const opt of options) {
                            counts.set(opt, (counts.get(opt) || 0) + 1);
                            totalSelections++;
                        }
                    }
                    // Porcentagem = quantas respostas marcaram essa opção / total de respostas
                    const totalRespondents = field.values.length;
                    stat.optionStats = Array.from(counts.entries())
                        .map(([option, count]) => ({
                            option,
                            count,
                            percentage: totalRespondents > 0 ? Math.round((count / totalRespondents) * 100) : 0
                        }))
                        .sort((a, b) => b.count - a.count);

                } else if (field.field_type === 'number') {
                    const numbers = field.values
                        .map(v => parseFloat(v))
                        .filter(n => !isNaN(n));
                    if (numbers.length > 0) {
                        stat.numberStats = {
                            min: Math.min(...numbers),
                            max: Math.max(...numbers),
                            avg: Math.round((numbers.reduce((a, b) => a + b, 0) / numbers.length) * 100) / 100,
                            total: numbers.length
                        };
                    }

                } else if (field.field_type === 'text' || field.field_type === 'textarea') {
                    const lengths = field.values.map(v => v.length);
                    stat.textStats = {
                        avgLength: lengths.length > 0
                            ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
                            : 0,
                        totalResponses: field.values.length
                    };
                }

                fieldStats.push(stat);
            }
        }

        return {
            overview: {
                totalForms: Number(overview.total_forms),
                activeForms: Number(overview.active_forms),
                inactiveForms: Number(overview.inactive_forms),
                totalResponses: Number(overview.total_responses),
                totalAssignments: Number(overview.total_assignments)
            },
            assignments: {
                total: Number(assignments.total),
                completed: Number(assignments.completed),
                pending: Number(assignments.pending),
                overdue: Number(assignments.overdue),
                completionRate
            },
            topForms: topFormsRes.rows.map((f: any) => ({
                id: f.id,
                title: f.title,
                isActive: f.is_active,
                responseCount: Number(f.response_count),
                assignmentCount: Number(f.assignment_count),
                completionRate: Number(f.completion_rate)
            })),
            monthlyResponses: monthlyRes.rows.map((m: any) => ({
                month: m.month,
                label: m.month_label,
                count: Number(m.count)
            })),
            topResponders: topRespondersRes.rows.map((r: any) => ({
                userId: r.user_id,
                name: r.name,
                email: r.email,
                responseCount: Number(r.response_count),
                completedAssignments: Number(r.completed_assignments),
                totalAssignments: Number(r.total_assignments)
            })),
            formsList: formsListRes.rows.map((f: any) => ({
                id: f.id,
                title: f.title,
                responseCount: Number(f.response_count)
            })),
            selectedFormId,
            fieldStats
        };
    } catch (e) {
        console.error('Erro ao carregar estatísticas:', e);
        return {
            overview: { totalForms: 0, activeForms: 0, inactiveForms: 0, totalResponses: 0, totalAssignments: 0 },
            assignments: { total: 0, completed: 0, pending: 0, overdue: 0, completionRate: 0 },
            topForms: [],
            monthlyResponses: [],
            topResponders: [],
            formsList: [],
            selectedFormId: 0,
            fieldStats: []
        };
    }
};
