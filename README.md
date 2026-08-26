# 🎵 Hymnist Manager v2 (Hymn List Manager)

**Hymnist Manager** es una aplicación web moderna (SPA) diseñada para la planificación, organización y gestión inteligente de repertorios musicales, himnarios y programas de alabanza en congregaciones e iglesias.

Construida con **Vite + Vanilla JS + Supabase (PostgreSQL / RLS / Views) + GitHub Actions (GitHub Pages)**.

---

## ✨ Características Principales

### 📚 1. Biblioteca de Himnos y Atributos Musicales
- **Catálogo Global y Himnos Privados:** Explora himnos públicos o gestiona tus propios himnos sueltos.
- **Atributos Musicales Personalizados (`user_hymn`):** Asigna tonalidad (ej. *Sol Mayor*, *Re menor*), nivel de energía (1-5), notas y octavas más altas/bajas, y presencia de modulación.
- **🪄 Asistente In-App Paso a Paso:** Configura atributos musicales recorriendo himno por himno de forma secuencial con botones de *Guardar*, *Omitir* o *Regresar*.
- **📤 Importador y Validador CSV:** Carga masiva de tonalidades desde Excel con validación en tiempo real de notas (*Do, Re, Sol#, C, Eb*), octavas y energía.
- **⚙️ Gestor de Tonalidades:** Administra y elimina configuraciones musicales personalizadas sin afectar el catálogo general.

### 📖 2. Himnarios, Carga CSV y Smart Linker
- **Editor Consecutivo y Constructor Rápido:** Crea o edita himnarios numerados fácilmente.
- **Importación Masiva de Himnarios:** Soporte RFC 4180 con autodetección de encabezados (Título, Número, Compositor, 1ª Línea).
- **Asistente de Enlace Inteligente (Smart Linker):** Algoritmo difuso (Fuzzy Matching) que mapea automáticamente canciones del himnario con el catálogo global.
- **Flujo de Aprobación Administrador:** Envía himnarios a revisión (`pending`) para ser publicados globalmente (`public`) o rechazados con motivo (`rejected`).

### 📅 3. Contextos y Planificador de Programas
- **Organización por Contextos:** Planifica programas para distintos grupos (ej. *Culto Dominical*, *Reunión de Jóvenes*, *Células*).
- **🔀 Reordenamiento Interactivo:** Ajusta el orden de canciones en tiempo real con controles subir `▲` y bajar `▼`.
- **📲 Exportación Flexible:** Genera fichas de programa para copiar directamente a WhatsApp/Telegram (con títulos, números de himnario preferido y tonos) o descarga archivos CSV para Excel.

### 💡 4. Inteligencia y Asistente de Planificación
- **💡 Himnos Olvidados:** Recomienda automáticamente canciones que llevan más tiempo sin cantarse en un contexto específico (o nunca se han cantado).
- **🌟 Seguimiento de Himnos Nuevos:** Conexión con la vista SQL `v_active_new_hymns` para controlar las reproducciones faltantes antes de graduar una canción nueva según el umbral del usuario (`new_hymn_threshold`).
- **⚠️ Alertas de Repetición Preventiva:** Notifica al seleccionar un himno que ya fue cantado recientemente (últimas 4 semanas) en ese mismo contexto.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** HTML5, Vanilla JavaScript (ES Modules), Vanilla CSS (Design Tokens, Temas Oscuros, Glassmorphism).
- **Ruteo:** SPA Hash Router (`#/hymns`, `#/hymnals`, `#/planner`, etc.).
- **Backend & Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Vistas Dinámicas, Supabase Auth).
- **Build Tool:** Vite 5.
- **CI/CD:** GitHub Actions (`.github/workflows/deploy.yml`) para despliegue automatizado en GitHub Pages.

---

## 🚀 Configuración y Desarrollo Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/Aer98e/HymnistManager-v2.git
cd HymnistManager-v2
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:
```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### 4. Iniciar servidor de desarrollo
```bash
npm run dev
```

### 5. Compilar para producción
```bash
npm run build
```

---

## 🗄️ Estructura del Proyecto

```
Hymn-List-Manager/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD para GitHub Pages
├── src/
│   ├── assets/                 # Estilos CSS globales y variables
│   ├── components/             # Componentes de UI (Navbar, Sidebar, Modales, Builder)
│   ├── config/                 # Cliente Supabase
│   ├── services/               # Capa de servicios (hymns, hymnals, programs, auth)
│   ├── utils/                  # Normalización de texto, calculador difuso y CSV parser
│   ├── views/                  # Vistas principales (Dashboard, Hymns, Hymnals, Planner, Contexts, Admin)
│   └── main.js                 # Punto de entrada y Router SPA
├── supabase/
│   └── migrations/             # Scripts DDL de base de datos, Vistas y Reglas RLS
├── index.html                  # HTML base
├── package.json
└── vite.config.js              # Configuración Vite con base relativa './'
```

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
