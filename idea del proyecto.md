# 🎯 Visión General del Proyecto

El proyecto **Hymn List Manager** es una aplicación web SPA (Single Page Application) para la **gestión e inteligencia musical en iglesias**, alojada en **GitHub Pages** y respaldada por **Supabase** como Backend-as-a-Service (PostgreSQL, Auth, RLS).

La aplicación combina una **base de datos global estandarizada** administrada por el sistema con un **espacio personal aislado por usuario**, permitiendo que cada director musical o iglesia trabaje con su propio repertorio, tonalidades, orden de programa y métricas de uso.

---

# 🧱 1. Base de Datos Global (Administrada por el sistema)

La base global contiene la información compartida y estandarizada:

### **Hymns (Himnos)**
- `id`: UUID (PK)
- `title_es`: Título en español
- `title_original`: Título en idioma original
- `composer`: Compositor / Autor
- `type`: `public` | `private`
- `created_by`: UUID (FK a `users.id`)

### **Hymnals (Himnarios)**
Los himnarios funcionan como **mapeadores de números a himnos únicos globales**.
- `id`: UUID (PK)
- `name`: Nombre del himnario
- `type`: `private` | `pending` | `rejected` | `public`
- `rejection_reason`: Retroalimentación del administrador si fue rechazado
- `created_by`: UUID (FK a `users.id`)
- `language_id`: FK a `languages.id`
- `date_created`: TIMESTAMPTZ

**Regla de publicación:**  
Cuando un himnario es enviado a `pending`, el administrador revisa que los números enlacen a los himnos globales existentes (o crea los faltantes). Al pasar a `public`, el himnario queda disponible para todos los usuarios.

### **Languages (Idiomas)**
- `id`: UUID (PK)
- `name`: Nombre del idioma
- `abbreviation`: Código (ej. ES, EN)

### **Categories (Categorías)**
- `id`: UUID (PK)
- `name`: Nombre de la categoría
- `created_by`: UUID (Nullable. Si es `NULL` es global, si contiene `user_id` es privada del usuario)
- **Regla de unicidad:** `UNIQUE(name, created_by)`

---

# 👤 2. Espacio Personal del Usuario

Cada usuario maneja su propio entorno aislado mediante **Supabase RLS (Row Level Security)**:

### **Contexts (Contextos de uso)**
Representan las reuniones o tipos de servicio (ej. Culto Dominical, Jóvenes, Escuela Dominical).
- `id`: UUID (PK)
- `user_id`: UUID (FK a `users.id`)
- `name`: Nombre del contexto
- `new_hymns_category_id`: FK a `categories.id` (Categoría privada creada automáticamente)
- **Regla de borrado:** `ON DELETE CASCADE` elimina programas y registros vinculados.

### **User Preferences (1:1)**
- `user_id`: UUID (PK)
- `new_hymn_threshold`: Umbral de ejecuciones (ej. 5) para determinar si un himno deja de considerarse "nuevo".

### **User_Hymn (Atributos Musicales Personalizados)**
Atributos específicos por iglesia/director (tonalidad, rango vocal, energía, modulación):
- `user_id`: FK a `users.id`
- `hymn_id`: FK a `hymns.id`
- `key_id`, `highest_note_id`, `lowest_note_id`: FK a `notes.id`
- `highest_octave`, `lowest_octave`: INT
- `has_modulation`: BOOLEAN
- `energy`: INT (1 a 5)

### **Programs & Program_Hymn (Programas Musicales)**
Planificación de canciones por fecha y contexto:
- `programs`: `id`, `context_id`, `date`, `name`
- `program_hymn`: `program_id`, `hymn_id`, `order_index`

---

# 📊 3. Cálculo Dinámico mediante Vistas SQL (Sin Backend Server)

Para mantener la aplicación rápida y sin conflictos de sincronización:
1. **Recurrencia e Historial (`v_hymn_recurrence`):** Los registros de uso se procesan en tiempo real agrupando por fecha de programa transcurrida (`date <= CURRENT_DATE`).
2. **Himnos Nuevos Dinámicos (`v_new_hymns`):** Un himno en la categoría de "Himnos Nuevos" de un contexto deja de mostrarse dinámicamente en la vista en cuanto sus reproducciones igualan o superan `user_preferences.new_hymn_threshold`. No requiere alterar físicamente la base de datos.

---

# 🛣️ 4. Arquitectura y Despliegue Frontend

- **Hosting:** GitHub Pages.
- **Enrutamiento:** Hash Routing (`/#/dashboard`, `/#/planner`, `/#/hymnals`) para evitar errores 404 de servidor estático.
- **Cliente Supabase:** Consultas seguras directas mediante `VITE_SUPABASE_ANON_KEY` protegidas 100% por **RLS**.