# AGENTS.md

## Stack (sin framework)
SPA de **Vanilla JS (ESModules) + Vite + Supabase** (Postgres / RLS / Vistas SQL). **No hay framework de frontend, ni tests, ni linter ni typechecker.** Toda la interfaz se renderiza con `innerHTML` y listeners re-enganchados por ruta.

- Idioma del proyecto: **español** (textos de UI, mensajes de error, comentarios). Mantenerlo.

## Comandos
- `npm run dev` — servidor de desarrollo (Vite, `--host`)
- `npm run build` — única verificación real disponible (no hay tests/lint). CI también ejecuta esto.
- `node scripts/validate_csv.js <archivo.csv>` — utilidad manual para validar CSV de himnarios. Hay otras en `scripts/` (check_missing_hymns.js, check_unlinked_hymns.js).

## Requisitos de entorno
- Copiar `.env.example` → `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Si faltan, `src/config/supabase.js` crea el cliente con strings vacíos y las consultas fallan en runtime.
- **Node**: Vite 8 (en package.json) exige Node `^20.19.0 || >=22.12.0`. En CI (`.github/workflows/deploy.yml`) se usa Node 20. Los secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` van como variables de entorno del job de build.
- Despliegue: push a `main` → GitHub Actions → GitHub Pages. `vite.config.js` usa `base: './'` (rutas relativas, obligatorio para Pages + hash routing).

## Arquitectura (src/)
- `config/supabase.js` — cliente Supabase único (anon key público; la seguridad es 100% RLS).
- `services/*.service.js` — capa de datos. Patrón: `export const xService = { async metodo() {...} }`, cada consulta con `if (error) throw error;`. Nunca llamar a `supabase.*` fuera de services (ideal).
- `views/*.view.js` — cada vista exporta `renderXView()` (retorna string HTML) y `setupXEvents()` (engancha listeners). El cableado está en `src/main.js` (`AppRouter`).
- `components/*.js` — navbar, sidebar, modal, builders.
- `utils/*.utils.js` — parseo CSV (`csv.utils.js`), normalización/fuzzy matching (`text.utils.js`, `computeHymnMatchScore`), importación de atributos (`user_hymn_csv.utils.js`).

## Routing y flujo
- Hash router en `src/main.js`: `#/dashboard`, `#/hymns`, `#/hymnals`, `#/contexts`, `#/planner`, `#/admin`, `#/login`, `#/signup`. Ruta por defecto/fallback → dashboard.
- Sin login → redirige a `#/login`. `#/admin` requiere `currentUser.app_metadata?.role === 'admin'`.
- Las vistas se re-renderizan completas en cada cambio de hash (sin DOM virtual): al añadir una vista nueva, registrar `render`+`setup` en el switch de `main.js`.

## Supabase / base de datos (gotchas)
- Migraciones en `supabase/migrations/` **idempotentes** (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE VIEW`, `DROP POLICY IF EXISTS`). Nombrar nuevas como `YYYYMMDD_descripcion.sql`. Complementan a `documentacion_base_de_datos.md` e `idea de base de datos.md`.
- **RLS es el límite de seguridad**: el anon key es público. Cualquier tabla/vista nueva necesita `ENABLE ROW LEVEL SECURITY` + políticas, o las consultas dan error/perfilan datos. Los `GRANT SELECT ... TO authenticated, anon` deben acompañar a las vistas.
- Rol administrador en SQL: `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'` (coincide con el check en JS).
- Vistas dinámicas que la UI consulta: `v_hymn_usage_stats`, `v_active_new_hymns`, `v_user_loose_hymns`, `v_public_loose_hymns`.
- `user_preferences` se crea automáticamente vía trigger en inserción de `auth.users` (no insertarlo manualmente).
- Regla de negocio clave: un himno `public` no puede degradarse a `private` (trigger `prevent_hymn_public_demotion`).

## Convenciones de código
- Imports ESModules siempre con extensión `.js` explícita en rutas relativas (`./services/auth.service.js`).
- Mensajes de error y logs en español.
- Fechas/orden de protocolos: en `planner.view.js` el orden de himnos se recalcula por fecha; al tocar planificación, respetar `order_index` y la lógica dinámica de repetición por contexto.