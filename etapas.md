# 🗺️ Plan de Desarrollo por Etapas (Hymn List Manager)

Arquitectura: **Vite + Vanilla JS + Supabase (PostgreSQL / RLS / Views) + GitHub Pages (Hash Routing)**.

---

## 🚀 FASE 0 — Entorno y Estructura Base (EN PROGRESO)
- Inicializar repositorio Git.
- Configurar proyecto Vite + HTML/CSS/JS.
- Estructura de carpetas limpia (Clean Architecture / Modulada).
- Configuración de Router por Hash para GitHub Pages.

---

## 🧱 FASE 1 — Base de Datos y Supabase DDL
- Ejecutar script SQL de creación de tablas en Supabase.
- Crear Vistas SQL (`v_hymn_usage_stats`, `v_active_new_hymns`).
- Configurar políticas RLS para aislamiento por `auth.uid()`.
- Crear Triggers para auto-creación de `user_preferences` al registrarse.

---

## 🎨 FASE 2 — UI/UX y Sistema de Diseño (CSS Vanilla)
- Sistema de diseño limpio, temas oscuros y responsivo.
- Layout principal: Sidebar, Navbar y Contenedor SPA.
- Componentes reutilizables: Modales, Tarjetas de Himno, Filtros, Tablas.

---

## 🔑 FASE 3 — Autenticación y Perfil
- Integrar Supabase Auth (Email + Password).
- Pantalla de Login / Registro.
- Protección de Rutas en la SPA.
- Gestión de Preferencias (`new_hymn_threshold`).

---

## 📚 FASE 4 — Biblioteca de Himnos y Categorías
- Buscador y filtrado rápido de himnos globales.
- Crear y asignar categorías privadas por usuario.
- Gestión de atributos musicales personalizados (`user_hymn`: tonalidad, energía, rango vocal).

---

## 📘 FASE 5 — Himnarios, Carga CSV y Asistente de Enlace (COMPLETADO)
- Crear y editar himnarios personales con menú táctil flotante (`⋮`).
- Importación masiva desde archivos CSV con soporte RFC 4180, detección inteligente de encabezados e inserción en lote.
- **Asistente de Enlace Inteligente (Smart Linker):** Algoritmo de similitud difusa (Fuzzy Matching) por Título, Compositor y 1ª Línea con mapeo 1-clic al Catálogo Público.
- Mapeo de números a himnos globales (`hymnal_hymn`).
- Enviar himnario a revisión (`pending`).
- Panel de Administración para Aprobación (`public`) o Rechazo (`rejected` + `rejection_reason`).


---

## 📅 FASE 6 — Contextos y Planificador de Programas
- Crear y gestionar Contextos (Ej. Culto Dominical, Jóvenes).
- Creación automática de la categoría "Himnos Nuevos" por contexto.
- Creador de Programas por fecha con reordenamiento de canciones (Drag & Drop / Reorder).

---

## 📊 FASE 7 — Inteligencia y Asistente de Planificación
- Integración con las Vistas SQL de recurrencia.
- Detección de himnos olvidados / sin cantar recientemente.
- Alertas de repetición de canciones en fechas cercanas.
- Identificación dinámica de Himnos Nuevos activos.

---

## 🚀 FASE 8 — Despliegue y Optimización
- Optimización de assets y variables de entorno Vite.
- Despliegue en GitHub Pages.
- Pruebas finales de RLS y UX.

---

## 📌 PENDIENTES / BACKLOG FUTURO
- **Sistema de Sugerencias de Usuarios para Himnos Públicos:** Mecanismo/tabla de sugerencias para que usuarios regulares puedan reportar correcciones o mejoras en metadatos de himnos públicos a los administradores para su aprobación.