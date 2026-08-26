# 🗄️ Documentación de la Base de Datos - Hymn List Manager

Documentación técnica completa del modelo de base de datos relacional para PostgreSQL / Supabase, incluyendo tablas, atributos, vistas, funciones, triggers y políticas RLS.

---

## 📐 1. Diagrama de Relaciones (ERD)

```
auth.users (Supabase Auth)
 ├── user_preferences (1:1)
 ├──< contexts (ON DELETE CASCADE)
 │     ├──< programs
 │     │     └──< program_hymn >── hymns
 │     └── (FK new_hymns_category_id) ──> categories
 ├──< user_hymn >── hymns
 ├──< hymnals
 └──< hymns

hymns (Globales o Privados)
 ├──< hymnal_hymn >── hymnals (type: private | pending | rejected | public)
 └──< category_hymn >── categories (created_by IS NULL -> global)
```

---

## 🧱 2. Catálogo de Tablas y Atributos

### **A. Tablas Globales y de Repertorio**

#### `public.languages`
Almacena los idiomas disponibles en la aplicación (ej. Español, Inglés).
* `id` (`BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`): Identificador único del idioma.
* `name` (`TEXT NOT NULL`): Nombre del idioma (ej. `'Español'`).
* `abbreviation` (`VARCHAR(10) NOT NULL`): Código ISO/Abreviatura (ej. `'ES'`).

#### `public.hymns`
Almacena la biblioteca general de himnos (públicos globales o privados del usuario).
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): Identificador único del himno.
* `title_es` (`TEXT NOT NULL`): Título del himno en español.
* `title_original` (`TEXT`): Título en idioma original o versión alternativa.
* `composer` (`TEXT`): Autor o compositor del himno.
* `first_line` (`TEXT`): Primera línea de la 1ª estrofa.
* `refrain_first_line` (`TEXT`): Primera línea del coro o estribillo.
* `type` (`VARCHAR(20) NOT NULL DEFAULT 'private'`): Tipo de visibilidad. `CHECK (type IN ('public', 'private'))`.
* `created_by` (`UUID REFERENCES auth.users(id) ON DELETE SET NULL`): Usuario creador del himno.
* `created_at` (`TIMESTAMPTZ DEFAULT now()`): Fecha y hora de creación.

#### `public.hymnals`
Almacena los himnarios (colecciones numeradas).
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): Identificador único del himnario.
* `name` (`TEXT NOT NULL`): Nombre del himnario.
* `type` (`VARCHAR(20) NOT NULL DEFAULT 'private'`): Estado de publicación. `CHECK (type IN ('private', 'pending', 'rejected', 'public'))`.
* `rejection_reason` (`TEXT`): Retroalimentación enviada por el administrador en caso de rechazo.
* `created_by` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`): Creador del himnario.
* `language_id` (`BIGINT REFERENCES languages(id)`): ID del idioma del himnario.
* `created_at` (`TIMESTAMPTZ DEFAULT now()`): Fecha de creación.

#### `public.hymnal_hymn`
Tabla intermedia que mapea números dentro de un himnario a un himno específico.
* `hymnal_id` (`UUID REFERENCES hymnals(id) ON DELETE CASCADE`): ID del himnario.
* `hymn_id` (`UUID REFERENCES hymns(id) ON DELETE CASCADE`): ID del himno enlazado.
* `number` (`INT NOT NULL`): Número asignado al himno dentro de ese himnario.
* **Llave Primaria:** `PRIMARY KEY (hymnal_id, hymn_id)`

#### `public.categories`
Categorías temáticas de himnos (ej. Alabanza, Himnos Nuevos).
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): ID de la categoría.
* `name` (`TEXT NOT NULL`): Nombre de la categoría.
* `created_by` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`): Creador (si es `NULL`, la categoría es global).
* **Restricción:** `UNIQUE NULLS NOT DISTINCT (name, created_by)`

#### `public.category_hymn`
Relación N:M entre categorías e himnos.
* `category_id` (`UUID REFERENCES categories(id) ON DELETE CASCADE`)
* `hymn_id` (`UUID REFERENCES hymns(id) ON DELETE CASCADE`)
* **Llave Primaria:** `PRIMARY KEY (category_id, hymn_id)`

#### `public.notes`
Tabla de catálogo fijo para notas y tonalidades musicales.
* `id` (`INT PRIMARY KEY`): Identificador (1=Do, 2=Do#, etc.).
* `name_es` (`VARCHAR(10) NOT NULL`): Nombre en español (ej. `'Do'`).
* `name_en` (`VARCHAR(10) NOT NULL`): Nombre en notación anglosajona (ej. `'C'`).

---

### **B. Espacio Personal del Usuario y Planificación**

#### `public.user_preferences`
Preferencias de configuración por usuario (Relación 1:1 con `auth.users`).
* `user_id` (`UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`): ID del usuario.
* `full_name` (`TEXT`): Nombre completo del usuario.
* `preferred_hymnal_id` (`UUID REFERENCES hymnals(id) ON DELETE SET NULL`): Himnario preferido por defecto.
* `new_hymn_threshold` (`INT DEFAULT 5`): Cantidad de reproducciones para que un himno deje de considerarse "nuevo".

#### `public.contexts`
Contextos de uso de la iglesia (ej. Culto Dominical, Reunión de Jóvenes).
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): ID del contexto.
* `user_id` (`UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`): Dueño del contexto.
* `name` (`TEXT NOT NULL`): Nombre del contexto.
* `new_hymns_category_id` (`UUID REFERENCES categories(id) ON DELETE SET NULL`): Categoría privada de himnos nuevos asociada.
* `created_at` (`TIMESTAMPTZ DEFAULT now()`)

#### `public.programs`
Programas de cultos o servicios agendados por fecha.
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): ID del programa.
* `context_id` (`UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE`): Contexto al que pertenece.
* `date` (`DATE NOT NULL`): Fecha del servicio.
* `name` (`TEXT`): Nombre o descripción opcional.
* `created_at` (`TIMESTAMPTZ DEFAULT now()`)

#### `public.program_hymn`
Himnos incluidos en un programa específico con su orden de ejecución.
* `program_id` (`UUID REFERENCES programs(id) ON DELETE CASCADE`)
* `hymn_id` (`UUID REFERENCES hymns(id) ON DELETE CASCADE`)
* `order_index` (`INT NOT NULL`): Orden relativo en la lista del programa (1, 2, 3...).
* **Llave Primaria:** `PRIMARY KEY (program_id, hymn_id)`

#### `public.user_hymn`
Atributos y ajustes musicales personalizados por usuario e himno (Tonalidad, modulación, energía).
* `user_id` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`)
* `hymn_id` (`UUID REFERENCES hymns(id) ON DELETE CASCADE`)
* `key_id` (`INT REFERENCES notes(id)`): Tonalidad elegida.
* `key_mode` (`VARCHAR(10) DEFAULT 'major' CHECK (key_mode IN ('major', 'minor'))`)
* `highest_note_id` (`INT REFERENCES notes(id)`): Nota más alta alcanzada.
* `highest_octave` (`INT`)
* `lowest_note_id` (`INT REFERENCES notes(id)`): Nota más baja alcanzada.
* `lowest_octave` (`INT`)
* `has_modulation` (`BOOLEAN DEFAULT false`): Indica si requiere cambio de tono.
* `energy` (`INT CHECK (energy BETWEEN 1 AND 5)`): Nivel de energía musical.
* **Llave Primaria:** `PRIMARY KEY (user_id, hymn_id)`

---

## 📊 3. Vistas SQL Dinámicas

### `v_hymn_usage_stats`
Calcula el total de reproducciones e historial de uso de cada himno en fechas pasadas o presentes (`p.date <= CURRENT_DATE`) agrupadas por contexto y usuario.

### `v_active_new_hymns`
Determina qué himnos marcados en la categoría de "Himnos Nuevos" aún no superan el umbral `new_hymn_threshold` configurado por el usuario.

### `v_user_loose_hymns` ("Mis Himnos Sueltos Privados")
Retorna los himnos en estado `private` creados por el usuario actual que **no están vinculados a ningún himnario** (`NOT EXISTS IN hymnal_hymn`).

```sql
CREATE OR REPLACE VIEW public.v_user_loose_hymns AS
SELECT h.*
FROM public.hymns h
WHERE h.type = 'private'
  AND NOT EXISTS (
    SELECT 1 FROM public.hymnal_hymn hh WHERE hh.hymn_id = h.id
  );
```

### `v_public_loose_hymns` ("Himnos Sueltos Públicos")
Retorna los himnos globales públicos que **no pertenecen a ningún himnario público o privado**.

```sql
CREATE OR REPLACE VIEW public.v_public_loose_hymns AS
SELECT h.*
FROM public.hymns h
WHERE h.type = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM public.hymnal_hymn hh WHERE hh.hymn_id = h.id
  );
```

---

## ⚙️ 4. Funciones y Triggers PL/pgSQL

### 1. `handle_new_user()`
* **Evento:** `AFTER INSERT ON auth.users`
* **Descripción:** Crea automáticamente una fila en `user_preferences` cuando un nuevo usuario se registra mediante Supabase Auth.

### 2. `prevent_hymn_public_demotion()`
* **Evento:** `BEFORE UPDATE ON public.hymns`
* **Descripción:** Garantiza la **irrevocabilidad** de la promoción a público. Dispara una excepción si se intenta cambiar el campo `type` de `'public'` a `'private'`.

```sql
CREATE OR REPLACE FUNCTION public.prevent_hymn_public_demotion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type = 'public' AND NEW.type = 'private' THEN
    RAISE EXCEPTION 'A public hymn cannot be demoted back to private.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🛡️ 5. Políticas de Seguridad RLS (Row Level Security)

Todas las tablas principales tienen habilitado **Row Level Security (RLS)**.

| Tabla | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **`hymns`** | `type = 'public'` OR `created_by = auth.uid()` OR `role = 'admin'` | `created_by = auth.uid()` OR `role = 'admin'` | `(created_by = auth.uid() AND type = 'private')` OR `role = 'admin'` | `(created_by = auth.uid() AND type = 'private')` OR `role = 'admin'` |
| **`hymnals`** | `type = 'public'` OR `created_by = auth.uid()` OR `role = 'admin'` | `created_by = auth.uid()` OR `role = 'admin'` | `created_by = auth.uid()` OR `role = 'admin'` | `created_by = auth.uid()` OR `role = 'admin'` |
| **`categories`**| `created_by IS NULL` OR `created_by = auth.uid()` OR `role = 'admin'` | `created_by = auth.uid()` OR `role = 'admin'` | `created_by = auth.uid()` OR `role = 'admin'` | `created_by = auth.uid()` OR `role = 'admin'` |
| **`contexts`** | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| **`programs`** | Vía `context_id` del usuario | Vía `context_id` del usuario | Vía `context_id` del usuario | Vía `context_id` del usuario |
| **`user_hymn`**| `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
