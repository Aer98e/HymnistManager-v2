# 🗄️ Modelo de Base de Datos y DDL Final (Supabase / PostgreSQL)

Este documento contiene el modelo relacional definitivo, estandarizado en inglés y adaptado para **Supabase RLS, Vistas y Triggers**.

---

# 📐 1. Esquema del ERD

```
USERS (auth.users)
 ├── USER_PREFERENCES (1:1)
 ├──< CONTEXTS (ON DELETE CASCADE)
 │     ├──< PROGRAMS
 │     │     └──< PROGRAM_HYMN >── HYMNS
 │     └── (FK new_hymns_category_id) ──> CATEGORIES
 └──< USER_HYMN >── HYMNS

HYMNS
 ├──< HYMNAL_HYMN >── HYMNALS (type: private | pending | rejected | public)
 └──< CATEGORY_HYMN >── CATEGORIES (created_by IS NULL -> global)
```

---

# 🧱 2. Definición de Tablas y Atributos

### **GLOBALES**

#### `languages`
- `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
- `name`: `TEXT NOT NULL`
- `abbreviation`: `VARCHAR(10) NOT NULL`

#### `hymns`
- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `title_es`: `TEXT NOT NULL`
- `title_original`: `TEXT`
- `composer`: `TEXT`
- `type`: `VARCHAR(20) NOT NULL DEFAULT 'private'` CHECK (`type` IN ('public', 'private'))
- `created_by`: `UUID REFERENCES auth.users(id) ON DELETE SET NULL`
- `created_at`: `TIMESTAMPTZ DEFAULT now()`

#### `hymnals`
- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `name`: `TEXT NOT NULL`
- `type`: `VARCHAR(20) NOT NULL DEFAULT 'private'` CHECK (`type` IN ('private', 'pending', 'rejected', 'public'))
- `rejection_reason`: `TEXT`
- `created_by`: `UUID REFERENCES auth.users(id) ON DELETE CASCADE`
- `language_id`: `BIGINT REFERENCES languages(id)`
- `created_at`: `TIMESTAMPTZ DEFAULT now()`

#### `hymnal_hymn`
- `hymnal_id`: `UUID REFERENCES hymnals(id) ON DELETE CASCADE`
- `hymn_id`: `UUID REFERENCES hymns(id) ON DELETE CASCADE`
- `number`: `INT NOT NULL`
- `PRIMARY KEY (hymnal_id, hymn_id)`

#### `categories`
- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `name`: `TEXT NOT NULL`
- `created_by`: `UUID REFERENCES auth.users(id) ON DELETE CASCADE`
- `CONSTRAINT unique_name_per_creator UNIQUE NULLS NOT DISTINCT (name, created_by)`

#### `category_hymn`
- `category_id`: `UUID REFERENCES categories(id) ON DELETE CASCADE`
- `hymn_id`: `UUID REFERENCES hymns(id) ON DELETE CASCADE`
- `PRIMARY KEY (category_id, hymn_id)`

#### `notes`
- `id`: `INT PRIMARY KEY`
- `name_es`: `VARCHAR(10) NOT NULL`
- `name_en`: `VARCHAR(10) NOT NULL`

---

### **ESPACIO DE USUARIO**

#### `user_preferences`
- `user_id`: `UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `new_hymn_threshold`: `INT DEFAULT 5`

#### `contexts`
- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id`: `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `name`: `TEXT NOT NULL`
- `new_hymns_category_id`: `UUID REFERENCES categories(id) ON DELETE SET NULL`

#### `programs`
- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `context_id`: `UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE`
- `date`: `DATE NOT NULL`
- `name`: `TEXT`

#### `program_hymn`
- `program_id`: `UUID REFERENCES programs(id) ON DELETE CASCADE`
- `hymn_id`: `UUID REFERENCES hymns(id) ON DELETE CASCADE`
- `order_index`: `INT NOT NULL`
- `PRIMARY KEY (program_id, hymn_id)`

#### `user_hymn`
- `user_id`: `UUID REFERENCES auth.users(id) ON DELETE CASCADE`
- `hymn_id`: `UUID REFERENCES hymns(id) ON DELETE CASCADE`
- `key_id`: `INT REFERENCES notes(id)`
- `highest_note_id`: `INT REFERENCES notes(id)`
- `highest_octave`: `INT`
- `lowest_note_id`: `INT REFERENCES notes(id)`
- `lowest_octave`: `INT`
- `has_modulation`: `BOOLEAN DEFAULT false`
- `energy`: `INT CHECK (energy BETWEEN 1 AND 5)`
- `PRIMARY KEY (user_id, hymn_id)`

---

# 📊 3. Vistas SQL Dinámicas (PostgreSQL Views)

### `v_hymn_usage_stats`
Calcula los usos pasados de cada himno por contexto:
```sql
CREATE OR REPLACE VIEW v_hymn_usage_stats AS
SELECT 
    c.user_id,
    p.context_id,
    ph.hymn_id,
    COUNT(p.id) AS total_uses,
    MAX(p.date) AS last_used_at
FROM programs p
JOIN program_hymn ph ON ph.program_id = p.id
JOIN contexts c ON c.id = p.context_id
WHERE p.date <= CURRENT_DATE
GROUP BY c.user_id, p.context_id, ph.hymn_id;
```

### `v_active_new_hymns`
Determina dinámicamente qué himnos de la categoría de himnos nuevos aún no han alcanzado el umbral:
```sql
CREATE OR REPLACE VIEW v_active_new_hymns AS
SELECT 
    c.user_id,
    c.id AS context_id,
    ch.hymn_id,
    COALESCE(us.total_uses, 0) AS usage_count,
    up.new_hymn_threshold
FROM contexts c
JOIN category_hymn ch ON ch.category_id = c.new_hymns_category_id
JOIN user_preferences up ON up.user_id = c.user_id
LEFT JOIN v_hymn_usage_stats us ON us.context_id = c.id AND us.hymn_id = ch.hymn_id
WHERE COALESCE(us.total_uses, 0) < up.new_hymn_threshold;
```