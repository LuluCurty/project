# Tasks System
A basic task system so my managers can give tasks to my users
Users can manage their own individual tasks
Managers will have the capacity to view assignments, statistics, delete or edit tasks

# Layout
- (tasks) -> will be home for my docs files
- (tasks)/tasks -> will be where my system is
- tasks/+page.server.ts will be where I will filter who is allowed to enter this module
- tasks/+layout.server.ts redundance for guarding the frontend
- tasks/+page.svelte will be my frontend, I will list all my tasks here, together with the options to delete, edit and create new tasks (which are permissions that will be managed by the backend on +page.server.ts)
- Users will be able to click on one task and create a new entry, meaning they will be able to answer it and send information to the backend
- This will be responsive as I plan to build a mobile app based on this system

# Rules
- One task can be assigned to N users
- Each user will progress their task individualy
- Categories are made in a way to group up various different tasks
- Personnal tasks are simple tasks without assignments where task_type = 'personal'

## Table Description

- task_categories: task grouping
- tasks: task definition, without assigned_to. Status/priority/due_date/ used only when it is personal task
- task_steps: template with description, CHECK step_order BETWEEN 1 and 5, UNIQUE (task_id, step_order)
- tasj_assignments: This is the link between a task and N users with status/priority/due_date. UNIQUE (task_id, user_id)
- task_step_progress: Progress by assignment and step, UNIQUE (assignment_id, step_id)
- task_comments: task comment, unique for each task
- notifications: future notification system

task → task_steps (template dos passos)
task → task_assignments (N usuários)
task_assignment → task_step_progress (progresso individual por step)


## Query Example

### Peronal Tasks
WHERE task_type = 'personal' AND created_by = $user_id

### Assigned Tasks
JOIN task_assignments ta ON ta.task.id = t.id WHERE ta.user_id = $user_id

### Assigned Progress
SELECT * FROM task_step_progress WHERE assignment_id = $id

### Deashboard
JOIN task_assignments + aggregate by status

### Statistics 
Only when task_type = 'assigned' by task_assignments

### Auto-complete Assignment
Only when every steps is_completed = TRUE will mark assignment with completed


# Database Table Involved

Claude will help me create new tables so I can organize my data

# Uselful Queries

# File Organization
(tasks)/tasks/
├── +layout.server.ts              # Guard: qualquer user logado
├── +error.svelte
│
├── +page.svelte                   # Home: lista tasks pessoais + atribuídas do user
├── +page.server.ts                # Load: personal tasks + assigned tasks do user
│
├── [taskId]/                      # Detalhe de uma task (user vê seus steps, marca progresso)
│   ├── +page.svelte
│   └── +page.server.ts
│
└── manage/                        # Gestão (gestores/admins)
    ├── +layout.server.ts          # Guard: permissão de gestão
    ├── +page.svelte               # Dashboard: todas tasks assigned, stats, filtros
    ├── +page.server.ts
    │
    ├── create/                    # Criar nova task (definição + steps)
    │   ├── +page.svelte
    │   └── +page.server.ts
    │
    ├── [taskId]/                  # Editar task existente
    │   ├── +page.svelte
    │   └── +page.server.ts
    │   │
    │   └── assign/                # Atribuir task a N usuários
    │       ├── +page.svelte
    │       └── +page.server.ts
    |
    ├── categories/
    |   ├── +page.svelte
    |   └── +page.server.ts
    |
    │
    └── assignments/               # Ver todas atribuições, progresso por user
        ├── +page.svelte
        └── +page.server.ts
    
# Security, Authentication and Logging

# Schema do Sistema de Tasks
## Schema

- TABLE task_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);
- TABLE tasks (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    task_type       VARCHAR(20) NOT NULL DEFAULT 'personal'
                    CHECK (task_type IN ('personal', 'assigned')),
    category_id     INT REFERENCES task_categories(id) ON DELETE SET NULL,
    created_by      INT NOT NULL REFERENCES users(user_id),
    -- Campos usados APENAS por personal tasks
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority        VARCHAR(10) DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date        TIMESTAMP,
    completed_at    TIMESTAMP,
    -- Recorrência (apenas assigned)
    is_recurring        BOOLEAN DEFAULT FALSE,
    recurrence_rule     VARCHAR(20)
                        CHECK (recurrence_rule IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    recurrence_end_date TIMESTAMP,
    parent_task_id      INT REFERENCES tasks(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
- TABLE task_steps (
    id          SERIAL PRIMARY KEY,
    task_id     INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    step_order  INT NOT NULL CHECK (step_order BETWEEN 1 AND 5),
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE (task_id, step_order)
);
- TABLE task_assignments (
    id              SERIAL PRIMARY KEY,
    task_id         INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id         INT NOT NULL REFERENCES users(user_id),
    assigned_by     INT NOT NULL REFERENCES users(user_id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority        VARCHAR(10) NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date        TIMESTAMP,
    assigned_at     TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP,
    UNIQUE (task_id, user_id)
);
- TABLE task_step_progress (
    id              SERIAL PRIMARY KEY,
    assignment_id   INT NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
    step_id         INT NOT NULL REFERENCES task_steps(id) ON DELETE CASCADE,
    is_completed    BOOLEAN DEFAULT FALSE,
    completed_at    TIMESTAMP,
    UNIQUE (assignment_id, step_id)
);
- TABLE task_comments (
    id          SERIAL PRIMARY KEY,
    task_id     INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(user_id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);
- TABLE notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    message         TEXT,
    type            VARCHAR(30) NOT NULL DEFAULT 'info'
                    CHECK (type IN ('info', 'task_assigned', 'task_completed', 'task_comment', 'system')),
    reference_type  VARCHAR(30),    -- 'task', 'form', etc.
    reference_id    INT,            -- ID do objeto referenciado
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);
- INDEXES
- INDEX idx_tasks_created_by ON tasks(created_by);
- INDEX idx_tasks_type ON tasks(task_type);
- INDEX idx_tasks_category ON tasks(category_id) WHERE category_id IS NOT NULL;
- INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
- INDEX idx_task_steps_task ON task_steps(task_id);
- INDEX idx_task_assignments_task ON task_assignments(task_id);
- INDEX idx_task_assignments_user ON task_assignments(user_id);
- INDEX idx_task_assignments_status ON task_assignments(user_id, status);
- INDEX idx_task_step_progress_assignment ON task_step_progress(assignment_id);
- INDEX idx_task_comments_task ON task_comments(task_id);
- INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
- INDEX idx_notifications_user ON notifications(user_id);


task → task_steps (template dos passos)
task → task_assignments (N usuários)
task_assignment → task_step_progress (progresso individual por step)
