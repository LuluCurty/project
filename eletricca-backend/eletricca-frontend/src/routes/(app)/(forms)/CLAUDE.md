# Forms System
This is basically a forms system so my users 
can create forms, answer forms, delete forms
or manage forms

# Layout 
- (forms) -> will be home for my docs files
- (forms)/forms -> will be where my system is
- forms/+page.server.ts will be where I will filter who is allowed to enter this module
- forms/+layout.server.ts redundance for guarding the frontend
- forms/+page.svelte will be my frontend, I will list all my forms here, together with the options to delete, edit and create new forms (which are permissions that will be managed by the backend on +page.server.ts)
- Users will be able to click on one form and create a new entry, meaning the will be able to answer it and sent information to the backend
- This will be responsive as I plan to build a mobile app based on this system


# Database Tables involved

## forms
Form metadata.
- `id` - PK
- `title` - form title
- `description` - optional description
- `created_by` - FK users(user_id)
- `is_active` - whether form is active
- `created_at`, `updated_at`

## form_fields
Form field definitions.
- `id` - PK
- `form_id` - FK forms(id) CASCADE
- `field_type` - text, number, select, checkbox, date, textarea, file
- `label` - field label
- `placeholder` - placeholder text
- `options` - JSONB for select/checkbox ["Option 1", "Option 2"]
- `is_required` - required field?
- `field_order` - display order
- `condition_field_id` - FK form_fields(id) for conditional logic
- `condition_operator` - equals, not_equals, contains
- `condition_value` - value to compare against
- `is_deleted` - soft delete (preserves history)
- `deleted_at`, `created_at`

## form_assignments
Form assignments to users (allows recurrence).
- `id` - PK
- `form_id` - FK forms(id) CASCADE
- `user_id` - FK users(user_id) CASCADE (who should respond)
- `assigned_by` - FK users(user_id) (who assigned)
- `assigned_at` - assignment date
- `due_date` - optional deadline
- `period_reference` - 'Jan/2025', 'Week 15', etc.
- `is_completed` - whether completed
- `completed_at` - completion timestamp

## form_responses
Submitted responses (LOCKED after submission, only admin/manager can edit).
- `id` - PK
- `form_id` - FK forms(id) CASCADE
- `user_id` - FK users(user_id) (who responded)
- `assignment_id` - FK form_assignments(id) optional
- `submitted_at` - submission date
- `edited_by` - FK users(user_id) if admin edited
- `edited_at` - when edited

## form_response_values
Values for normal fields (text, number, select, etc.).
- `id` - PK
- `response_id` - FK form_responses(id) CASCADE
- `field_id` - FK form_fields(id) RESTRICT (preserves history)
- `value` - response value

## form_files
Uploaded files (for 'file' type fields).
- `id` - PK
- `response_id` - FK form_responses(id) CASCADE
- `field_id` - FK form_fields(id) RESTRICT
- `file_name` - original file name
- `file_path` - storage path
- `file_type` - mime type
- `file_size` - size in bytes
- `uploaded_at`

# Useful Queries

## Fetch complete responses
```sql
-- Normal values
SELECT rv.*, ff.label, ff.field_type
FROM form_response_values rv
JOIN form_fields ff ON rv.field_id = ff.id
WHERE rv.response_id = $1;

-- Files
SELECT f.*, ff.label
FROM form_files f
JOIN form_fields ff ON f.field_id = ff.id
WHERE f.response_id = $1;
```

# File Organization

(forms)/
├── CLAUDE.md
└── forms/
    ├── +page.svelte              # Home - lista forms públicos/disponíveis
    ├── +page.server.ts
    ├── +layout.server.ts         # Guard - só usuários autenticados
    │
    ├── assigned/                 # Forms atribuídos ao usuário logado
    │   ├── +page.svelte
    │   └── +page.server.ts
    │
    ├── [formId]/                 # Form específico (dinâmico)
    │   ├── +page.svelte          # Preencher/responder o form
    │   ├── +page.server.ts
    │   │
    │   └── responses/            # Ver respostas deste form (autorizado)
    │       ├── +page.svelte
    │       ├── +page.server.ts
    │       │
    │       └── [responseId]/     # Ver resposta específica
    │           ├── +page.svelte
    │           └── +page.server.ts
    │
    └── manage/                   # Gerenciamento (autorizado)
        ├── +page.svelte          # Dashboard - lista forms com opções
        ├── +page.server.ts
        │
        ├── create/               # Criar novo form
        │   ├── +page.svelte
        │   └── +page.server.ts
        │
        ├── [formId]/             # Editar form específico
        │   ├── +page.svelte      # Edit form fields
        │   ├── +page.server.ts
        │   │
        │   └── assign/           # Atribuir form a usuários
        │       ├── +page.svelte
        │       └── +page.server.ts
        │
        └── +layout.server.ts     # Guard - só managers/admins
