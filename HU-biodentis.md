# BIODENTIS — Matriz Resumida de Historias de Usuario

---

## HU-01: Consultar Servicios Odontológicos
- **Rol:** Público (Sin autenticación).
- **Descripción:** Visualizar catálogo de servicios para conocer opciones antes de agendar.
- **Criterios de Aceptación:**
  1. Catálogo accesible sin iniciar sesión.
  2. Muestra nombre y descripción breve por servicio.
  3. Incluye buscador/filtro por nombre.
  4. Mensaje "No hay servicios disponibles por el momento" si la lista está vacía.
  5. Diseño responsive (móvil y escritorio).

---

## HU-02: Registro Presencial de Citas
- **Rol:** RECEPTIONIST.
- **Descripción:** Registrar citas solicitadas de forma presencial o telefónica.
- **Criterios de Aceptación:**
  1. Formulario con servicio, odontólogo, fecha, horario y datos del paciente (nombre, teléfono).
  2. No requiere crear cuenta de usuario previa al paciente.
  3. Cita ingresa directamente en estado **`CONFIRMED`** (sin aprobación previa).
  4. Valida en tiempo real que el odontólogo no tenga choques de horario.
  5. Valida disponibilidad contra horario semanal y excepciones (feriados/días no laborables).

---

## HU-03: Agendar Cita en Línea (Portal Paciente)
- **Rol:** PATIENT.
- **Descripción:** Agendar cita seleccionando servicio, odontólogo, fecha/hora y cuestionario de síntomas.
- **Criterios de Aceptación:**
  1. Paciente registrado e iniciado sesión.
  2. Selección de odontólogo, fecha y bloque de hora disponible (cards/tarjetas calculadas).
  3. Formulario obligatorio: motivo de consulta, presencia de dolor (sí/no) y tiempo de problema.
  4. Cita ingresa estrictamente en estado **`PENDING`**.
  5. Pasa a **`CONFIRMED`** cuando Recepción valida el ingreso en clínica.
  6. Pasa a **`COMPLETED`** (Atendida) cuando el Odontólogo termina la consulta.

---

## HU-04: Gestión de Citas Pendientes
- **Rol:** RECEPTIONIST.
- **Descripción:** Revisar, confirmar, rechazar o reprogramar citas en línea.
- **Criterios de Aceptación:**
  1. Listar citas con estado **`PENDING`** (incluye cuestionario de síntomas).
  2. Filtros por estado (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`) y rango de fechas.
  3. Acción **Confirmar**: Cambia estado a **`CONFIRMED`**.
  4. Acción **Rechazar**: Exige motivo de rechazo y notifica al paciente (correo/aviso).

---

## HU-05: Registro de Ficha/Nota Clínica
- **Rol:** DENTIST.
- **Descripción:** Registrar diagnóstico y tratamiento al finalizar la consulta.
- **Criterios de Aceptación:**
  1. Solo el odontólogo asignado a la cita puede registrar la nota.
  2. Requiere que la cita esté en estado **`COMPLETED`** (Atendida).
  3. Campos obligatorios: Diagnóstico y/o Tratamiento.
  4. Se asocia automáticamente al historial clínico del paciente (orden cronológico descendente).

---

## HU-06: Autenticación y Registro de Usuarios
- **Rol:** Público / Todos.
- **Descripción:** Registrarse como paciente, iniciar sesión y recuperar contraseña.
- **Criterios de Aceptación:**
  1. Registro público asigna **única y estrictamente** el rol `PATIENT`.
  2. Prohibido auto-registro para roles `DENTIST` o `RECEPTIONIST` (creados solo por `ADMIN`).
  3. Recuperación de contraseña vía token temporal por email (expiración de 1 hora).
  4. Error genérico "Email o contraseña incorrectos" en fallos de login.

---

## HU-07: Seguridad de Sesión y RBAC (JWT)
- **Rol:** Todos los usuarios autenticados.
- **Descripción:** Gestión de tokens seguros y control de accesos por rol.
- **Criterios de Aceptación:**
  1. Genera `access_token` (15 min) y `refresh_token` (7 días).
  2. Renovación transparente de `access_token` antes de expirar.
  3. Matriz RBAC estricta: Paciente solo ve su información; Dentista ve solo sus pacientes asignados; Recepción no accede a historiales clínicos.

---

## HU-08: Gestión de Usuarios y Personal Médico
- **Rol:** ADMIN.
- **Descripción:** Administrar cuentas de recepcionistas y odontólogos.
- **Criterios de Aceptación:**
  1. Crear, editar y desactivar (borrado lógico) cuentas de Recepción y Odontólogos.
  2. Al crear Odontólogo: Registrar especialidad y horario semanal fijo (ej. L-V 08:00-16:00).
  3. Si se desactiva un Odontólogo, sus citas **`PENDING`** pasan automáticamente a **`CANCELLED`**.

---

## HU-09: Configuración de Clínica y Excepciones
- **Rol:** ADMIN.
- **Descripción:** Configurar datos institucionales y excepciones de horario.
- **Criterios de Aceptación:**
  1. Editar datos de clínica (Nombre, RUC, Dirección, Teléfono).
  2. Crear excepciones de horario (feriados, recesos médicos, mantenimiento de sillones).
  3. Si se crea una excepción en fecha con citas **`PENDING`**, pasan a **`CANCELLED`**.
  4. Bloquea automáticamente la disponibilidad de agenda en el cálculo de slots para `HU-02` y `HU-03`.

---

## HU-10: Gestión de Perfil y Búsqueda de Pacientes
- **Rol:** PATIENT / RECEPTIONIST / ADMIN.
- **Descripción:** Edición de perfil de paciente y búsqueda administrativa.
- **Criterios de Aceptación:**
  1. Paciente edita únicamente sus propios datos de contacto.
  2. Recepción/Admin busca pacientes por nombre o DNI (resultados paginados), **sin acceso al historial clínico**.

---

## HU-11: Mis Citas y Cancelación/Reprogramación
- **Rol:** PATIENT.
- **Descripción:** Consultar historial de citas propias y solicitar cancelación/reprogramación.
- **Criterios de Aceptación:**
  1. Muestra listado propio de citas con estados y filtros.
  2. Permite cancelar/reprogramar directamente si faltan **más de 24 horas**.
  3. Si faltan **menos de 24 horas**, el sistema impide la acción web y redirige a contacto telefónico/presencial con recepción.

---

## HU-12: Agenda Médica y Filtros por Rol
- **Rol:** DENTIST / RECEPTIONIST.
- **Descripción:** Visualización y filtrado de la agenda diaria/semanal.
- **Criterios de Aceptación:**
  1. **Odontólogo (DENTIST):** Ve **únicamente su propia agenda** con citas en estado **`CONFIRMED`** y **`COMPLETED`** (NO ve citas de otros dentistas ni citas en estado `PENDING`).
  2. **Recepcionista (RECEPTIONIST):** Ve la agenda general con selector de odontólogo y todas las citas (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).

---

## HU-13: Consulta de Historial Clínico
- **Rol:** PATIENT / DENTIST.
- **DescripciónAquí tienes el catálogo completo de las **14 Historias de Usuario de BIODENTIS**[cite: 3] extraídas directamente de tu documento oficial[cite: 3]. 

Está estructurado en formato Markdown (`HU.md`) optimizado para **mínimo consumo de tokens**, manteniendo la numeración de ID oficial, el rol, la descripción y los criterios de aceptación clave[cite: 3].

---

### Contenido para tu archivo `HU.md`

```markdown
# BIODENTIS – Catálogo de Historias de Usuario (HU)

## HU-01: Consultar servicios odontológicos (Público)
- **Como** usuario visitante, **quiero** ver la lista de servicios del consultorio **para** conocer las opciones antes de agendar.
- **Criterios de Aceptación:**
  1. Acceso libre sin iniciar sesión.
  2. Muestra nombre y descripción breve por servicio.
  3. Incluye buscador/filtro por nombre.
  4. Muestra "No hay servicios disponibles por el momento" si la lista está vacía.

## HU-02: Registrar cita presencial/telefónica (Recepción)
- **Como** recepcionista, **quiero** registrar citas presenciales o telefónicas **para** centralizar la agenda.
- **Criterios de Aceptación:**
  1. Exclusivo para rol `RECEPTIONIST`.
  2. Requiere servicio, odontólogo, fecha, hora y datos del paciente (nombre, teléfono). No exige crear cuenta de usuario.
  3. Citas presenciales nacen directamente en estado `CONFIRMED`.
  4. Valida en tiempo real disponibilidad del odontólogo, horario semanal y excepciones/feriados (bloquea cruces).

## HU-03: Agendar cita en línea (Paciente)
- **Como** paciente registrado, **quiero** agendar una cita web seleccionando servicio, odontólogo, fecha, tarjeta de horario libre y síntomas **para** priorizar mi atención.
- **Criterios de Aceptación:**
  1. Requiere registro/login previo de paciente.
  2. Elección obligatoria de servicio, odontólogo, fecha y horario (mostrado en cards libres calculadas según agenda del dentista).
  3. Formulario obligatorio: motivo de consulta, presencia de dolor (sí/no) y tiempo aproximado.
  4. La cita nace estrictamente en estado `PENDING`.
  5. Pasa a `CONFIRMED` únicamente cuando Recepción la aprueba/confirma. Pasa a `ATENDIDA` / `COMPLETED` cuando el Odontólogo finaliza la atención.

## HU-04: Gestionar citas pendientes (Recepción)
- **Como** recepcionista, **quiero** revisar, confirmar, rechazar o reprogramar citas pendientes **para** organizar la agenda sin solapamientos.
- **Criterios de Aceptación:**
  1. Exclusivo para rol `RECEPTIONIST`.
  2. Lista únicamente solicitudes con estado `PENDING` (incluye respuestas del cuestionario de síntomas).
  3. Al confirmar: cambia a estado `CONFIRMED` (se vuelve visible para el Odontólogo).
  4. Al rechazar: exige ingresar motivo de rechazo y notifica al paciente.

## HU-05: Registrar nota clínica / diagnóstico (Odontólogo)
- **Como** odontólogo, **quiero** registrar diagnósticos y tratamientos al terminar la consulta **para** actualizar el historial clínico.
- **Criterios de Aceptación:**
  1. Exclusivo para el `DENTIST` asignado a la cita.
  2. Solo permitido si la cita existe y está en estado `COMPLETED` / `ATENDIDA`.
  3. Requiere completar al menos un campo: diagnóstico o tratamiento.
  4. Asocia la nota al historial clínico del paciente (ordenado de más reciente a más antiguo).

## HU-06: Autenticación y Registro de Usuarios (Todos)
- **Como** usuario, **quiero** registrarme e iniciar sesión con email y contraseña **para** acceder de forma segura.
- **Criterios de Aceptación:**
  1. Registro público solo crea usuarios con rol `PATIENT` (valida email único).
  2. Cuentas de `DENTIST` y `RECEPTIONIST` son creadas únicamente por `ADMIN`.
  3. Login retorna error genérico "Email o contraseña incorrectos" ante credenciales válidas/inválidas.
  4. Incluye recuperación de contraseña por token temporal con expiración de 1 hora.

## HU-07: Seguridad de sesión con JWT y Permisos RBAC (Todos)
- **Como** usuario autenticado, **quiero** una sesión protegida con tokens y restricciones por rol **para** resguardar la información clínica.
- **Criterios de Aceptación:**
  1. Genera `access_token` (15 min) y `refresh_token` (7 días).
  2. Renovación transparente de token mediante `refresh_token`.
  3. Restricción estricta por rol (`ADMIN`, `RECEPTIONIST`, `DENTIST`, `PATIENT`).
  4. Control de acceso a historial clínico: `PATIENT` (solo el propio en lectura), `DENTIST` (de sus pacientes atendidos), `RECEPTIONIST` (acceso denegado / 403).

## HU-08: Gestión de cuentas de personal (Administrador)
- **Como** administrador, **quiero** gestionar cuentas de recepcionistas y odontólogos **para** mantener actualizado el personal.
- **Criterios de Aceptación:**
  1. Exclusivo para rol `ADMIN` (crear, editar, desactivar cuentas; borrado lógico).
  2. Al crear un odontólogo, registra especialidad y horario semanal de disponibilidad.
  3. Al desactivar un odontólogo, sus citas pendientes/futuras pasan automáticamente a `CANCELLED`.
  4. Si cambia el horario de un odontólogo y choca con citas pendientes, estas pasan a `CANCELLED`.

## HU-09: Configuración de clínica y excepciones (Administrador)
- **Como** administrador, **quiero** configurar datos de la clínica y excepciones de horario **para** reflejar feriados o recesos.
- **Criterios de Aceptación:**
  1. Configuración de datos institucionales (nombre, RUC, dirección, teléfono).
  2. Registro de excepciones (feriados, recesos médicos, mantenimiento de sillones) con fecha inicio/fin.
  3. Si una excepción cubre una fecha con citas pendientes, pasan a `CANCELLED`.
  4. La API de disponibilidad resta automáticamente los días/horas de las excepciones activas.

## HU-10: Gestión de datos de paciente (Paciente / Recepción)
- **Como** paciente/recepcionista, **quiero** consultar o actualizar datos de contacto **para** mantener la información al día.
- **Criterios de Aceptación:**
  1. Paciente solo edita su propio perfil (teléfono, dirección).
  2. Recepcionista busca pacientes por nombre/DNI (sin visibilidad a historiales clínicos).

## HU-11: Consultar estado de citas y reprogramación (Paciente)
- **Como** paciente, **quiero** ver mis citas y solicitar cancelación/reprogramación **para** gestionar mi tiempo.
- **Criterios de Aceptación:**
  1. Muestra listado personal con estados (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).
  2. Regla de 24 horas: Cancelación/reprogramación directa permitida con >24h de anticipación.
  3. Si restan <24h, bloquea la acción en la web y solicita contactar a recepción.

## HU-12: Visualización de agenda de citas (Odontólogo / Recepción)
- **Como** odontólogo/recepcionista, **quiero** visualizar las agendas de citas **para** organizar la atención.
- **Criterios de Aceptación:**
  1. `DENTIST` ve **únicamente SU agenda** de citas `CONFIRMED` o `COMPLETED`. **NUNCA ve citas en estado `PENDING`**[cite: 3].
  2. `RECEPTIONIST` ve la agenda general de **todos** los odontólogos y las solicitudes `PENDING`[cite: 3].
  3. Filtros por fecha, odontólogo y estado[cite: 3].

## HU-13: Consulta de historial clínico diferenciado (Paciente / Odontólogo)
- **Como** paciente/odontólogo, **quiero** consultar el historial clínico según permisos **para** resguardar la privacidad.
- **Criterios de Aceptación:**
  1. `DENTIST`: accede al historial completo de pacientes que ha atendido[cite: 3].
  2. `PATIENT`: ve su propio historial en modo solo lectura[cite: 3].
  3. `RECEPTIONIST`: **Acceso bloqueado / 403 Forbidden**[cite: 3].

## HU-14: Reportes y recordatorios automáticos (Admin / Paciente)
- **Como** admin/paciente, **quiero** generar reportes de citas y recibir recordatorios **para** evitar ausentismo.
- **Criterios de Aceptación:**
  1. `ADMIN` genera reportes por periodo y odontólogo (exportables PDF/Excel)[cite: 3].
  2. Tarea programada (Cron) envía email recordatorio 24 horas antes de la cita[cite: 3].