# Estrategia Inicial de Pruebas de Software — BIODENTIS

## 1. Objetivo

Establecer una estrategia inicial de pruebas de software para el proyecto BIODENTIS que permita validar la calidad del sistema desde sus unidades más pequeñas hasta flujos completos de usuario, garantizando que las funcionalidades críticas operen correctamente antes de su puesta en producción.

No se pretende cubrir la totalidad del sistema desde el inicio, sino definir una base sólida y progresiva sobre la cual escalar la cobertura de pruebas según las necesidades del proyecto.

---

## 2. Alcance de las Pruebas

### 2.1. Áreas incluidas

| Área | Descripción |
|------|-------------|
| Backend (API) | Endpoints REST, lógica de negocio, validaciones, autenticación, autorización |
| Frontend (UI) | Componentes React, páginas, formularios, navegación, accesibilidad |
| Base de datos | Operaciones CRUD, integridad referencial, esquema Prisma |
| Seguridad | Tokens JWT, control de acceso, rate limiting, headers de seguridad |
| Rendimiento | Comportamiento bajo carga, métricas de infraestructura |

### 2.2. Áreas excluidas inicialmente

- Pruebas de regresión automatizadas completas del frontend
- Pruebas de compatibilidad entre navegadores
- Pruebas de despliegue (CI/CD)
- Pruebas de seguridad ofensivas (penetration testing)
- Pruebas de disaster recovery

---

## 3. Tipos de Pruebas

### 3.1. Pruebas Unitarias

#### 3.1.1. Qué se validará

| Componente | Ubicación | Qué se prueba |
|------------|-----------|---------------|
| Validadores Zod | `packages/shared-validators/src/schemas.ts` | Schemas de validación para cada entidad (User, Appointment, ClinicalRecord, etc.) |
| Reglas de negocio | `packages/shared-validators/src/rules.ts` | `canCancelOrReschedule()`, `isValidTimeRange()`, `isValidTransition()`, regla 24h |
| Enums | `packages/shared-validators/src/enums.ts` | Valores válidos de AppointmentStatus, Role, DentalUnitType, etc. |
| Utilidades | `packages/ui/src/lib/utils.ts` | `cn()`, `formatDate()`, `formatTime()`, `formatDateTime()` |
| Clases de error | `apps/web/lib/errors.ts` | Instanciación y códigos HTTP de AuthenticationError, AuthorizationError, NotFoundError, ValidationError, DomainError, ScheduleConflictError, InfrastructureError |
| Rate limiter | `apps/web/lib/rate-limit.ts` | Control de intentos, expiración de ventanas |
| Login attempts | `apps/web/lib/login-attempts.ts` | Bloqueo de cuenta tras intentos fallidos, reseteo por tiempo |
| Middleware auth | `apps/web/lib/middleware.ts` | `authenticate()`, `requireRole()` con mocks de JWT y base de datos |

#### 3.1.2. Casos a considerar

**Validadores Zod:**
- Campos obligatorios faltantes → debe rechazar
- Tipos de datos incorrectos → debe rechazar
- Strings vacíos vs nulos vs undefined
- Límites de longitud (mínimo/máximo)
- Formatos de email, teléfono, RUT
- Enums con valores válidos e inválidos
- Fechas con formatos correctos e incorrectos
- Valores numéricos fuera de rango

**Reglas de negocio:**
- Cita dentro de las 24h → no se puede cancelar/reprogramar
- Cita con más de 24h → se puede cancelar/reprogramar
- Transiciones de estado válidas: PENDING→CONFIRMED, CONFIRMED→COMPLETED, etc.
- Transiciones de estado inválidas: PENDING→COMPLETED, COMPLETED→PENDING, etc.
- Rango de tiempo inválido (inicio ≥ fin)
- Rangos de tiempo que se superponen

**Clases de error:**
- Cada clase genera el código HTTP correcto
- Mensaje de error descriptivo
- Serialización a JSON correcta

#### 3.1.3. Criterios básicos de aprobación

- Todas las pruebas unitarias pasan sin errores
- Cobertura mínima del 80% en módulos de reglas de negocio y validadores
- Cobertura mínima del 70% en utilidades y helpers
- No existen pruebas pendientes (no skipped tests)
- No existen pruebas que dependan de estado externo (base de datos, red)

#### 3.1.4. Evidencias a obtener

- Reporte de cobertura de código (HTML o texto)
- Resultado de ejecución de todas las pruebas (pass/fail)
- Listado de pruebas creadas por módulo
- Archivos de prueba: `*.test.ts` o `*.spec.ts`

---

### 3.2. Pruebas Funcionales

#### 3.2.1. Endpoints a validar

| Método | Ruta | Descripción | Autenticación requerida |
|--------|------|-------------|------------------------|
| POST | `/api/auth/login` | Inicio de sesión | Pública (rate limit) |
| POST | `/api/auth/register` | Registro de paciente | Pública |
| POST | `/api/auth/logout` | Cierre de sesión | Cookie-based |
| POST | `/api/auth/refresh` | Renovación de token | Cookie-based |
| GET | `/api/appointments` | Listar citas | PATIENT, DENTIST, ADMIN |
| POST | `/api/appointments` | Crear cita | PATIENT, RECEPTIONIST, ADMIN |
| PATCH | `/api/appointments/[id]/confirm` | Confirmar cita | RECEPTIONIST, ADMIN |
| PATCH | `/api/appointments/[id]/cancel` | Cancelar cita | PATIENT, RECEPTIONIST |
| PATCH | `/api/appointments/[id]/reschedule` | Reprogramar cita | PATIENT, RECEPTIONIST |
| PATCH | `/api/appointments/[id]/status` | Actualizar estado | DENTIST |
| GET | `/api/clinical-records/[patientId]` | Historial clínico | PATIENT, DENTIST, ADMIN |
| POST | `/api/clinical-records/[patientId]` | Crear registro | DENTIST, ADMIN |
| GET | `/api/clinic` | Datos clínica | Pública |
| PATCH | `/api/clinic` | Actualizar clínica | ADMIN |
| GET | `/api/config` | Configuración general | ADMIN |
| PATCH | `/api/config` | Actualizar config | ADMIN |
| PUT | `/api/config/settings` | Guardar settings | ADMIN |
| GET | `/api/config/security` | Política seg. | ADMIN |
| PUT | `/api/config/security` | Actualizar seg. | ADMIN |
| GET | `/api/config/jwt` | Config JWT | ADMIN |
| PUT | `/api/config/jwt` | Actualizar JWT | ADMIN |
| GET | `/api/config/notifications` | Config notif. | ADMIN |
| PUT | `/api/config/notifications` | Actualizar notif. | ADMIN |
| GET | `/api/config/dental-units` | Listar unidades | ADMIN |
| POST | `/api/config/dental-units` | Crear unidad | ADMIN |
| PATCH | `/api/config/dental-units/[id]` | Actualizar unidad | ADMIN |
| DELETE | `/api/config/dental-units/[id]` | Eliminar unidad | ADMIN |
| GET | `/api/config/email-templates` | Listar plantillas | ADMIN |
| POST | `/api/config/email-templates` | Crear plantilla | ADMIN |
| PATCH | `/api/config/email-templates/[id]` | Actualizar plantilla | ADMIN |
| DELETE | `/api/config/email-templates/[id]` | Eliminar plantilla | ADMIN |
| PATCH | `/api/config/email-templates/[id]/toggle` | Activar/desactivar | ADMIN |
| GET | `/api/dentists` | Listar dentistas | Autenticado |
| GET | `/api/dentists/[id]/availability` | Disponibilidad | Autenticado |
| POST | `/api/dentists/[id]/availability` | Agregar horario | DENTIST, ADMIN |
| DELETE | `/api/dentists/[id]/availability` | Eliminar horario | DENTIST, ADMIN |
| GET | `/api/reports/appointments` | Reporte citas | ADMIN, RECEPTIONIST |
| GET | `/api/users` | Listar usuarios | ADMIN |
| POST | `/api/users` | Crear usuario | ADMIN |
| GET | `/api/users/me` | Perfil propio | Autenticado |
| PATCH | `/api/users/me` | Editar perfil | Autenticado |
| PATCH | `/api/users/[id]` | Editar usuario | ADMIN |
| DELETE | `/api/users/[id]` | Eliminar usuario | ADMIN |

#### 3.2.2. Operaciones CRUD a validar

Cada operación CRUD debe probarse con:

| Escenario | Descripción |
|-----------|-------------|
| Creación exitosa | Datos válidos, retorna 201 con el objeto creado |
| Creación con datos inválidos | Campos faltantes, formatos incorrectos → retorna 400 |
| Creación duplicada | Entidad unique conflict → retorna 409 |
| Lectura exitosa | GET por ID y listado → retorna 200 |
| Lectura inexistente | ID que no existe → retorna 404 |
| Actualización exitosa | PATCH con datos válidos → retorna 200 |
| Actualización parcial | Solo algunos campos → solo esos campos se modifican |
| Eliminación exitosa | DELETE → retorna 200/204 |
| Eliminación con dependencias | Entidad con registros asociados → verificar comportamiento |

#### 3.2.3. Validaciones a evaluar

- Validación de entrada con Zod schemas (18 schemas en shared-validators)
- Validación de formato de email, RUT, teléfono
- Validación de enums (Role, AppointmentStatus, DentalUnitType, etc.)
- Validación de fechas y horarios
- Validación de長ness de strings
- Validación de campos numéricos (rangos permitidos)
- Mensajes de error descriptivos y consistentes

#### 3.2.4. Autenticación y autorización

| Prueba | Descripción | Resultado esperado |
|--------|-------------|-------------------|
| Login con credenciales correctas | Email + password válidos | 200 + access token + refresh token cookie |
| Login con credenciales incorrectas | Password incorrecto | 401 |
| Login con email inexistente | Email no registrado | 401 |
| Rate limiting login | 6 intentos fallidos en 15 min | 429 |
| Bloqueo de cuenta | 5 intentos fallidos | Cuenta bloqueada 15 min |
| Token expirado | Access token con >15 min | 401 |
| Refresh token válido | Cookie con refresh token activo | Nuevo access token |
| Refresh token revocado | Cookie con refresh token usado | 401 + revocación de todos |
| Acceso sin token | Request sin Authorization header | 401 |
| Acceso con rol incorrecto | Paciente intenta acceder a /api/users | 403 |
| Registro siempre PATIENT | POST /api/register con role=admin | Crea PATIENT (ignora role) |
| Permisos por rol | Cada endpoint con sus roles permitidos | Solo roles autorizados pasan |

#### 3.2.5. Manejo de errores

- Errores de validación → 400 con detalles
- Entidad no encontrada → 404 con mensaje
- Conflicto de horario → 409 con descripción
- Error de infraestructura → 500 genérico (sin exponer detalles internos)
- Error de dominio → 400 con mensaje descriptivo
- Headers de seguridad presentes en todas las respuestas

#### 3.2.6. Flujos funcionales principales

1. **Flujo de autenticación completo:** Registro → Login → Acceso a recurso → Refresh → Logout
2. **Flujo de citas:** Crear cita → Confirmar → Completar → Verificar estado final
3. **Flujo de cancelación:** Crear cita → Cancelar (con regla 24h) → Verificar estado
4. **Flujo de historial clínico:** Dentista crea registro → Paciente consulta → Admin consulta → Receptionist intenta (bloqueado)
5. **Flujo de configuración:** Admin actualiza clínica → Admin crea unidad dental → Admin crea plantilla email
6. **Flujo de usuarios:** Admin crea dentista → Admin asigna disponibilidad → Paciente agenda cita con ese dentista

#### 3.2.7. Integración entre componentes

- Prisma ↔ API routes (consultas correctas, transacciones)
- API routes ↔ Middleware (autenticación, autorización, CORS)
- API routes ↔ Servicios (lógica de negocio aplicada correctamente)
- Servicios ↔ Repositorios (acceso a datos correcto)
- Validadores Zod ↔ API routes (rechazo de datos inválidos antes de llegar al servicio)
- React Query ↔ API routes (fetching, caching, invalidación)

---

### 3.3. Pruebas de Aceptación

#### 3.3.1. Casos de uso principales

| # | Caso de uso | Rol | Descripción |
|---|------------|-----|-------------|
| CU-01 | Registro de paciente | Público | Un usuario nuevo se registra como paciente con datos válidos |
| CU-02 | Inicio de sesión | Todos | Un usuario ingresa credenciales correctas y accede al sistema |
| CU-03 | Crear cita | PATIENT, RECEPTIONIST, ADMIN | Se agenda una cita verificando disponibilidad del dentista |
| CU-04 | Confirmar cita | RECEPTIONIST, ADMIN | Se confirma una cita pendiente |
| CU-05 | Cancelar cita (con 24h) | PATIENT, RECEPTIONIST | Se cancela una cita con más de 24h de anticipación |
| CU-06 | Cancelar cita (sin 24h) | PATIENT | Se intenta cancelar una cita a menos de 24h → debe rechazar |
| CU-07 | Reprogramar cita | PATIENT, RECEPTIONIST | Se cambia fecha/hora de una cita existente |
| CU-08 | Completar cita | DENTIST | El dentista marca una cita como completada |
| CU-09 | Crear historial clínico | DENTIST, ADMIN | Se crea un registro clínico asociado a una cita |
| CU-10 | Consultar historial propio | PATIENT | El paciente ve solo sus propios registros |
| CU-11 | Consultar historial como dentista | DENTIST | El dentista ve registros de pacientes con citas propias |
| CU-12 | Gestión de usuarios | ADMIN | Admin crea, edita y desactiva usuarios |
| CU-13 | Configurar clínica | ADMIN | Admin actualiza datos de la clínica |
| CU-14 | Gestionar unidades dentales | ADMIN | Admin crea, edita y elimina unidades dentales |
| CU-15 | Gestionar plantillas email | ADMIN | Admin crea, edita y activa/desactiva plantillas |
| CU-16 | Ver reporte de citas | ADMIN, RECEPTIONIST | Se consulta el reporte de citas con filtros |
| CU-17 | Caducidad de token | Todos | Access token expira tras 15 min → refresco automático |
| CU-18 | Rotación de refresh token | Todos | Cada refresh genera nuevo token y revoca el anterior |

#### 3.3.2. Flujos completos a validar

**Flujo 1 — Registro y primera cita:**
1. Usuario accede a `/register`
2. Completa formulario (nombre, email, password, teléfono)
3. Se registra como PATIENT
4. Inicia sesión
5. Navega a `/appointments`
6. Selecciona dentista, fecha y hora disponibles
7. Crea la cita
8. Verifica que la cita aparece con estado PENDING
9. Verifica que el dentista puede ver la cita en su agenda

**Flujo 2 — Gestión de cita por recepcionista:**
1. Recepcionista inicia sesión
2. Navega a `/appointments`
3. Filtra citas pendientes
4. Confirma una cita → estado cambia a CONFIRMED
5. Cancela otra cita → estado cambia a CANCELLED

**Flujo 3 — Flujo completo de atención:**
1. Paciente crea cita (PENDING)
2. Recepcionista confirma (CONFIRMED)
3. Dentista atiende y crea registro clínico
4. Dentista marca como completada (COMPLETED)
5. Paciente consulta su historial clínico y ve el registro

**Flujo 4 — Control de acceso:**
1. Paciente intenta acceder a `/users` → redirigido o bloqueado
2. Dentista intenta eliminar un usuario → 403
3. Receptionist intenta crear registro clínico → 403
4. Admin accede a configuración → permitted

#### 3.3.3. Resultados esperados

Cada caso de uso debe documentar:
- **Precondiciones:** Estado del sistema antes de ejecutar
- **Pasos:** Secuencia exacta de acciones
- **Resultado esperado:** Comportamiento esperado del sistema
- **Datos de prueba:** Inputs específicos utilizados

#### 3.3.4. Criterios de aprobación y rechazo

| Criterio | Aprobación | Rechazo |
|----------|------------|---------|
| Casos de uso ejecutados | 100% de los casos principales pasan | Algún caso principal falla |
| Flujos completos | Todos los flujos llegan al estado final esperado | Algún flujo se interrumpe o muestra estado incorrecto |
| Resultados | Todos los resultados coinciden con lo esperado | Diferencias entre resultado real y esperado |
| Errores | No se encontraron errores durante la ejecución | Se encontraron errores que impiden el flujo |
| Rendimiento perceptible | Tiempos de carga aceptables (<3s) | Lentitud perceptible que afecta la experiencia |

---

### 3.4. Pruebas de Accesibilidad

#### 3.4.1. Herramienta: WAVE

WAVE (Web Accessibility Evaluation Tool) se utilizará como herramienta principal de evaluación de accesibilidad. Se empleará la extensión de navegador para análisis de páginas en entorno de desarrollo.

#### 3.4.2. Aspectos a evaluar

| Aspecto | Qué se busca | Criterio |
|---------|-------------|----------|
| **Contraste de colores** | Texto legible contra fondo | Ratio mínimo 4.5:1 (texto normal), 3:1 (texto grande) |
| **Textos alternativos** | Imágenes con `alt` descriptivo | Todas las imágenes informativas tienen alt; decorativas tienen alt vacío |
| **Etiquetas de formularios** | Inputs asociados a labels | Cada input tiene `<label>` o `aria-label` asociado |
| **Estructura semántica** | Uso correcto de heading hierarchy | H1 → H2 → H3 sin saltos; landmarks definidos |
| **Navegación por teclado** | Todos los elementos interactivos accesibles | Tab order lógico, focus visible, sin traps de focus |
| **ARIA roles y atributos** | Roles correctos en componentes custom | Roles ARIA válidos, estados actualizados |
| **Iconos decorativos** | Iconos sin contenido significativo | `aria-hidden="true"` en iconos decorativos |
| **Mensajes de error** | Errores accesibles para lectores de pantalla | `aria-describedby`, `aria-invalid` en campos con error |
| **Tablas** | Tablas con encabezados correctos | `<th>`, `scope`, `caption` cuando aplica |
| **Enlaces descriptivos** | Texto de enlace claro | No "haz clic aquí"; sí "ver detalle de cita" |

#### 3.4.3. Problemas frecuentes a buscar en BIODENTIS

Dado que el proyecto utiliza **react-aria-components** (componentes accesibles por defecto), se esperan menos problemas estructurales. Sin embargo, se debe verificar:

- **Páginas de dashboard** (`/appointments`, `/patients`, `/users`): Tablas con datos dinámicos, paginación, modales
- **Formularios** (`/register`, `/config`): Labels, validación, mensajes de error
- **Sidebar y navegación**: Menú responsive, colapso, roles
- **Modales/Dialogs**: Focus trap, cierre con Escape, aria-labelledby
- **Botones de acción**: Estados disabled, loading, labels descriptivos
- **Selectores**: Opciones accesibles, grupos, valores seleccionados

#### 3.4.4. Cómo registrar hallazgos

Cada hallazgo se documenta con:

| Campo | Descripción |
|-------|-------------|
| ID | Identificador único del hallazgo (ACC-001, ACC-002, ...) |
| Página | Ruta donde se encontró el problema |
| Componente | Componente o elemento afectado |
| Severidad | Error / Alerta / Notificación / Completado |
| Criterio WCAG | Criterio de éxito incumplido (ej: 1.1.1, 1.4.3, 2.4.6) |
| Descripción | Descripción del problema encontrado |
| Evidencia | Captura de pantalla del reporte WAVE |
| Corrección propuesta | Cómo se debe corregir |
| Estado | Pendiente / En progreso / Corregido / Verificado |

#### 3.4.5. Verificación post-corrección

1. Aplicar la corrección en el código
2. Ejecutar WAVE nuevamente en la misma página
3. Comparar resultados antes/después
4. Verificar que el hallazgo marcado como "Corregido" ya no aparece
5. Verificar que la corrección no generó nuevos problemas
6. Actualizar el estado a "Verificado"
7. Documentar la comparación en las evidencias

---

### 3.5. Pruebas de Rendimiento

#### 3.5.1. Arquitectura de la prueba

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  JMeter  │────▶│  Sistema  │────▶│Prometheus│
│          │     │ (Next.js) │     │          │
└──────────┘     └──────────┘     └────┬─────┘
                                       │
                                 ┌─────▼─────┐
                                 │  Grafana   │
                                 │(Dashboard) │
                                 └───────────┘
```

**Flujo:**
1. **JMeter** genera carga y envía solicitudes al sistema
2. El **sistema** (Next.js API routes) procesa las solicitudes
3. **Prometheus** recopila métricas del sistema (métricas HTTP, uso de recursos, tiempos de respuesta)
4. **Grafana** visualiza las métricas en dashboards configurados

#### 3.5.2. Roles de cada herramienta

| Herramienta | Rol | Función específica |
|-------------|-----|-------------------|
| **JMeter** | Generador de carga | Envía solicitudes HTTP concurrentes al sistema, simula usuarios reales, mide tiempo de respuesta del lado del cliente |
| **Prometheus** | Recopilador de métricas | Almacena series temporales de métricas del sistema, permite consultas con PromQL |
| **Grafana** | Visualizador | Renderiza dashboards con gráficos de métricas, permite alertas y comparaciones temporales |

> **Nota:** JMeter NO genera métricas de infraestructura. Prometheus NO genera carga. Grafana NO recopila datos. Cada herramienta tiene un rol definido e insustituible.

#### 3.5.3. Métricas a medir

| Métrica | Descripción | Fuente | Unidad |
|---------|-------------|--------|--------|
| **Tiempo de respuesta** | Tiempo desde que JMeter envía la solicitud hasta recibir la respuesta | JMeter | ms (media, p50, p90, p95, p99) |
| **Latencia de red** | Tiempo de ida y vuelta de la solicitud | JMeter | ms |
| **Throughput** | Número de solicitudes completadas por unidad de tiempo | JMeter + Prometheus | req/s |
| **Solicitudes por segundo** | Tasa de solicitudes enviadas | JMeter | req/s |
| **Porcentaje de errores** | Relación entre respuestas con error (4xx, 5xx) y total de respuestas | JMeter | % |
| **Uso de CPU** | Porcentaje de utilización del procesador | Prometheus (node_exporter o métricas del sistema) | % |
| **Uso de memoria** | Consumo de RAM del proceso Node.js | Prometheus (métricas de la aplicación) | MB / % |
| **Conexiones activas** | Número de conexiones HTTP abiertas simultáneamente | Prometheus | unidades |
| **Tiempo de respuesta de base de datos** | Latencia de las consultas Prisma a PostgreSQL | Prometheus (métricas de Prisma o DB) | ms |
| **Tasa de aciertos de caché** | Porcentaje de consultas que golpean caché (si aplica) | Prometheus | % |

#### 3.5.4. Configuración de Prometheus

Métricas a exponer desde la aplicación Next.js:
- Duración de requests HTTP (histograma)
- Conteo de requests por método, ruta y status code (contador)
- Uso de memoria del proceso Node.js
- Tiempo de respuesta de queries Prisma
- Conexiones activas a la base de datos

#### 3.5.5. Configuración de Grafana

Dashboards a crear:
- **Dashboard General:** Overview de métricas principales (throughput, errores, latencia)
- **Dashboard de API:** Métricas por endpoint (tiempo de respuesta, error rate)
- **Dashboard de Infraestructura:** CPU, memoria, conexiones de DB
- **Dashboard de Comparación:** Métricas antes/después de optimizaciones

---

## 4. Herramientas

| Herramienta | Versión | Uso | Instalación |
|------------|---------|-----|-------------|
| **Vitest** | Latest | Pruebas unitarias y de integración | `pnpm add -D vitest @testing-library/react @testing-library/jest-dom` |
| **Testing Library** | Latest | Pruebas de componentes React | `pnpm add -D @testing-library/react @testing-library/user-event` |
| **MSW (Mock Service Worker)** | Latest | Mocking de API en pruebas | `pnpm add -D msw` |
| **JMeter** | 5.6+ | Generación de carga | Apache JMeter (standalone) |
| **Prometheus** | 2.x | Recopilación de métricas | Docker / binario |
| **Grafana** | 10.x+ | Visualización de métricas | Docker / binario |
| **WAVE** | Extensión navegador | Evaluación de accesibilidad | Extensión Chrome/Firefox |

---

## 5. Estrategia Inicial

### 5.1. Enfoque

La estrategia se basa en el modelo de testing pyramid:

```
         ╱╲
        ╱  ╲         Pruebas de Aceptación
       ╱    ╲        (pocas, completas)
      ╱──────╲
     ╱        ╲      Pruebas Funcionales
    ╱          ╲     (moderadas, por endpoint)
   ╱────────────╲
  ╱              ╲   Pruebas Unitarias
 ╱                ╲  (muchas, rápidas, aisladas)
╱──────────────────╲
```

Se priorizan las pruebas unitarias por su velocidad y bajo costo de mantenimiento, seguidas por las funcionales en endpoints críticos, y finalmente pruebas de aceptación en flujos principales.

### 5.2. Priorización

| Prioridad | Tipo de prueba | Razón |
|-----------|---------------|-------|
| Alta | Unitarias de reglas de negocio | Lógica crítica que afecta todo el sistema |
| Alta | Unitarias de validadores | Primera línea de defensa contra datos inválidos |
| Alta | Funcionales de autenticación | Seguridad del sistema |
| Alta | Funcionales de endpoints principales | Funcionalidad core |
| Media | Funcionales de autorización | Control de acceso por roles |
| Media | Aceptación de flujos principales | Validación end-to-end |
| Media | Accesibilidad con WAVE | Cumplimiento de estándares |
| Baja | Rendimiento con JMeter | Optimización post-funcionalidad |

### 5.3. Convenciones de prueba

- **Nombre de archivos:** `*.test.ts` o `*.spec.ts`
- **Ubicación:** Junto al archivo que se prueba (co-location)
- **Estructura:** `describe()` → `it()` / `test()`
- **Arrange-Act-Assert:** Cada prueba sigue el patrón AAA
- **Un test, un concepto:** Cada test valida una única cosa
- **Datos de prueba:** Crear dentro del test, no compartir entre tests
- **Limpieza:** Cada test deja el estado como lo encontró

---

## 6. Plan de Ejecución

### Fase 1 — Pruebas Unitarias

**Objetivo:** Validar unidades individuales del sistema y corregir errores encontrados.

**Duración estimada:** 3-4 días

**Acciones:**
1. Configurar Vitest en el monorepo
2. Crear pruebas para `packages/shared-validators/src/rules.ts`
3. Crear pruebas para `packages/shared-validators/src/schemas.ts`
4. Crear pruebas para `apps/web/lib/errors.ts`
5. Crear pruebas para `apps/web/lib/rate-limit.ts`
6. Crear pruebas para `apps/web/lib/login-attempts.ts`
7. Crear pruebas para `apps/web/lib/middleware.ts`
8. Crear pruebas para `packages/ui/src/lib/utils.ts`
9. Ejecutar todas las pruebas y verificar que pasan
10. Generar reporte de cobertura
11. Corregir errores encontrados

**Criterio de salida:** Todas las pruebas pasan, cobertura ≥ 80% en módulos críticos.

---

### Fase 2 — Pruebas Funcionales

**Objetivo:** Validar funcionalidades y endpoints principales del sistema.

**Duración estimada:** 4-5 días

**Acciones:**
1. Configurar MSW para mocking de API
2. Crear pruebas de integración para endpoints de autenticación (login, register, refresh, logout)
3. Crear pruebas para endpoints de citas (CRUD + transiciones de estado)
4. Crear pruebas para endpoints de historial clínico
5. Crear pruebas de autorización por rol en endpoints protegidos
6. Crear pruebas de manejo de errores (validación, no encontrado, conflicto)
7. Crear pruebas de rate limiting y bloqueo de cuenta
8. Ejecutar todas las pruebas y verificar que pasan
9. Corregir errores encontrados

**Criterio de salida:** Todos los endpoints críticos pasan sus pruebas, autenticación y autorización validadas.

---

### Fase 3 — Pruebas de Aceptación

**Objetivo:** Validar los principales flujos de usuario y criterios de aceptación.

**Duración estimada:** 3-4 días

**Acciones:**
1. Definir escenarios de aceptación para cada caso de uso principal
2. Crear pruebas de integración que simulen flujos completos
3. Ejecutar el flujo de registro → login → crear cita
4. Ejecutar el flujo de gestión de citas (confirmar, cancelar, reprogramar)
5. Ejecutar el flujo de historial clínico con diferentes roles
6. Ejecutar el flujo de configuración como admin
7. Verificar resultados esperados en cada flujo
8. Corregir errores encontrados

**Criterio de salida:** Todos los flujos principales pasan, resultados consistentes con lo esperado.

---

### Fase 4 — Pruebas de Accesibilidad

**Objetivo:** Evaluar la interfaz utilizando WAVE y documentar los hallazgos.

**Duración estimada:** 2-3 días

**Acciones:**
1. Instalar extensión WAVE en navegador
2. Evaluar páginas principales: `/login`, `/register`, `/` (dashboard)
3. Evaluar `/appointments`, `/patients`, `/users`
4. Evaluar `/config`, `/clinical-records`, `/dentists`
5. Documentar hallazgos con severity, criterio WCAG y evidencia
6. Clasificar hallazgos por prioridad
7. Corregir hallazgos críticos
8. Re-evaluar con WAVE después de correcciones
9. Documentar comparación antes/después

**Criterio de salida:** No existen errores de accesibilidad (solo alertas o notificaciones menores), todos los hallazgos críticos corregidos y verificados.

---

### Fase 5 — Pruebas de Rendimiento

**Objetivo:** Evaluar el comportamiento del sistema bajo diferentes niveles de carga.

**Duración estimada:** 3-4 días

**Acciones:**
1. Configurar Prometheus para recopilar métricas del sistema
2. Configurar Grafana con dashboards base
3. Configurar JMeter con los escenarios de prueba iniciales
4. Ejecutar prueba base (sin carga adicional) como línea base
5. Ejecutar prueba con carga moderada
6. Ejecutar prueba con carga alta
7. Ejecutar prueba de estrés
8. Analizar métricas en Grafana para cada escenario
9. Identificar cuellos de botella
10. Documentar resultados y recomendaciones
11. Comparar métricas entre escenarios

**Criterio de salida:** Métricas documentadas para cada escenario, cuellos de botella identificados, recomendar optimizaciones si es necesario.

---

## 7. Escenarios de Prueba de Rendimiento

### 7.1. Prueba Base (Baseline)

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Establecer una línea base de rendimiento sin carga adicional |
| **Carga propuesta** | 1 usuario, 1 iteración, sin ramp-up |
| **Duración** | 1-2 minutos |
| **Endpoints** | Todos los endpoints principales (GET /api/appointments, GET /api/dentists, etc.) |
| **Métricas a observar** | Tiempo de respuesta base, uso de memoria idle, latencia de DB |
| **Criterio de éxito** | Todas las respuestas < 500ms, uso de memoria estable, 0% errores |

### 7.2. Prueba con Carga Moderada

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Validar el comportamiento con tráfico moderado similar a un día normal |
| **Carga propuesta** | 10-20 usuarios concurrentes, ramp-up de 30 segundos |
| **Duración** | 5 minutos |
| **Endpoints** | Operaciones de lectura (GET) y escritura (POST, PATCH) en proporción 70/30 |
| **Métricas a observar** | Tiempo de respuesta (p50, p90), throughput, errores, uso de CPU/memoria |
| **Criterio de éxito** | Tiempo de respuesta p90 < 2s, throughput estable, errores < 1%, CPU < 70%, memoria sin crecimiento excesivo |

### 7.3. Prueba con Carga Alta

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Simular un pico de tráfico y evaluar la degradación del sistema |
| **Carga propuesta** | 50-100 usuarios concurrentes, ramp-up de 60 segundos |
| **Duración** | 10 minutos |
| **Endpoints** | Enfocada en endpoints de mayor uso: login, appointments, clinical-records |
| **Métricas a observar** | Tiempo de respuesta (p50, p90, p95, p99), throughput, errores, CPU, memoria, conexiones DB |
| **Criterio de éxito** | Tiempo de respuesta p95 < 5s, throughput no decae significativamente, errores < 5%, sistema no cae |

### 7.4. Prueba de Estrés

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Encontrar el punto de quiebre del sistema y evaluar recuperación |
| **Carga propuesta** | 150-200 usuarios concurrentes, ramp-up de 120 segundos |
| **Duración** | 15-20 minutos |
| **Endpoints** | Todos los endpoints, con énfasis en operaciones pesadas |
| **Métricas a observar** | Tiempo de respuesta, throughput, errores, CPU, memoria, conexiones DB, comportamiento post-saturación |
| **Criterio de éxito** | El sistema permanece estable o degrada graceful (no crash), se identifica el límite, recuperación después de reducir carga |

> **Nota:** Los valores de usuarios son iniciales y deben ajustarse según las capacidades del hardware de despliegue y los resultados obtenidos en la fase de prueba base.

---

## 8. Métricas e Indicadores

### 8.1. Métricas de calidad

| Métrica | Fórmula | Meta inicial |
|---------|---------|-------------|
| Cobertura de código | Líneas ejecutadas / Total de líneas × 100 | ≥ 80% (módulos críticos) |
| Tasa de pruebas exitosas | Pruebas que pasan / Total de pruebas × 100 | 100% |
| Densidad de defectos | Defectos encontrados / Total de pruebas | A registrar, sin meta fija |
| Tiempo de ejecución de pruebas | Tiempo total de ejecución del suite | < 5 minutos (unitarias) |

### 8.2. Métricas de rendimiento

| Métrica | Indicador | Fórmula / Descripción |
|---------|-----------|----------------------|
| Tiempo de respuesta promedio | Velocidad del sistema | Σ tiempo de respuesta / N de solicitudes |
| Percentil 90 (p90) | Velocidad con variabilidad | 90% de las respuestas son más rápidas que este valor |
| Percentil 95 (p95) | Colas de espera | 95% de las respuestas son más rápidas que este valor |
| Throughput | Capacidad de procesamiento | Solicitudes completadas por segundo |
| Tasa de errores | Estabilidad | (Solicitudes con error / Total) × 100 |
| Uso de CPU | Carga del procesador | Porcentaje promedio durante la prueba |
| Uso de memoria | Consumo de RAM | MB utilizados por el proceso Node.js |
| Tiempo de respuesta DB | Velocidad de consultas | Latencia promedio de queries Prisma a PostgreSQL |

---

## 9. Criterios de Entrada y Salida

### 9.1. Criterios de entrada (prerrequisitos)

| Fase | Criterio de entrada |
|------|-------------------|
| **Unitarias** | Vitest instalado y configurado, al menos 1 archivo de prueba creado, entorno de desarrollo funcionando |
| **Funcionales** | Pruebas unitarias de la fase anterior completadas, base de datos de prueba disponible, MSW configurado |
| **Aceptación** | Pruebas funcionales completadas, escenarios de aceptación documentados, datos de prueba preparados |
| **Accesibilidad** | Extensión WAVE instalada, al menos una página funcional desplegada en entorno de desarrollo |
| **Rendimiento** | Prometheus configurado y recopilando métricas, Grafana con dashboards base, JMeter con escenarios definidos, sistema desplegado en entorno de prueba |

### 9.2. Criterios de salida (finalización)

| Fase | Criterio de salida |
|------|-------------------|
| **Unitarias** | Todas las pruebas pasan, cobertura ≥ 80% en módulos críticos, no existen pruebas pendientes |
| **Funcionales** | Todos los endpoints críticos validados, autenticación y autorización verificadas, errores manejados correctamente |
| **Aceptación** | Todos los flujos principales completados exitosamente, resultados consistentes con lo esperado |
| **Accesibilidad** | No existen errores de accesibilidad (solo alertas menores), hallazgos críticos corregidos y verificados |
| **Rendimiento** | Métricas documentadas para cada escenario, cuellos de botella identificados, comparaciones antes/después realizadas |

---

## 10. Evidencias

### 10.1. Tipos de evidencia a conservar

| Tipo de evidencia | Descripción | Formato |
|-------------------|-------------|---------|
| **Casos de prueba** | Documento con cada caso de prueba definido (pasos, datos, resultado esperado) | Markdown / Spreadsheet |
| **Resultados de ejecución** | Log de salida de las pruebas unitarias y funcionales | Terminal output / Archivo de reporte |
| **Reporte de cobertura** | Porcentaje de cobertura por módulo, líneas cubiertas/no cubiertas | HTML / JSON (Vitest coverage) |
| **Errores encontrados** | Descripción de cada error, pasos para reproducir, severidad | Issue tracker / Markdown |
| **Capturas de JMeter** | Screenshots de la configuración de test plans y resultados | PNG / JPG |
| **Resumen de JMeter** | Reporte de resumen de JMeter (summary report) | CSV / HTML (JMeter report) |
| **Métricas de Prometheus** | Consultas PromQL ejecutadas y resultados | Capturas / Exportaciones |
| **Dashboards de Grafana** | Capturas de los dashboards para cada escenario de prueba | PNG / JPG / PDF |
| **Exportaciones de Grafana** | Datos exportados en CSV o JSON para análisis posterior | CSV / JSON |
| **Resultados de WAVE** | Capturas del reporte WAVE para cada página evaluada | PNG / JPG |
| **Comparación WAVE** | Capturas antes y después de correcciones de accesibilidad | PNG / JPG lado a lado |
| **Registro de hallazgos** | Tabla con ID, página, severidad, descripción, estado de cada hallazgo | Markdown / Spreadsheet |

### 10.2. Organización de evidencias

```
evidencias/
├── 01-unitarias/
│   ├── reporte-cobertura/
│   ├── resultados-ejecucion/
│   └── casos-de-prueba/
├── 02-funcionales/
│   ├── resultados-endpoints/
│   ├── resultados-autenticacion/
│   └── casos-de-prueba/
├── 03-aceptacion/
│   ├── flujos-ejecutados/
│   └── resultados-esperados/
├── 04-accesibilidad/
│   ├── wave-antes/
│   ├── wave-despues/
│   └── registro-hallazgos/
└── 05-rendimiento/
    ├── jmeter/
    │   ├── test-plans/
    │   ├── resultados/
    │   └── capturas/
    ├── prometheus/
    │   └── consultas/
    └── grafana/
        ├── dashboard-escenario-base/
        ├── dashboard-escenario-moderada/
        ├── dashboard-escenario-alta/
        └── dashboard-escenario-estres/
```

---

## 11. Matriz de Pruebas

| Tipo de prueba | Objetivo | Herramienta | Qué se evalúa | Evidencia |
|----------------|----------|-------------|---------------|-----------|
| **Unitaria** | Validar unidades individuales de código | **Vitest** + Testing Library | Reglas de negocio, validadores Zod, utilidades, clases de error, middleware auth, rate limiter | Reporte de cobertura, log de ejecución |
| **Funcional** | Verificar que endpoints y operaciones cumplen requisitos | **Vitest** + MSW (mocking) | Endpoints REST, CRUD, validaciones, autenticación, autorización, manejo de errores, integración entre componentes | Log de ejecución, resultados por endpoint |
| **Aceptación** | Comprobar que flujos cumplen criterios de aceptación | **Vitest** + MSW + Testing Library | Casos de uso principales, flujos completos de usuario, resultados esperados, criterios de aprobación/rechazo | Flujos ejecutados, resultados documentados |
| **Accesibilidad** | Evaluar conformidad con estándares de accesibilidad | **WAVE** (extensión navegador) | Contraste, textos alternativos, etiquetas de formularios, estructura semántica, navegación por teclado, ARIA | Capturas WAVE, registro de hallazgos, comparación antes/después |
| **Rendimiento** | Medir comportamiento del sistema bajo carga | **JMeter** (genera carga), **Prometheus** (recopila métricas), **Grafana** (visualiza) | Tiempo de respuesta, latencia, throughput, req/s, % errores, CPU, memoria, conexiones DB | Capturas JMeter, dashboards Grafana, métricas Prometheus, comparaciones entre escenarios |

---

## 12. Resultados Esperados

### 12.1. Resultados de la Fase 1 (Unitarias)

- Suite de pruebas unitarias configurada y ejecutándose
- Pruebas para reglas de negocio, validadores, utilidades, errores y middleware
- Reporte de cobertura con porcentajes por módulo
- Errores encontrados corregidos y re-validados

### 12.2. Resultados de la Fase 2 (Funcionales)

- Pruebas de integración para endpoints principales
- Validación de autenticación (login, register, refresh, logout)
- Validación de autorización por rol en cada endpoint protegido
- Validación de manejo de errores y códigos HTTP
- Errores encontrados corregidos y re-validados

### 12.3. Resultados de la Fase 3 (Aceptación)

- Flujos completos ejecutados y documentados
- Cada caso de uso principal validado con pasos, datos y resultado
- Criterios de aprobación/rechazo verificados
- Inconsistencias corregidas

### 12.4. Resultados de la Fase 4 (Accesibilidad)

- Reporte WAVE para cada página principal
- Tabla de hallazgos con severidad y estado
- Comparación antes/después de correcciones
- No existen errores de accesibilidad tras correcciones

### 12.5. Resultados de la Fase 5 (Rendimiento)

- Métricas de rendimiento para 4 escenarios (base, moderada, alta, estrés)
- Dashboards de Grafana con gráficos de cada métrica
- Identificación de cuellos de botella
- Comparación de métricas entre escenarios
- Recomendaciones de optimización (si aplica)
- Límite de capacidad del sistema documentado

### 12.6. Resumen general esperado

| Fase | Estado esperado |
|------|----------------|
| Unitarias | Pruebas pasan, cobertura ≥ 80% en módulos críticos |
| Funcionales | Endpoints críticos validados, auth/authz correctos |
| Aceptación | Flujos principales completados exitosamente |
| Accesibilidad | Sin errores, solo alertas menores |
| Rendimiento | Métricas documentadas, cuellos de botella identificados |

> **Importante:** No se presentan resultados numéricos ficticios. Los resultados reales se documentarán durante la ejecución de cada fase y se agregarán a las evidencias correspondientes.
