# PC11 — Bugs extraídos para revisión

Fuente: FORMATOS PRÁCTICA DE CAMPO - PC11.docx, sección 4.2. Resumen de sus 14 defectos únicos. Estado original: Abierto. Esta extracción no afirma que continúen abiertos actualmente; el contraste con el código se entrega por separado. No incluye capturas ni OCR.

| ID | Casos de prueba | Defecto registrado | Estado en el Word |
|---|---|---|---|
| D-01 | CP03 | Inoperancia del bloqueo por fuerza bruta y omisión de cabecera HTTP 429 tras 7 intentos fallidos | Abierto |
| D-02 | CP07 | Bloqueo en registro de pacientes presenciales por obligatoriedad indebida del campo Correo Electrónico | Abierto |
| D-03 | CP12, CP14 | Ausencia de guardia de rutas en el frontend: roles no administradores pueden renderizar la vista de gestión de usuarios /users | Abierto |
| D-04 | CP13 | Desactivación de cuenta no muestra indicador de estado en la UI y el sistema no permite reactivar usuarios desactivados | Abierto |
| D-05 | CP15 | El correo de recuperación de contraseña no se entrega a usuarios externos por restricción del plan gratuito del proveedor Resend (HTTP 403) | Abierto |
| D-06 | CP26, CP27 | Ausencia de cancelación en cascada de citas pendientes al desactivar odontólogo o modificar su horario | Abierto |
| D-07 | CP28 | Los datos institucionales guardados en BD no se reflejan en el portal público y el formulario no muestra confirmación visual | Abierto |
| D-08 | CP30 | Excepción de calendario no cancela automáticamente las citas pendientes en la fecha bloqueada | Abierto |
| D-09 | CP32 | Desfase de un día en la visualización de la fecha de la cita en el portal del paciente (Timezone Bug) | Abierto |
| D-10 | CP33 | Ausencia de validación de longitud mínima en el campo "Notas" del formulario de agendamiento cuando tiene contenido | Abierto |
| D-11 | CP39, CP43 | El selector de pacientes no carga datos en el agendamiento presencial y no existe flujo para pacientes sin cuenta de usuario | Abierto |
| D-12 | CP45 | Filtros avanzados de la bandeja de citas incompletos: ausencia de filtro por fecha y por nombre/documento del paciente | Abierto |
| D-13 | CP46, CP47 | Flujo de cancelación de citas en recepción sin modal de motivo, sin validación de longitud mínima y sin doble confirmación | Abierto |
| D-14 | CP50 | Filtros disfuncionales, omisión de estados operativos y carencia de controles de navegación temporal en la agenda médica | Abierto |

## D-01 — Inoperancia del bloqueo por fuerza bruta y omisión de cabecera HTTP 429 tras 7 intentos fallidos

Casos: CP03.

Observado: El sistema responde sistemáticamente con código HTTP 401 Unauthorized en el intento 8 y subsiguientes, permitiendo seguir enviando credenciales sin bloquear la IP ni la cuenta.

Esperado según el Word: Al llegar al umbral de intentos fallidos estipulado, el servidor debe interceptar la petición y responder con código HTTP 429 Too Many Requests, cabecera Retry-After: 900 (15 minutos) e invalidar temporalmente las solicitudes de ese origen. 

## D-02 — Bloqueo en registro de pacientes presenciales por obligatoriedad indebida del campo Correo Electrónico

Casos: CP07.

Observado: El formulario marca error en rojo "Email inválido" debajo del input, exige una contraseña inicial de portal web y deshabilita el guardado. Es imposible registrar al paciente y, por consiguiente, no se le puede asignar una cita en la agenda de recepción.

Esperado según el Word: Según la especificación del negocio (Criterio de Aceptación de HU14/HU05: "Si no cuenta con correo, ej. registro presencial sin email, el sistema omitirá el envío de forma transparente, sin generar errores ni afectar el flujo"), el campo correo electrónico y contraseña deben ser opcionales en el canal de recepción. El sistema debe permitir registrar al paciente únicamente con nombres, apellidos y teléfono para habilitar su cita inmediata en ventanilla. 

## D-03 — Ausencia de guardia de rutas en el frontend: roles no administradores pueden renderizar la vista de gestión de usuarios /users

Casos: CP12, CP14.

Observado: La vista de administración de usuarios se renderiza completa. El modal de «Nuevo Usuario» puede abrirse desde la UI. El backend sí responde con HTTP 403 al intentar cargar datos, pero el frontend no expulsa al usuario ni lo redirige.

Esperado según el Word: Cualquier usuario sin rol ADMIN que acceda a la ruta /users debe ser redirigido automáticamente a su dashboard correspondiente o a una página de «No autorizado» (HTTP 403). Ningún componente de administración debe renderizarse. 

## D-04 — Desactivación de cuenta no muestra indicador de estado en la UI y el sistema no permite reactivar usuarios desactivados

Casos: CP13.

Observado: La API procesa la desactivación correctamente (isActive = false en BD). La interfaz no actualiza el badge/indicador de estado del usuario. No existe ningún botón o acción para reactivar una cuenta desactivada desde la UI.

Esperado según el Word: Tras desactivar, el usuario debe aparecer con un badge «Inactivo» (gris/rojo) en la lista. Debe existir una acción «Reactivar» para los usuarios con estado inactivo. Ambas acciones deben mostrar un mensaje de confirmación y resultado (Toast de éxito/error). 

## D-05 — El correo de recuperación de contraseña no se entrega a usuarios externos por restricción del plan gratuito del proveedor Resend (HTTP 403)

Casos: CP15.

Observado: La interfaz muestra el mensaje «Si el email está registrado, recibirás instrucciones para restablecer tu contraseña», pero el servidor registra el error: [EMAIL_FAILED] statusCode: 403 "You can only send testing emails to your own email address". El correo nunca llega al destinatario. Los pasos 3 y 4 del flujo quedan bloqueados.

Esperado según el Word: El usuario recibe un correo con el enlace de restablecimiento en un tiempo razonable (< 2 min), puede hacer clic en él, establecer una nueva contraseña e iniciar sesión con ella. 

## D-06 — Ausencia de cancelación en cascada de citas pendientes al desactivar odontólogo o modificar su horario

Casos: CP26, CP27.

Observado: La cita permanece en estado PENDING en ambos escenarios. No se registra motivo de cancelación. La interfaz no advierte al administrador sobre el conflicto.

Esperado según el Word: El sistema debe ejecutar una transacción que cancele automáticamente todas las citas PENDING afectadas, registrando el motivo genérico: "Su odontólogo, lamentablemente, no se encuentra disponible." 

## D-07 — Los datos institucionales guardados en BD no se reflejan en el portal público y el formulario no muestra confirmación visual

Casos: CP28.

Observado: El portal muestra los datos anteriores/hardcodeados. El formulario no muestra toast de confirmación.

Esperado según el Word: El portal debe consumir dinámicamente el endpoint /api/config/clinic para mostrar siempre los datos actuales. El formulario debe mostrar un toast de éxito tras guardar. 

## D-08 — Excepción de calendario no cancela automáticamente las citas pendientes en la fecha bloqueada

Casos: CP30.

Observado: La cita permanece en estado PENDING. El sistema no muestra advertencia sobre el conflicto. No existe campo cancellationReason en la tabla Appointment.

Esperado según el Word: Al crear la excepción, el backend debe identificar todas las citas PENDING cuya fecha esté dentro del rango bloqueado y actualizarlas a CANCELLED con el motivo: "Lo sentimos, pero esta fecha ya no está disponible para atención de pacientes." 

## D-09 — Desfase de un día en la visualización de la fecha de la cita en el portal del paciente (Timezone Bug)

Casos: CP32.

Observado: El portal muestra la fecha con un desfase de -1 día respecto a la fecha real almacenada en la BD.

Esperado según el Word: La fecha mostrada en el portal debe coincidir exactamente con la fecha seleccionada por el paciente al agendar. 

## D-10 — Ausencia de validación de longitud mínima en el campo "Notas" del formulario de agendamiento cuando tiene contenido

Casos: CP33.

Observado: El sistema acepta el texto corto sin advertencia y registra la cita con la nota incompleta.

Esperado según el Word: Si el campo Notas tiene contenido, debe validarse que tenga al menos 10 caracteres, mostrando el mensaje: "El motivo debe tener al menos 10 caracteres." 

## D-11 — El selector de pacientes no carga datos en el agendamiento presencial y no existe flujo para pacientes sin cuenta de usuario

Casos: CP39, CP43.

Observado: El selector de pacientes muestra solo el placeholder vacío. No existe opción para registrar pacientes sin cuenta. El botón "Crear Cita" permanece deshabilitado.

Esperado según el Word: El selector debe cargar la lista de pacientes registrados desde la API. Adicionalmente, debe existir una opción "Paciente sin cuenta" que despliegue un formulario básico (Nombre, Apellido, Teléfono) para vincular al paciente directamente a la cita sin crear credenciales de portal. 

## D-12 — Filtros avanzados de la bandeja de citas incompletos: ausencia de filtro por fecha y por nombre/documento del paciente

Casos: CP45.

Observado: Solo están disponibles los filtros por Estado y Odontólogo. No hay DatePicker ni búsqueda por paciente.

Esperado según el Word: La bandeja debe ofrecer: (1) un selector de fecha o rango temporal (DatePicker); y (2) un campo de búsqueda por nombre o DNI del paciente, independiente del campo de búsqueda por odontólogo. 

## D-13 — Flujo de cancelación de citas en recepción sin modal de motivo, sin validación de longitud mínima y sin doble confirmación

Casos: CP46, CP47.

Observado: La cita se cancela instantáneamente. No hay modal, no hay campo de motivo, no hay confirmación. En Prisma Studio, el campo de motivo queda vacío.

Esperado según el Word: Al hacer clic en "Cancelar", debe abrirse un modal con: (1) un textarea para el motivo (mínimo 25 caracteres); (2) un diálogo de confirmación con la pregunta "¿Está seguro que desea cancelar la cita del [Fecha] del paciente [Nombre]?"; y (3) solo tras la confirmación, procesar la cancelación y guardar el motivo en la base de datos. 

## D-14 — Filtros disfuncionales, omisión de estados operativos y carencia de controles de navegación temporal en la agenda médica

Casos: CP50.

Observado: El buscador indica "Buscar por odontólogo..." y no permite filtrar por paciente. El dropdown de estados solo contiene "Todos", "Confirmada" y "Completada" (faltan "Pendiente" y "Cancelada"). No existe un selector de fechas (DatePicker) ni botones de flechas (<, >) o botón "Hoy" para navegar temporalmente.

Esperado según el Word: El buscador debe indicar "Buscar por paciente o código..." y filtrar por los datos del paciente. El dropdown de estados debe incluir todas las opciones del ciclo de vida: Pendiente, Confirmada, Atendida/Completada y Cancelada. La interfaz debe incluir un DatePicker y botones de navegación temporal que permitan al odontólogo consultar citas de cualquier fecha pasada o futura. 

