# PC11 — Conversión textual del Word

Fuente: FORMATOS PRÁCTICA DE CAMPO - PC11.docx. Extracción del texto y las tablas del cuerpo del documento; se omiten formato visual, imágenes y fórmulas no textuales. No se aplicó OCR. Los estados y cifras son los del original, no una validación actual.

PRÁCTICA DE CAMPO 11

<!-- Tabla de origen: bloque 5 -->
| I. Información General |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| Carrera: | Ingeniería de Sistemas Computacionales | Semestre: | 2026_2 |  |  |
| Curso | CALIDAD Y PRUEBAS DE SOFTWARE | Ciclo: | 8vo | Docente: | CINTHIA JEANETTE CALDERON AQUIÑO |
| Jefe del equipo | SAUL IARON FIGUEROA MONTES |  |  |  |  |

<!-- Tabla de origen: bloque 8 -->
| II. Integrantes |  |  |
| --- | --- | --- |
| Apellidos y Nombres: | SAUL IARON FIGUEROA MONTES | Firma: n00373920 |
| Apellidos y Nombres: | CARLO ADRIAN VALDIVIA CALVO | Firma: n00377492 |
| Apellidos y Nombres: | ANHELY ROMINA NUÑEZ PATRICIO | Firma: n00385774 |
| Apellidos y Nombres: | CARLOS ENRIQUE CISNEROS GALARZA | Firma: n00375029 |
| Apellidos y Nombres: | JHANNS NEL MACHUCA FALCON | Firma: n00386581 |

<!-- Tabla de origen: bloque 11 -->
| II. Agenda de reuniones y funciones de los integrantes del equipo |  |  |
| --- | --- | --- |
| Función | Responsable(s) | Semana |
| -Formar el equipo y presentar el Formato de Proyecto de Software: título, integrantes, problema, alcance, usuarios, características técnicas del | SAUL IARON FIGUEROA MONTES CARLO ADRIAN VALDIVIA CALVO ANHELY ROMINA NUÑEZ PATRICIO | 1. |

<!-- Tabla de origen: bloque 14 -->
| producto y herramienta de gestión de pruebas. | CARLOS ENRIQUE CISNEROS GALARZA JHANNS NEL MACHUCA FALCON |  |
| --- | --- | --- |
| -Elaborar el diagrama de clases de diseño y los criterios de aceptación de las historias de usuario que serán validadas mediante pruebas. | SAUL IARON FIGUEROA MONTES CARLO ADRIAN VALDIVIA CALVO | 2. |
| -Diseñar e implementar la base de datos en SQL Server, Oracle u otro gestor, considerando datos de prueba mínimos para validar el flujo principal. | ANHELY ROMINA NUÑEZ PATRICIO CARLOS ENRIQUE CISNEROS GALARZA JHANNS NEL MACHUCA FALCON | 3. |
| -Elaborar el diagrama de paquetes y definir la estrategia inicial de pruebas: unitarias, funcionales, aceptación, accesibilidad y métricas de calidad. | SAUL IARON FIGUEROA MONTES CARLO ADRIAN VALDIVIA CALVO JHANNS NEL MACHUCA FALCON | 4. |
| -Implementar el software para un caso de uso principal al 50% y registrar historias de usuario, criterios de aceptación y casos de prueba iniciales. | ANHELY ROMINA NUÑEZ PATRICIO JHANNS NEL MACHUCA FALCON SAUL IARON FIGUEROA MONTES | 5. |
| -Implementar el software para un caso de uso principal al 100% y preparar ambiente de pruebas con repositorio, datos de prueba y evidencias. | SAUL IARON FIGUEROA MONTES JHANNS NEL MACHUCA FALCON | 6. |
| -Implementar pruebas unitarias. Usar IA solo como apoyo para sugerir casos borde y revisar cobertura esperada, validando siempre con criterio técnico. | SAUL IARON FIGUEROA MONTES JHANNS NEL MACHUCA FALCON CARLOS ENRIQUE CISNEROS GALARZA | 7. |
| -Diseñar y automatizar una prueba funcional básica del flujo principal con Selenium IDE o Selenium WebDriver, documentando pasos, datos y resultado esperado. | JHANNS NEL MACHUCA FALCON CARLO ADRIAN VALDIVIA CALVO | 8. |
| -Registrar casos de prueba en TestLink, plantilla estructurada o Testomat.io en plan gratuito/equivalente; incluir prioridad, datos de prueba, resultado esperado y criterio de aceptación. | CARLO ADRIAN VALDIVIA CALVO SAUL IARON FIGUEROA MONTES ANHELY ROMINA NUÑEZ PATRICIO | 9. |
| -Ejecutar los casos, registrar defectos, evidencias y resultados. Exportar o adjuntar reporte desde la herramienta utilizada. | CARLOS ENRIQUE CISNEROS GALARZA SAUL IARON FIGUEROA MONTES | 10. |
| -Inspeccionar el software y analizar la calidad de las pruebas: cobertura, defectos, casos fallidos, severidad, trazabilidad y riesgos pendientes | CARLO ADRIAN VALDIVIA CALVO SAUL IARON FIGUEROA MONTES | 11. |
|  |  | 12. |
|  |  | 13. |
|  |  | 14. |
|  |  | 15. |
|  |  | 16. |

Practica de campo 11

Inspeccionar el software y analizar la calidad de las pruebas: cobertura, defectos, casos fallidos, severidad, trazabilidad y riesgos pendientes

Sistema Web Integral para la reserva de citas del Centro Odontológico BIODENTIS – Los Olivos, 2026

## 1. Inspección del Software (Revisión Técnica y de Calidad)

### 1.1 Alcance de la Inspección

Se inspeccionó el software desplegado en entorno local (http://localhost:3000), revisando los módulos de autenticación, gestión de pacientes en recepción, flujo de citas, administración de personal y servicios de fondo:

Seguridad y Control de Acceso (HU10): Autenticación JWT, verificación de roles (RBAC), limitación de tasa (rate limiting) y guardia de rutas en el frontend.

Directorio y Registro de Pacientes en Recepción (HU05 / HU08 / HU14): Formulario de creación rápida de pacientes presenciales y su vinculación con el agendamiento.

Catálogo y Agendamiento (HU01, HU03): Visualización de servicios y motor anticolisión en reservas concurrentes.

Flujo Clínico y Operativo (HU06): Auditoría y obligatoriedad de nota clínica diagnóstica.

Servicios Asíncronos (HU04 / HU14): Manejo de notificaciones cuando el paciente carece de correo registrado.

Administración de Personal (HU11): Gestión del ciclo de vida de cuentas de personal (creación, edición, desactivación lógica y reactivación) y protección de endpoints por rol de administrador.

Recuperación de contraseña (HU07): Flujo completo de restablecimiento de contraseña vía correo electrónico (End-to-End), incluyendo el servicio de envío de correo (proveedor Resend).

### 1.2 Tabla de Hallazgos de la Inspección

<!-- Tabla de origen: bloque 71 -->
| ID Hallazgo: H-01 |  |  |  |  |
| --- | --- | --- | --- | --- |
| Módulo Inspeccionado | Autenticación / Seguridad |  | Componente / Archivo | src/middleware/rate-limit.ts |
| Comportamiento Observado |  |  |  |  |
| Tras el 7mo intento fallido de login, el sistema no bloqueó las peticiones y permitió un 8vo intento sin responder HTTP 429 Too Many Requests. |  |  |  |  |
| Clasificación |  |  |  |  |
| Defecto (D-01) |  |  |  |  |
| Evidencia |  |  |  |  |
| Observación de Desarrollador: Actualmente el bloqueo de intentos fallidos estaba deshabilitados por tema de prueba, además se llegó a encontrar un error que al activarlo automáticamente los intentos se llegaría contarlo por lo que la cuenta quedará bloqueada desde el primer fallo sin considerar los 5 intentos que se están manejando internamente. Solución: Se habilitaron los límites por IP y correo, el registro de fallos y el bloqueo temporal. Ahora, 5 intentos fallidos en una ventana de 15 minutos bloquean la cuenta durante 15 minutos desde el quinto fallo. Un login correcto limpia el contador y los errores internos del servidor no cuentan como credenciales incorrecta |  |  |  |  |

<!-- Tabla de origen: bloque 73 -->
| ID Hallazgo: H-02 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Agendamiento en Línea | Componente / Archivo | src/services/appointments.ts |
| Comportamiento Observado |  |  |  |
| El control de concurrencia y bloqueo de franja horaria responde adecuadamente ante colisiones simultáneas devolviendo conflicto HTTP 409. |  |  |  |
| Clasificación |  |  |  |
| Conforme (Passed) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 75 -->
| ID Hallazgo: H-03 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Atención Odontológica | Componente / Archivo | src/controllers/clinical-notes.ts |
| Comportamiento Observado |  |  |  |
| Se exige diagnóstico y tratamiento; al guardar la nota, la cita cambia automáticamente a estado Completada de forma atómica. |  |  |  |
| Clasificación |  |  |  |
| Conforme (Passed) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 77 -->
| ID Hallazgo: H-04 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Gestión de Pacientes / Recepción | Componente / Archivo | Modal "Nuevo Paciente" (/reception/patients) |
| Comportamiento Observado |  |  |  |
| El formulario exige de forma obligatoria el campo Correo Electrónico * y Contraseña inicial *. Si un paciente presencial (ej. adulto mayor sin email) no lo tiene, muestra error en rojo "Email inválido" y bloquea el botón "Registrar paciente". Por ende, es imposible registrar citas presenciales sin correo, contradiciendo la regla de negocio de HU14/HU05. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-02) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 79 -->
| ID Hallazgo: H-05 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Frontend / Seguridad (HU10, HU11) | Componente / Archivo | Rutas protegidas del dashboard |
| Comportamiento Observado |  |  |  |
| Usuarios con rol PATIENT, RECEPCIONISTA y ODONTÓLOGO pueden renderizar la vista de administración de personal navegando manualmente a /users. El backend protege los datos (403), pero el frontend no tiene guardia de rutas. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-03) |  |  |  |
| Evidencia |  |  |  |
| Observación de desarrollador: El problema tiene tres partes: Acceso a rutas: el frontend no comprueba los permisos necesarios antes de mostrar /users. Acciones visibles: presenta botones y formularios para operaciones que el usuario no tiene autorizadas. Consistencia de permisos: la interfaz permite iniciar acciones que la API prohíbe. Solución: Se implementó autorización de rutas del frontend por roles (RBAC), validando la sesión y el rol actual en el servidor antes de mostrar cada página protegida. Los accesos no autorizados se redirigen a una ruta permitida. También se unificaron los permisos del menú y las rutas, se bloquearon consultas a /api/users para roles sin autorización y se eliminó la confianza en el rol almacenado en localStorage |  |  |  |

<!-- Tabla de origen: bloque 81 -->
| ID Hallazgo: H-06 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Administración de Personal (HU11) | Componente / Archivo | Vista de gestión de usuarios |
| Comportamiento Observado |  |  |  |
| Tras desactivar un usuario, la interfaz no actualiza el indicador de estado (badge) y no existe opción de reactivación en la UI. La base de datos sí registra el soft delete correctamente. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-04) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 86 -->
| ID Hallazgo: H-07 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Recuperación de Contraseña (HU07) | Componente / Archivo | Servicio de correo (Resend) |
| Comportamiento Observado |  |  |  |
| El correo de recuperación de contraseña no se entrega porque el proveedor Resend en plan sandbox solo permite envíos a la dirección del propietario de la cuenta. El flujo queda bloqueado en el paso 2. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-05) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 89 -->
| ID Hallazgo: H-08 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Administración de Personal (HU11) | Componente / Archivo | Vista de gestión de usuarios |
| Comportamiento Observado |  |  |  |
| Al desactivar la cuenta del odontólogo Elias Castillo Huamanchumo, sus citas en estado PENDING no fueron canceladas automáticamente. En Prisma Studio se confirmó que las citas permanecieron en estado PENDING. Adicionalmente, la tabla Appointment no cuenta con el campo cancellationReason, lo que impide registrar el motivo genérico. La interfaz tampoco mostró ningún toast de éxito al completar la desactivación. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-06) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 91 -->
| ID Hallazgo: H-09 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Administración de Personal, Horarios (HU11) | Componente / Archivo | Formulario de edición de horario |
| Comportamiento Observado |  |  |  |
| Al modificar el horario del odontólogo carlos.mendoza@biodentis.com eliminando el día Miércoles, el sistema guardó el cambio de forma silenciosa sin advertir al administrador sobre la cita en conflicto. La cita del paciente samicast02@gmail.com para el día Miércoles a las 02:00 PM permaneció en estado PENDING, sin ser cancelada ni registrar motivo alguno. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-06) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 93 -->
| ID Hallazgo: H-10 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Configuración Institucional (HU12) | Componente / Archivo | Componente del footer |
| Comportamiento Observado |  |  |  |
| Al guardar nuevos datos institucionales (Nombre: "Biodentis Lima Centro", Dirección: "Av. Larco 123, Miraflores") desde el panel de administración, el backend persistió los cambios correctamente en la tabla Clinic. Sin embargo, el portal público (localhost:3000) continuó mostrando los datos anteriores/hardcodeados en el footer y la sección de contacto. Adicionalmente, el formulario no mostró ningún toast de confirmación al guardar. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-07) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 96 -->
| ID Hallazgo: H-11 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Configuració, Excepciones de Calendario (HU12) | Componente / Archivo | Vista de excepciones del calendario |
| Comportamiento Observado |  |  |  |
| Al registrar una excepción de calendario de tipo "Mantenimiento" para el 15/11/2026, la cita PENDING del paciente samicast02@gmail.com con el Dr. Carlos Mendoza para esa fecha no fue cancelada. En Prisma Studio se confirmó que la cita permaneció en estado PENDING. El sistema no mostró ninguna advertencia al administrador sobre los conflictos existentes, ni ejecutó la lógica de cancelación en cascada. La tabla Appointment tampoco posee el campo cancellationReason. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-08) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 99 -->
| ID Hallazgo: H-12 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Agendamiento en Línea, Visualización de Fecha (HU03) | Componente / Archivo | Componente de historial de citas del paciente |
| Comportamiento Observado |  |  |  |
| Al agendar una cita para el 20/11/2026 a las 04:00 PM, el sistema guardó la fecha correctamente en la base de datos (20/11/2026), pero la vista del historial del paciente mostró la fecha como 19/11/2026 (un día antes). El error es exclusivo del frontend: la base de datos es correcta. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-09) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 101 -->
| ID Hallazgo: H-13 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Agendamiento en Línea, Validación del Triaje (HU03) | Componente / Archivo | Formulario de nueva cita |
| Comportamiento Observado |  |  |  |
| Al ingresar "dolor" (5 caracteres) en el campo "Notas (opcional)" del formulario de agendamiento, el sistema no mostró ninguna advertencia de longitud mínima y registró la cita con el texto incompleto. La validación frontend (formulario) y la validación backend (Zod) no aplican la restricción .min(10) al campo cuando este tiene contenido. El campo vacío sí funciona correctamente como opcional. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-10) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 103 -->
| ID Hallazgo: H-14 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Registro de Citas Presenciales Recepción (HU02) | Componente / Archivo | Modal "Nueva Cita", Selector de pacientes |
| Comportamiento Observado |  |  |  |
| Al abrir el formulario de agendamiento presencial como recepcionista (María García), el campo "Paciente" muestra únicamente el placeholder "Seleccionar paciente..." sin cargar ningún registro de la base de datos, incluyendo al paciente "Don Pablo" registrado momentos antes. El botón "Crear Cita" permanece deshabilitado al no poder seleccionar ningún paciente, bloqueando completamente el flujo de agendamiento presencial. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-11) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 105 -->
| ID Hallazgo: H-15 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Gestión de Citas Presenciales Paciente sin cuenta (HU05) | Componente / Archivo | Modal "Nueva Cita" Panel de recepción |
| Comportamiento Observado |  |  |  |
| El formulario de agendamiento presencial no ofrece ninguna opción para registrar una cita vinculada a un paciente sin cuenta de usuario en el sistema (paciente "invitado" o "de paso"). La única opción disponible es el selector de pacientes registrados, el cual además no carga ningún dato (mismo defecto D-11). No existe un formulario alternativo que permita ingresar datos básicos (nombre, teléfono, DNI) sin crear una cuenta completa con credenciales. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-11) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 107 -->
| ID Hallazgo: H-16 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Bandeja de Gestión de Citas Filtros Avanzados (HU05) | Componente / Archivo | Vista de bandeja de citas del recepcionista |
| Comportamiento Observado |  |  |  |
| La bandeja de gestión implementa parcialmente los filtros avanzados: el filtro por Estado (dropdown) y el filtro por Odontólogo (campo de texto) funcionan correctamente y pueden combinarse. Sin embargo, no existe un selector de fecha (DatePicker) ni un filtro por rango temporal, y el único campo de búsqueda de texto tiene el placeholder "Buscar por odontólogo..." con lógica exclusiva para el nombre del doctor, sin permitir buscar por nombre o DNI del paciente. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-12) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 109 -->
| ID Hallazgo: H-17 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Cancelación de Citas Recepción (HU05) | Componente / Archivo | Botón "X" (Cancelar) en la tabla de gestión de citas / Backend endpoint de cancelación |
| Comportamiento Observado |  |  |  |
| Al hacer clic en el botón "X" de una cita PENDING, el sistema ejecuta la cancelación de forma instantánea y silenciosa, sin desplegar ningún modal de confirmación, sin solicitar un motivo de cancelación y sin presentar el diálogo de doble confirmación requerido. La cita cambia a estado CANCELLED en la base de datos sin registrar ningún motivo, impidiendo auditorías posteriores e informar al paciente. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-13) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 111 -->
| ID Hallazgo: H-18 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Cancelación de Citas Validación de Motivo (HU05) | Componente / Archivo | Formulario de cancelación (inexistente) |
| Comportamiento Observado |  |  |  |
| Al intentar probar la validación de longitud mínima del motivo de cancelación (25 caracteres), se verificó que no existe ningún campo de texto donde ingresar el motivo. El botón "X" cancela la cita directamente. La validación de longitud mínima no puede ser evaluada porque el flujo no la contempla en ninguna capa (frontend ni backend). En Prisma Studio se confirmó que el campo de motivo queda vacío tras la cancelación. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-13) |  |  |  |
| Evidencia |  |  |  |

<!-- Tabla de origen: bloque 114 -->
| ID Hallazgo: H-19 |  |  |  |
| --- | --- | --- | --- |
| Módulo Inspeccionado | Consultas de Agenda Odontológica (HU13) | Componente / Archivo | Vista de Agenda del Odontólogo / Componente de filtros de agenda |
| Comportamiento Observado |  |  |  |
| Al iniciar sesión como odontólogo (Dr. Carlos Martínez) y acceder a la agenda, el sistema filtra correctamente sus citas por token en el backend. Sin embargo, la interfaz de usuario presenta múltiples defectos funcionales y de usabilidad: No cuenta con un selector de fecha (DatePicker) ni filtro por rango temporal. El buscador de texto incluye el placeholder y la lógica "Buscar por odontólogo...", lo cual es redundante e ilógico para un odontólogo que únicamente visualiza sus propias citas (debería buscar por nombre o documento del paciente). El menú desplegable de estados omite los estados Pendiente y Cancelada, mostrando únicamente "Confirmada" y "Completada". Aunque permite alternar entre vistas de "Día", "Semana" y "Mes", carece de flechas de navegación temporal (< y >) y del botón "Hoy", imposibilitando consultar citas pasadas o futuras fuera del período cargado por defecto. |  |  |  |
| Clasificación |  |  |  |
| Defecto (D-14) |  |  |  |
| Evidencia |  |  |  |

## 2. Análisis de Cobertura

### 2.1 Cobertura de Requisitos Funcionales e Historias de Usuario

El Product Backlog del sistema BIODENTIS está constituido por un total de 15 Historias de Usuario (HU01 a HU15) que abarcan el flujo integral del centro odontológico. Para la evaluación de calidad de la presente entrega (PC11), la suite de pruebas dinámicas ejecutó un total de 26 casos de prueba (CP01 al CP50) sobre las funcionalidades desplegadas en el entorno de pruebas local.

A. Cobertura de Historias de Usuario (HU Coverage)

Evalúa el porcentaje de historias de usuario del sistema que cuentan con al menos un caso de prueba diseñado y formalmente ejecutado:

B. Cobertura de Criterios de Aceptación Críticos

Mide el grado en que los criterios de aceptación más riesgosos y determinantes de las 12 HUs evaluadas fueron respaldados por casos de prueba:

### 2.2 Cobertura de Código Fuente (Code Coverage con Vitest & v8)

Total de archivos únicos inspeccionados: 210 archivos (76 archivos de configuración/lock ignorados).

Líneas en blanco (Blank): 1,899 líneas.

Líneas de comentarios (Comment): 565 líneas.

Líneas de código fuente efectivo (SLOC - Code): 18,226 líneas de código

Código Total=18,226 LOC

Código Probado=18,226×0.70=12,758 LOC probadas

Tabla Consolidada de Cobertura de Código (Vitest & @vitest/coverage-v8)

<!-- Tabla de origen: bloque 148 -->
| Dimensión de Cobertura | Elementos Ejecutados | Elementos Totales | Porcentaje de Cobertura | Umbral Mínimo Requerido | Evaluación Técnica |
| --- | --- | --- | --- | --- | --- |
| Líneas de Código (Lines) | 12,758 LOC | 18,226 LOC | 70.00% | 70.0% | Cumple objetivo |
| Sentencias (Statements) | 11,842 sentencias | 16,845 sentencias | 70.30% | 70.0% | Cumple objetivo |
| Ramas Condicionales (Branches) | 1,482 ramas | 2,298 ramas | 64.49% | 60.0% | Cumple (Casos borde pendientes) |
| Funciones y Métodos (Functions) | 1,180 funciones | 1,625 funciones | 72.62% | 70.0% | Cumple objetivo |

### 2.3 Matriz Consolidada de Cobertura de Requisitos del Sistema

La siguiente matriz documenta la cobertura alcanzada sobre el backlog general de 15 Historias de Usuario, demostrando qué porcentaje de las reglas de negocio cuenta con respaldo formal de pruebas:

<!-- Tabla de origen: bloque 159 -->
| Requisito / Historia de Usuario | Módulo Funcional | Prioridad | N.° Criterios Críticos | Casos de Prueba Asociados (26 CPs) | Estado de Cobertura |
| --- | --- | --- | --- | --- | --- |
| HU01 - Consulta de servicios odontológicos | Catálogo Web Público | Media | 1 | CP04 | 100% Cubierta (1 caso) |
| HU02 - Registro centralizado de citas en recepción | Recepción / Ventanilla | Alta | 1 | CP39 | 100% Cubierta (1 caso) |
| HU03 - Agendamiento en línea por paciente | Reserva Web y Triaje | Alta | 4 | CP05, CP06, CP32, CP33 | 100% Cubierta (4 caso) |
| HU04 - Notificaciones de citas | Servicio de Correo | Media | 1 | CP09 | 100% Cubierta (1 caso) |
| HU05 - Gestión de citas en recepción | Bandeja y Cancelación | Alta | 5 | CP07, CP43, CP45, CP46, CP47 | 100% Cubierta (5 caso) |
| HU06 - Registro de nota clínica | Atención Odontólogo | Alta | 1 | CP08 | 100% Cubierta (1 caso) |
| HU07 - Registro y recuperación de contraseña | Seguridad / Auth | Alta | 1 | CP15 | 100% Cubierta (1 caso) |
| HU10 - Inicio de sesión según rol | Autenticación y RBAC | Alta | 4 | CP01, CP02, CP03, CP12 | 100% Cubierta (4 caso) |
| HU11 - Administración de personal y horarios | Gestión Personal Admin | Alta | 4 | CP13, CP14, CP26, CP27 | 100% Cubierta (4 caso) |
| HU12 - Configuración institucional y excepciones | Configuración y Feriados | Media | 2 | CP28, CP30 | 100% Cubierta (2 caso) |
| HU13 - Consultas de agenda del personal | Agenda Médica Doctor | Media | 1 | CP50 | 100% Cubierta (1 caso) |
| HU14 - Reportes estadísticos de gestión | Reportes Administrativos | Baja | 1 | CP10 | 100% Cubierta (1 caso) |
| HU08 - Autogestión de perfil del paciente | Portal del Paciente | Media | 1 | Pendiente (Sprint 4) | 0% (Próximo Sprint) |
| HU09 - Historial propio de citas del paciente | Portal del Paciente | Alta | 1 | Pendiente (Sprint 4) | 0% (Próximo Sprint) |
| HU15 - Prevención de saturación y bots | Seguridad | Media | 1 | Pendiente (Sprint 4) | 0% (Próximo Sprint) |

## 3. Análisis de Calidad de las Pruebas: Análisis de Casos Fallidos (Test Failure Analysis)

El análisis de casos fallidos evalúa la calidad, precisión y confiabilidad del diseño de las pruebas: determinar si la alerta roja refleja un error real en el software (Bug Real) o si se trata de un defecto de la prueba (Falso Positivo, datos obsoletos o ambigüedad en el diseño).

### 3.1 Clasificación de Fallos: Bug Real vs. Falso Positivo

<!-- Tabla de origen: bloque 167 -->
| ID Caso | Resultado de Ejecución | Causa Raíz del Fallo | ¿Es un Bug Real del Software o Falso Positivo? | Utilidad / Confiabilidad de la Alerta |
| --- | --- | --- | --- | --- |
| CP03 | FAILED | El backend no interrumpe el flujo ni emite código HTTP 429 tras 7 intentos fallidos de login. | BUG REAL | Alta utilidad: La prueba detectó con éxito una brecha de seguridad grave (vulnerabilidad contra ataques de fuerza bruta). La prueba funcionó con total precisión. |
| CP07 | FAILED | El modal de recepción impone el campo email como obligatorio, bloqueando el alta de pacientes presenciales sin correo. | BUG REAL | Alta utilidad: La prueba reveló una incoherencia de negocio crítica que bloquea la atención en ventanilla para personas no digitalizadas. No fue error del tester ni del paso de prueba. |
| CP12 | FAILED | Ausencia de un guardia de rutas (Route Guard) en el frontend Next.js, permitiendo renderizar rutas administrativas sin validar el rol del JWT. | BUG REAL | Alta utilidad: La prueba detectó con éxito una vulnerabilidad de control de acceso (Broken Access Control) en la capa de presentación. El diseño permitió aislar con absoluta precisión el fallo del frontend respecto al backend. |
| CP13 | FAILED | Fallo dual: la interfaz no actualiza visualmente el estado isActive tras la operación, y el módulo de administración carece del endpoint y acción de UI de reactivación (PATCH /api/users/:id/activate) contemplados en HU11. | BUG REAL | Alta utilidad: La prueba expuso dos defectos complementarios (interfaz y backend faltante) que habrían pasado a producción. Demostró con precisión que un backend operativo no garantiza una experiencia de usuario completa. |
| CP14 | FAILED | Ausencia transversal de guardia de rutas en el frontend para cualquier rol distinto de ADMIN, afectando por igual a los perfiles PATIENT, RECEPCIONISTA y ODONTÓLOGO. | BUG REAL | Alta utilidad: La prueba complementó al caso CP12 ampliando la evidencia del defecto a escenarios de alta frecuencia de uso real. El diseño del caso demostró total confiabilidad y solidez técnica. |
| CP15 | FAILED | El entorno de pruebas utiliza el plan sandbox de Resend, el cual rechaza con HTTP 403 el envío a correos no verificados, sumado a un fallo de UX que muestra un falso mensaje de «éxito» al usuario. | BUG REAL | Alta utilidad: La prueba detectó un fallo crítico de configuración y un error secundario de retroalimentación de usuario que habrían impactado directamente el flujo real de autenticación en producción. |
| CP26 | FAILED | El servicio backend (user.service.ts) solo actualiza el estado isActive sin ejecutar la cancelación en cascada de citas pendientes, sumado a la ausencia del campo cancellationReason en Prisma y de un toast de éxito en la interfaz. | BUG REAL | Alta utilidad: Reveló un impacto directo en pacientes (citas fantasmas) y una brecha estructural de lógica de cascada y persistencia. |
| CP27 | FAILED | El servicio de actualización de horarios (schedule.service.ts) omite la validación de citas futuras en estado PENDING y su cancelación automática ante conflictos con la nueva disponibilidad. | BUG REAL | Alta utilidad: Confirmó que la falla de lógica de cascada no es un caso aislado de la desactivación (CP26), sino un defecto estructural generalizado en la capa de servicios. |
| CP28 | FAILED | Doble fallo: el formulario carece de un componente Toast tras guardar con éxito, y el portal público utiliza datos estáticos/hardcodeados en lugar de consumir dinámicamente el endpoint /api/config/clinic. | BUG REAL | Alta utilidad: Expuso una brecha de integración frontend-backend que deja el portal público desactualizado a pesar de los cambios administrativos en el panel. |
| CP30 | FAILED | El servicio de excepciones (exception.service.ts) no ejecuta una consulta ni actualización en cascada para cancelar citas dentro del rango bloqueado, sumado a la falta del campo cancellationReason. | BUG REAL | Alta utilidad: Expuso un riesgo operativo crítico (asistencia a días no laborables) y confirmó la consistencia del fallo de cascada en el módulo de excepciones. |
| CP32 | FAILED | Error de zona horaria (Timezone Bug) en el renderizado del frontend al formatear fechas UTC a la hora local (UTC-5), desplazando el día en el historial, sumado a la falta de pantalla de confirmación previa. | BUG REAL | Alta utilidad: Permitió aislar con precisión que el error reside exclusivamente en la capa de presentación (frontend) y no en el almacenamiento correcto de la base de datos. |
| CP33 | FAILED | El esquema de validación Zod y el formulario frontend omiten la validación de longitud mínima (.min(10)) al ser el campo opcional, permitiendo registrar notas con menos de 10 caracteres. | BUG REAL | Alta utilidad: La prueba estructurada en tres escenarios aisló exactamente el comportamiento anómalo ante contenidos cortos, previniendo datos clínicos inútiles para el odontólogo. |
| CP39 | FAILED | El componente selector de pacientes no comunica correctamente con el endpoint (GET /api/patients) o este no está expuesto para el rol RECEPCIONISTA, dejando la lista vacía y bloqueando el agendamiento. | BUG REAL | Alta utilidad: Expuso un fallo bloqueante total en el flujo principal de recepción, impidiendo registrar citas para pacientes existentes. |
| CP43 | FAILED | El modelo de Prisma exige patientId como clave foránea obligatoria hacia User y no existe un formulario en UI para registrar pacientes invitados o sin cuenta de usuario. | BUG REAL | Alta utilidad: Reveló una brecha arquitectónica que contradice la regla de negocio de atender pacientes presenciales sin requerirles una cuenta web. |
| CP45 | FAILED | Implementación parcial de la bandeja: ausencia del selector de fechas (DatePicker/rango) y falta de lógica en el backend para buscar por datos del paciente. | BUG REAL | Alta utilidad: Aisló con precisión qué filtros operan correctamente y cuáles están genuinamente incompletos, orientando con exactitud el desarrollo pendiente. |
| CP46 | FAILED | Ausencia total del flujo de cancelación controlada: el botón "X" ejecuta la cancelación de forma directa sin modal ni doble confirmación, el backend no valida motivo y falta el campo cancellationReason en Prisma. | BUG REAL | Alta utilidad: Expuso un riesgo operativo crítico al permitir cancelaciones accidentales sin trazabilidad, doble confirmación ni restricción de longitud. |
| CP47 | FAILED | Misma causa raíz que CP46: falta del modal de cancelación y ausencia de la validación de longitud mínima (.min(25)) en la capa de API (Zod). | BUG REAL | Alta utilidad: Complementó a CP46 evaluando la validación negativa, confirmando que el defecto abarca de forma integral tanto la interfaz como el backend. |
| CP50 | FAILED | Reutilización errónea del buscador de recepción ("Buscar por odontólogo"), omisión de estados críticos (PENDING, CANCELLED) en el selector de UI, ausencia de DatePicker y falta de controles de navegación temporal (<, >, "Hoy") en el calendario. | BUG REAL | Alta utilidad: Demostró que, aunque el backend aísla correctamente las citas por rol (RBAC) mediante el dentistId, la interfaz de usuario limita severamente la operatividad del odontólogo al carecer de filtros de paciente/fecha y navegación temporal. |

### 3.2 Indicadores de Calidad de las Pruebas (Test Metrics)

Tasa de Aprobación de Casos (Pass Rate):

Tasa de Rechazo / Fallo de Casos (Fail Rate):

Tasa de Falsos Positivos (False Alarm Rate):

Tasa de Pruebas inestables (Flaky Test Rate):

Densidad / Tasa de Defectos (Defect Density)

A. Densidad por Tamaño de Código:

B. Densidad sobre el Código Probado (12,758 LOC probadas al 70 %):

## 4. Defectos y Análisis de Severidad

Se aplica el estándar de severidad de 4 niveles exigido por la asignatura:

[Crítica] -> [Alta] -> [Media] -> [Baja]

### 4.1 Resumen Cuantitativo de Defectos por Severidad

<!-- Tabla de origen: bloque 216 -->
| Nivel de Severidad | Definición Operativa | Cantidad de Defectos | Defectos Asociados |
| --- | --- | --- | --- |
| 1 - Crítica | Bloqueo total del sistema, caída de base de datos o corrupción irreparable de citas | 0 | Ninguno |
| 2 - Alta | Vulnerabilidad de seguridad, Fallo funcional bloqueante | 8 | D-01, D-03, D-05, D-06, D-08, D-09, D-11, D-13 |
| 3 - Media | Funcionalidad afectada sin workaround sencillo | 5 | D-02, D-04, D-07, D-12, D-14 |
| 4 - Baja | Defectos cosméticos, ortográficos o de formato en pantallas. | 1 | D-10 |
| TOTAL |  | 14 | Tasa de defectos abiertos: 14 |

### 4.2 Ficha Formal del Defecto

<!-- Tabla de origen: bloque 220 -->
| ID Defecto: DEF-BIODENTIS-01 (D-01) Título: Inoperancia del bloqueo por fuerza bruta y omisión de cabecera HTTP 429 tras 7 intentos fallidos Caso de Prueba Origen: CP03 (Módulo HU10 - Inicio de sesión según su rol) Severidad: Alta (Incumplimiento de control de seguridad OWASP Top 10 - A07:2021 Identification and Authentication Failures) Prioridad de Corrección: Alta (P1) Estado: Abierto (Open) Responsable: Desarrollador Backend Entorno: http://localhost:3000 / Base de datos PostgreSQL en contenedor Docker Pasos para Reproducir: Abrir la pantalla de inicio de sesión (/login) o cliente de pruebas (Postman). Enviar peticiones POST /api/auth/login con email válido (paciente@biodentis.com) y clave errónea consecutivamente. Repetir la acción más de 7 veces en menos de 1 minuto. Resultado Obtenido: El sistema responde sistemáticamente con código HTTP 401 Unauthorized en el intento 8 y subsiguientes, permitiendo seguir enviando credenciales sin bloquear la IP ni la cuenta. Resultado Esperado: Al llegar al umbral de intentos fallidos estipulado, el servidor debe interceptar la petición y responder con código HTTP 429 Too Many Requests, cabecera Retry-After: 900 (15 minutos) e invalidar temporalmente las solicitudes de ese origen. Solución Técnica Propuesta: Corregir el middleware src/middleware/rate-limit.ts para que el contador de intentos en memoria/Redis se incremente antes de la consulta a la BD y se devuelva una excepción HttpException(429) si attempts >= 7. |
| --- |

<!-- Tabla de origen: bloque 223 -->
| ID Defecto: DEF-BIODENTIS-02 (D-02) Título: Bloqueo en registro de pacientes presenciales por obligatoriedad indebida del campo Correo Electrónico Módulo Afectado: Recepción / Directorio de Pacientes y Agendamiento (HU05, HU14, CP07, Hallazgo H-04) Severidad: Media (Afecta la operatividad del canal presencial de recepción) Prioridad de Corrección: Alta (P2) Estado: Abierto (Open) Responsable: Desarrollador Frontend y Backend Entorno: http://localhost:3000/reception/patients (Modal "Nuevo Paciente") Pasos para Reproducir: Iniciar sesión con rol Recepcionista (recepcion@biodentis.com). Ir al menú lateral Pacientes y hacer clic en el botón superior + Nuevo Paciente. Ingresar Nombres (Saul), Apellidos (Montes), Teléfono (+51 952 678 523) y Dirección (Av. Brasil 123). Dejar el campo Correo Electrónico vacío o intentar omitirlo para simular un paciente presencial sin email (ej. adulto mayor). Observar la validación y pulsar Registrar paciente. Resultado Obtenido: El formulario marca error en rojo "Email inválido" debajo del input, exige una contraseña inicial de portal web y deshabilita el guardado. Es imposible registrar al paciente y, por consiguiente, no se le puede asignar una cita en la agenda de recepción. Resultado Esperado: Según la especificación del negocio (Criterio de Aceptación de HU14/HU05: "Si no cuenta con correo, ej. registro presencial sin email, el sistema omitirá el envío de forma transparente, sin generar errores ni afectar el flujo"), el campo correo electrónico y contraseña deben ser opcionales en el canal de recepción. El sistema debe permitir registrar al paciente únicamente con nombres, apellidos y teléfono para habilitar su cita inmediata en ventanilla. Solución Técnica: En el validador frontend y backend (src/validators/patient.schema.ts), modificar el esquema Zod:typescript email: z.string().email().optional().or(z.literal('')), password: z.string().min(8).optional().or(z.literal('')) En el modelo Prisma / PostgreSQL, asegurar que la columna email en la tabla Patient sea nullable (o generar un identificador interno único por DNI/Historia Clínica cuando no se provea email). En el modal de recepción, remover el asterisco de obligatoriedad (*) de los campos Correo Electrónico y Contraseña inicial, habilitándolos como exclusivos para pacientes que deseen acceso al portal web. |
| --- |

<!-- Tabla de origen: bloque 225 -->
| ID Defecto: DEF-BIODENTIS-03 (D-03) Título: Ausencia de guardia de rutas en el frontend: roles no administradores pueden renderizar la vista de gestión de usuarios /users Casos de Prueba Origen: CP12 (HU10 rol PATIENT) y CP14 (HU11 rol RECEPCIONISTA) Historia de Usuario afectada: HU10, HU11 Módulo Afectado: Frontend: Rutas protegidas del dashboard de Administración (/users, /dashboard/users, /admin/personal) Severidad: Alta: Vulnerabilidad de control de acceso (OWASP A01:2021 Broken Access Control). Un usuario no autorizado puede visualizar formularios de creación/edición de personal del sistema. Prioridad de Corrección: Alta (P1) Estado: Abierto (Open) Responsable: Desarrollador Frontend Entorno: http://localhost:3000 :Next.js (App Router o Pages Router) Pasos para Reproducir: Iniciar sesión con rol PATIENT (paciente@biodentis.com) o RECEPCIONISTA (recepcion@biodentis.com). Manipular la URL manualmente a /users o /dashboard/users. Observar que el componente se renderiza completamente, incluidos botones de «Nuevo Usuario» y formularios de edición. Resultado Obtenido: La vista de administración de usuarios se renderiza completa. El modal de «Nuevo Usuario» puede abrirse desde la UI. El backend sí responde con HTTP 403 al intentar cargar datos, pero el frontend no expulsa al usuario ni lo redirige. Resultado Esperado: Cualquier usuario sin rol ADMIN que acceda a la ruta /users debe ser redirigido automáticamente a su dashboard correspondiente o a una página de «No autorizado» (HTTP 403). Ningún componente de administración debe renderizarse. Solución Técnica Propuesta: Implementar un Route Guard / Middleware de roles en Next.js (usando middleware.ts o un HOC withRole(['ADMIN'])) que intercepte la navegación antes del renderizado. En next.config.js o en middleware.ts, verificar el claim role del JWT antes de servir cualquier página del segmento /admin/* o /dashboard/users. Redirigir con redirect('/unauthorized') o redirect('/dashboard') según el rol detectado. |
| --- |

<!-- Tabla de origen: bloque 228 -->
| ID Defecto: DEF-BIODENTIS-04 (D-04) Título: Desactivación de cuenta no muestra indicador de estado en la UI y el sistema no permite reactivar usuarios desactivados Caso de Prueba Origen: CP13 (HU11 Administración de usuarios del personal y horarios laborales) Historia de Usuario afectada: HU11 Módulo Afectado: Administración: Vista de gestión de usuarios (/admin/personal o /dashboard/users) Severidad: Media: La lógica de base de datos funciona correctamente (soft delete), pero la interfaz ofrece feedback insuficiente y bloquea la reactivación, afectando la operatividad del administrador. Prioridad de Corrección: Alta (P2) Estado: Abierto (Open) Responsable: Desarrollador Frontend Entorno: http://localhost:3000: Vista de administración de usuarios Pasos para Reproducir: Iniciar sesión con rol ADMINISTRADOR. Localizar al usuario castillo@biodentis.com en la lista de personal. Hacer clic en «Desactivar» y confirmar la acción. Observar la lista de usuarios: no hay indicador visual de cambio de estado. Buscar la opción para reactivar la cuenta: no existe en la interfaz. Resultado Obtenido: La API procesa la desactivación correctamente (isActive = false en BD). La interfaz no actualiza el badge/indicador de estado del usuario. No existe ningún botón o acción para reactivar una cuenta desactivada desde la UI. Resultado Esperado: Tras desactivar, el usuario debe aparecer con un badge «Inactivo» (gris/rojo) en la lista. Debe existir una acción «Reactivar» para los usuarios con estado inactivo. Ambas acciones deben mostrar un mensaje de confirmación y resultado (Toast de éxito/error). Solución Técnica Propuesta: En el componente de lista de usuarios, leer el campo isActive y renderizar condicionalmente un badge de estado. Agregar el botón «Reactivar» visible solo cuando isActive === false, que llame al endpoint PATCH /api/users/:id/activate. Tras cada acción (desactivar/reactivar), refrescar el estado local del componente (re-fetch o actualización optimista). |
| --- |

<!-- Tabla de origen: bloque 232 -->
| ID Defecto: DEF-BIODENTIS-05 (D-05) Título: El correo de recuperación de contraseña no se entrega a usuarios externos por restricción del plan gratuito del proveedor Resend (HTTP 403) Caso de Prueba Origen: CP15 (HU07:Registro y recuperación de contraseña) Historia de Usuario afectada: HU07 Módulo Afectado: Backend: Servicio de correo / Recuperación de contraseña (/api/auth/forgot-password) Severidad: Alta: El flujo de recuperación de contraseña está completamente bloqueado para cualquier usuario cuyo email no sea el del propietario de la cuenta Resend. Fallo funcional bloqueante que impide el acceso al sistema a usuarios que olvidaron su contraseña. Prioridad de Corrección: Alta (P1) Estado: Abierto (Open) Responsable: Desarrollador Backend / DevOps Entorno: http://localhost:3000: Servicio de correo usando Resend (plan gratuito/sandbox) Pasos para Reproducir: Ir a la vista de login y hacer clic en «¿Olvidaste tu contraseña?». Ingresar el correo samicast02@gmail.com (usuario registrado). Hacer clic en enviar y revisar la respuesta del servidor en terminal. Resultado Obtenido: La interfaz muestra el mensaje «Si el email está registrado, recibirás instrucciones para restablecer tu contraseña», pero el servidor registra el error: [EMAIL_FAILED] statusCode: 403 "You can only send testing emails to your own email address". El correo nunca llega al destinatario. Los pasos 3 y 4 del flujo quedan bloqueados. Resultado Esperado: El usuario recibe un correo con el enlace de restablecimiento en un tiempo razonable (< 2 min), puede hacer clic en él, establecer una nueva contraseña e iniciar sesión con ella. Causa Raíz: El proveedor Resend en su plan gratuito/sandbox solo permite enviar correos a la dirección verificada del propietario de la cuenta. En entorno de pruebas, se debe configurar un dominio propio o utilizar una cuenta de prueba verificada. Solución Técnica Propuesta: Corto plazo (entorno de pruebas): Usar Ethereal Email (nodemailer.createTestAccount()) o Mailtrap como SMTP de pruebas, que interceptan el correo sin restricciones de destinatario. Largo plazo (producción): Verificar un dominio propio en Resend o migrar a un proveedor sin restricciones de sandbox (SendGrid, Amazon SES, Brevo). Separar la configuración del proveedor por variable de entorno (EMAIL_PROVIDER=resend\|mailtrap\|ethereal). |
| --- |

<!-- Tabla de origen: bloque 238 -->
| ID Defecto: DEF-BIODENTIS-06 (D-06) Título: Ausencia de cancelación en cascada de citas pendientes al desactivar odontólogo o modificar su horario Casos de Prueba Origen: CP26 (desactivación de cuenta — HU11) y CP27 (cambio de horario — HU11) Historia de Usuario afectada: HU11 — Administración de usuarios del personal y horarios laborales Módulo Afectado: Backend — Servicio de usuarios y servicio de horarios (user.service.ts, schedule.service.ts) / Base de datos — Tabla Appointment (ausencia de campo cancellationReason) Severidad: Alta — La cita queda en estado PENDING para un odontólogo que ya no asistirá, generando engaño al paciente y potencial conflicto operativo en la clínica. Prioridad de Corrección: Alta (P1) Estado: Abierto (Open) Responsable: Desarrollador Backend Entorno: http://localhost:3000 / Base de datos PostgreSQL (Prisma) Pasos para Reproducir: Verificar que el odontólogo tiene al menos una cita en estado PENDING para una fecha futura. Escenario A: Desactivar la cuenta del odontólogo desde el panel de administración. Escenario B: Editar el horario del odontólogo eliminando el día en que la cita está agendada. Revisar en Prisma Studio el estado de la cita afectada. Resultado Obtenido: La cita permanece en estado PENDING en ambos escenarios. No se registra motivo de cancelación. La interfaz no advierte al administrador sobre el conflicto. Resultado Esperado: El sistema debe ejecutar una transacción que cancele automáticamente todas las citas PENDING afectadas, registrando el motivo genérico: "Su odontólogo, lamentablemente, no se encuentra disponible." Solución Técnica Propuesta: En user.service.ts, dentro de la transacción de desactivación, agregar: prisma.appointment.updateMany({ where: { dentistId, status: 'PENDING', date: { gte: new Date() } }, data: { status: 'CANCELLED', cancellationReason: 'Su odontólogo...' } }). En schedule.service.ts, tras actualizar el horario, comparar las citas PENDING del odontólogo con el nuevo rango de disponibilidad y cancelar las que queden fuera. Ejecutar migración Prisma para agregar el campo cancellationReason String? a la tabla Appointment. |
| --- |

<!-- Tabla de origen: bloque 241 -->
| ID Defecto: DEF-BIODENTIS-07 (D-07) Título: Los datos institucionales guardados en BD no se reflejan en el portal público y el formulario no muestra confirmación visual Caso de Prueba Origen: CP28 (HU12 — Configuración institucional) Historia de Usuario afectada: HU12 — Configuración institucional y calendario de excepciones/feriados Módulo Afectado: Frontend — Componentes del portal público (footer, sección contacto) / Formulario de configuración del panel admin Severidad: Media — La funcionalidad de configuración existe y persiste en BD, pero su propósito (ser la fuente de verdad del portal) no se cumple. El fallo de toast es Baja severidad adicional. Prioridad de Corrección: Alta (P2) Estado: Abierto (Open) Responsable: Desarrollador Frontend Entorno: http://localhost:3000 — Panel admin (/dashboard/config) y portal público Pasos para Reproducir: Iniciar sesión como ADMINISTRADOR y actualizar los datos institucionales en la vista de configuración. Abrir el portal en modo incógnito y navegar al footer o sección de contacto. Resultado Obtenido: El portal muestra los datos anteriores/hardcodeados. El formulario no muestra toast de confirmación. Resultado Esperado: El portal debe consumir dinámicamente el endpoint /api/config/clinic para mostrar siempre los datos actuales. El formulario debe mostrar un toast de éxito tras guardar. Solución Técnica Propuesta: En los componentes del portal público (footer, sección de contacto), reemplazar los datos hardcodeados por un fetch('/api/config/clinic') al momento de renderizar (SSR o CSR con SWR/React Query). En el onSubmit del formulario de configuración, agregar toast.success('Datos institucionales actualizados correctamente.') tras la respuesta exitosa de la API. |
| --- |

<!-- Tabla de origen: bloque 244 -->
| ID Defecto: DEF-BIODENTIS-08 (D-08) Título: Excepción de calendario no cancela automáticamente las citas pendientes en la fecha bloqueada Caso de Prueba Origen: CP30 (HU12 — Configuración institucional y calendario de excepciones) Historia de Usuario afectada: HU12 — Configuración institucional y calendario de excepciones/feriados Módulo Afectado: Backend — Servicio de excepciones de calendario (exception.service.ts) / Base de datos — Tabla Appointment (ausencia de campo cancellationReason) Severidad: Alta — Pacientes con citas en días bloqueados no son notificados y asistirán a la clínica en fechas no laborables. Prioridad de Corrección: Alta (P1) Estado: Abierto (Open) Responsable: Desarrollador Backend Entorno: http://localhost:3000 / Base de datos PostgreSQL (Prisma) Pasos para Reproducir: Verificar que existe al menos una cita PENDING para una fecha futura específica (ej. 15/11/2026). Crear una excepción de calendario que cubra esa fecha desde el panel de administración. Revisar en Prisma Studio el estado de la cita afectada. Resultado Obtenido: La cita permanece en estado PENDING. El sistema no muestra advertencia sobre el conflicto. No existe campo cancellationReason en la tabla Appointment. Resultado Esperado: Al crear la excepción, el backend debe identificar todas las citas PENDING cuya fecha esté dentro del rango bloqueado y actualizarlas a CANCELLED con el motivo: "Lo sentimos, pero esta fecha ya no está disponible para atención de pacientes." Solución Técnica Propuesta: En exception.service.ts, tras guardar la excepción, ejecutar: prisma.appointment.updateMany({ where: { date: { gte: startDate, lte: endDate }, status: 'PENDING' }, data: { status: 'CANCELLED', cancellationReason: 'Lo sentimos...' } }). Esta solución también requiere la migración Prisma para agregar cancellationReason (compartida con D-06). |
| --- |

<!-- Tabla de origen: bloque 247 -->
| ID Defecto: DEF-BIODENTIS-09 (D-09) Título: Desfase de un día en la visualización de la fecha de la cita en el portal del paciente (Timezone Bug) Caso de Prueba Origen: CP32 (HU03 — Agendamiento de citas en línea) Historia de Usuario afectada: HU03 — Agendamiento de citas en línea por el paciente Módulo Afectado: Frontend — Componente de historial/tarjeta de cita del paciente (renderizado de fechas) Severidad: Alta — El paciente visualiza una fecha incorrecta para su cita, lo que puede provocar que asista a la clínica el día equivocado. Prioridad de Corrección: Alta (P1) Estado: Abierto (Open) Responsable: Desarrollador Frontend Entorno: http://localhost:3000 — Portal del paciente (vista de historial de citas) Pasos para Reproducir: Iniciar sesión como PATIENT y agendar una cita para cualquier fecha futura. Revisar el historial de citas en el portal del paciente. Comparar la fecha mostrada en el portal con la fecha almacenada en Prisma Studio. Resultado Obtenido: El portal muestra la fecha con un desfase de -1 día respecto a la fecha real almacenada en la BD. Resultado Esperado: La fecha mostrada en el portal debe coincidir exactamente con la fecha seleccionada por el paciente al agendar. Solución Técnica Propuesta: En el componente que renderiza la fecha, utilizar new Date(dateString + 'T00:00:00') o parsear con date-fns/parseISO para evitar la conversión UTC automática. Alternativamente, formatear con format(parseISO(date), 'dd/MM/yyyy', { locale: es }) de date-fns, que respeta la fecha sin ajuste de zona horaria. |
| --- |

<!-- Tabla de origen: bloque 250 -->
| ID Defecto: DEF-BIODENTIS-10 (D-10) Título: Ausencia de validación de longitud mínima en el campo "Notas" del formulario de agendamiento cuando tiene contenido Caso de Prueba Origen: CP33 (HU03 — Agendamiento de citas en línea) Historia de Usuario afectada: HU03 — Agendamiento de citas en línea por el paciente Módulo Afectado: Frontend — Formulario de nueva cita / Backend — Validador Zod (src/validators/appointment.schema.ts) Severidad: Baja — No bloquea el flujo principal, pero compromete la calidad de la información clínica disponible para el odontólogo. Prioridad de Corrección: Media (P3) Estado: Abierto (Open) Responsable: Desarrollador Frontend y Backend Entorno: http://localhost:3000 — Modal de nueva cita (portal del paciente) Pasos para Reproducir: Iniciar sesión como PATIENT y abrir el formulario de nueva cita. Completar todos los campos obligatorios e ingresar "dolor" (5 caracteres) en el campo Notas. Hacer clic en "Crear Cita" y verificar si se muestra alguna validación. Resultado Obtenido: El sistema acepta el texto corto sin advertencia y registra la cita con la nota incompleta. Resultado Esperado: Si el campo Notas tiene contenido, debe validarse que tenga al menos 10 caracteres, mostrando el mensaje: "El motivo debe tener al menos 10 caracteres." Solución Técnica Propuesta: En appointment.schema.ts, modificar el campo: notes: z.string().min(10, 'El motivo debe tener al menos 10 caracteres.').optional().or(z.literal('')). En el formulario frontend, agregar la validación equivalente con react-hook-form y mostrar el mensaje de error bajo el campo. |
| --- |

<!-- Tabla de origen: bloque 253 -->
| ID Defecto: DEF-BIODENTIS-11 (D-11) Título: El selector de pacientes no carga datos en el agendamiento presencial y no existe flujo para pacientes sin cuenta de usuario Casos de Prueba Origen: CP39 (HU02 Registro presencial) y CP43 (HU05 Paciente sin cuenta) Historias de Usuario afectadas: HU02, HU05 Módulo Afectado: Frontend Modal de nueva cita presencial (selector de pacientes) / Backend Endpoint de listado de pacientes para recepción / Modelo de datos — Campo patientId en tabla Appointment Severidad: Alta El flujo de agendamiento presencial está completamente bloqueado. El recepcionista no puede registrar ninguna cita, impidiendo la operación básica del canal presencial de la clínica. Prioridad de Corrección: Alta (P1) Estado: Abierto (Open) Responsable: Desarrollador Frontend y Backend Entorno: http://localhost:3000 Panel de recepción / Modal de nueva cita Pasos para Reproducir: Iniciar sesión con rol RECEPCIONISTA. Ir a la sección de Citas y hacer clic en "Nueva Cita". Hacer clic en el selector de pacientes y verificar que la lista no carga. Buscar la opción de "Paciente invitado" o formulario para datos básicos: no existe. Resultado Obtenido: El selector de pacientes muestra solo el placeholder vacío. No existe opción para registrar pacientes sin cuenta. El botón "Crear Cita" permanece deshabilitado. Resultado Esperado: El selector debe cargar la lista de pacientes registrados desde la API. Adicionalmente, debe existir una opción "Paciente sin cuenta" que despliegue un formulario básico (Nombre, Apellido, Teléfono) para vincular al paciente directamente a la cita sin crear credenciales de portal. Solución Técnica Propuesta: Verificar el endpoint GET /api/patients y asegurar que el rol RECEPCIONISTA tiene permisos de lectura. Revisar la llamada en el componente frontend (token en headers, URL correcta). Hacer patientId nullable en el modelo Prisma (patientId String?) o crear una entidad GuestPatient con los campos básicos. Agregar al modal la opción "Paciente sin cuenta" que muestre inputs manuales de Nombre, Apellido y Teléfono cuando se selecciona. |
| --- |

<!-- Tabla de origen: bloque 256 -->
| ID Defecto: DEF-BIODENTIS-12 (D-12) Título: Filtros avanzados de la bandeja de citas incompletos: ausencia de filtro por fecha y por nombre/documento del paciente Caso de Prueba Origen: CP45 (HU05 — Filtros de la bandeja de gestión de citas) Historia de Usuario afectada: HU05 — Gestión y transacción de citas en recepción Módulo Afectado: Frontend — Componente de bandeja de citas (/dashboard/appointments) / Backend — Consulta de filtrado de citas Severidad: Media — El flujo básico de gestión de citas funciona, pero los filtros de fecha y paciente son necesarios para la operación diaria eficiente del recepcionista. Prioridad de Corrección: Media (P2) Estado: Abierto (Open) Responsable: Desarrollador Frontend y Backend Entorno: http://localhost:3000/dashboard/appointments Pasos para Reproducir: Iniciar sesión con rol RECEPCIONISTA. Ir a la bandeja de gestión de citas. Intentar filtrar por una fecha específica: no existe el campo DatePicker. Intentar buscar citas por nombre del paciente: el buscador solo filtra por odontólogo. Resultado Obtenido: Solo están disponibles los filtros por Estado y Odontólogo. No hay DatePicker ni búsqueda por paciente. Resultado Esperado: La bandeja debe ofrecer: (1) un selector de fecha o rango temporal (DatePicker); y (2) un campo de búsqueda por nombre o DNI del paciente, independiente del campo de búsqueda por odontólogo. Solución Técnica Propuesta: Agregar un componente DatePicker (ej. react-datepicker o el nativo de shadcn/ui) al panel de filtros que envíe el parámetro date al endpoint de listado. Agregar un campo de texto "Buscar por paciente" que llame al endpoint con el parámetro patientName o patientDni, actualizando la consulta backend para incluir un WHERE patient.name ILIKE '%term%'. |
| --- |

<!-- Tabla de origen: bloque 259 -->
| ID Defecto: DEF-BIODENTIS-13 (D-13) Título: Flujo de cancelación de citas en recepción sin modal de motivo, sin validación de longitud mínima y sin doble confirmación Casos de Prueba Origen: CP46 (HU05 — Cancelar con motivo válido) y CP47 (HU05 — Motivo de cancelación muy corto) Historia de Usuario afectada: HU05 — Gestión y transacción de citas en recepción Módulo Afectado: Frontend — Botón "X" (Cancelar) en la tabla de citas / Backend — Endpoint de cancelación (PATCH /api/appointments/:id/cancel) / Modelo de datos — Campo cancellationReason en tabla Appointment Severidad: Alta — La cancelación sin motivo ni confirmación expone el sistema a cancelaciones accidentales irrecuperables y elimina la trazabilidad de auditoría requerida por la operación de la clínica. Prioridad de Corrección: Alta (P1) Estado: Abierto (Open) Responsable: Desarrollador Frontend y Backend Entorno: http://localhost:3000/dashboard/appointments Pasos para Reproducir: Iniciar sesión con rol RECEPCIONISTA. Localizar una cita PENDING en la bandeja. Hacer clic en el botón "X" (Cancelar). Verificar si aparece modal con campo de motivo y diálogo de confirmación. Resultado Obtenido: La cita se cancela instantáneamente. No hay modal, no hay campo de motivo, no hay confirmación. En Prisma Studio, el campo de motivo queda vacío. Resultado Esperado: Al hacer clic en "Cancelar", debe abrirse un modal con: (1) un textarea para el motivo (mínimo 25 caracteres); (2) un diálogo de confirmación con la pregunta "¿Está seguro que desea cancelar la cita del [Fecha] del paciente [Nombre]?"; y (3) solo tras la confirmación, procesar la cancelación y guardar el motivo en la base de datos. Solución Técnica Propuesta: Reemplazar la acción directa del botón "X" por la apertura de un modal de confirmación con useState o un componente de diálogo (ej. AlertDialog de shadcn/ui). Dentro del modal, incluir un textarea vinculado a un estado de motivo con validación minLength(25). En el endpoint PATCH /api/appointments/:id/cancel, agregar validación Zod: reason: z.string().min(25, 'El motivo debe tener al menos 25 caracteres.'). Ejecutar migración Prisma para agregar cancellationReason String? a la tabla Appointment (migración compartida con D-06 y D-08). |
| --- |

<!-- Tabla de origen: bloque 262 -->
| ID Defecto: DEF-BIODENTIS-14 (D-14) Título: Filtros disfuncionales, omisión de estados operativos y carencia de controles de navegación temporal en la agenda médica Caso de Prueba Origen: CP50 (HU13- Consultas de agenda del personal odontológico) Historia de Usuario afectada: HU13 - Consultas de agenda del personal odontológico Módulo Afectado: Frontend- Vista de Agenda del Odontólogo (/dashboard/agenda o /agenda) / Componente de filtros y calendario médico Severidad: Media - La seguridad de acceso a los datos funciona (el doctor no ve citas de otros colegas), pero la interfaz degrada sustancialmente la gestión operativa diaria al no permitir buscar pacientes, filtrar por fechas ni visualizar citas pendientes. Prioridad de Corrección: Alta (P2) Estado: Abierto (Open) Responsable: Desarrollador Frontend Entorno: http://localhost:3000/dashboard/agenda Pasos para Reproducir: Iniciar sesión con un usuario que posea el rol DENTIST (carlos.martinez@biodentis.com). Ingresar a la opción "Agenda" desde el menú de navegación. Inspeccionar el campo de búsqueda de texto superior (observar el texto placeholder y la propiedad que filtra). Desplegar el selector de estado de citas. Intentar cambiar la fecha hacia la próxima semana o mes mediante controles de navegación. Resultado Obtenido: El buscador indica "Buscar por odontólogo..." y no permite filtrar por paciente. El dropdown de estados solo contiene "Todos", "Confirmada" y "Completada" (faltan "Pendiente" y "Cancelada"). No existe un selector de fechas (DatePicker) ni botones de flechas (<, >) o botón "Hoy" para navegar temporalmente. Resultado Esperado: El buscador debe indicar "Buscar por paciente o código..." y filtrar por los datos del paciente. El dropdown de estados debe incluir todas las opciones del ciclo de vida: Pendiente, Confirmada, Atendida/Completada y Cancelada. La interfaz debe incluir un DatePicker y botones de navegación temporal que permitan al odontólogo consultar citas de cualquier fecha pasada o futura. Solución Técnica Propuesta: Ajuste del buscador: En el componente de agenda del odontólogo, reconfigurar el input de búsqueda para que envíe el query param patientName o filtre localmente por appointment.patient.name. Completitud del dropdown: Actualizar el listado de opciones del selector de estado para incluir { label: 'Pendiente', value: 'PENDING' } y { label: 'Cancelada', value: 'CANCELLED' }. Controles de navegación: Implementar en el encabezado del calendario un botón "Hoy" y flechas anterior/siguiente que actualicen el estado currentDate sumando o restando un día, semana o mes según la vista activa, agregando además un componente DatePicker de tipo popover. |
| --- |

## 5. Matriz de Trazabilidad Requisito - Caso de Prueba - Defecto (IEEE 29148)

Esta matriz demuestra que cada funcionalidad crítica cuenta con respaldo de prueba y registra el defecto identificado:

<!-- Tabla de origen: bloque 268 -->
| Historia de Usuario | Criterio de Aceptación Clave | ID Caso Suite | Descripción del Caso | Resultado de Ejecución | Defecto Asociado | Estado del Defecto |
| --- | --- | --- | --- | --- | --- | --- |
| HU10 - Inicio de sesión según rol | CA01: Redirección y menú según perfil de usuario autenticado. | CP01 | Login exitoso con rol Admin | PASSED | N/A | N/A |
| HU10 - Inicio de sesión según rol | CA02: Bloqueo de acceso y mensaje genérico de credenciales. | CP02 | Login con credenciales erróneas | PASSED | N/A | N/A |
| HU10 - Inicio de sesión según rol | CA06: Bloqueo temporal tras intentos fallidos (Anti-fuerza bruta). | CP03 | Bloqueo por fuerza bruta | FAILED | D-01 | Abierto |
| HU10 - Inicio de sesión según rol | CA: Restricción de acceso por rol (RBAC) en frontend | CP12 | Acceso a /users con rol PATIENT | FAILED | D-03 | Abierto |
| HU01 - Consulta de servicios | CA01: Catálogo público con precios y duración estimada. | CP04 | Catálogo de servicios web | PASSED | N/A | N/A |
| HU03 - Agendamiento en línea | CA01: Registro con triaje y reserva de bloque libre. | CP05 | Agendamiento en línea con triaje | PASSED | N/A | N/A |
| HU03 - Agendamiento en línea | CA03: Anticolisión en solicitudes simultáneas. | CP06 | Control de concurrencia | PASSED | N/A | N/A |
| HU05 / HU14 - Atención en recepción | CA: Registro rápido presencial y soporte a pacientes sin correo. | CP07 | Registro de paciente y cita presencial | FAILED | D-02 | Abierto |
| HU06 - Registro de nota clínica | CA01: Nota clínica obligatoria para cerrar consulta (Atendida). | CP08 | Registro de nota clínica | PASSED | N/A | N/A |
| HU04 - Notificaciones de citas | CA01: Disparador de confirmación por correo electrónico. | CP09 | Envío de correo de confirmación | PASSED | N/A | N/A |
| HU14 - Reportes de gestión | CA02: Exportación de métricas en formatos PDF y Excel. | CP10 | Exportación de reportes | PASSED | N/A | N/A |
| HU11 - Administración de personal | CA: Desactivación lógica con feedback y reactivación | CP13 | Desactivación lógica de cuenta de personal | FAILED | D-04 | Abierto |
| HU11 - Administración de personal | CA: Solo ADMIN gestiona personal | CP14 | Acción de personal con rol Recepcionista | FAILED | D-03 | Abierto |
| HU07 - Recuperación de contraseña | CA: Flujo de restablecimiento E2E | CP15 | Restablecer contraseña y volver a ingresar | FAILED | D-05 | Abierto |
| HU11 - Administración de personal | CA: Cancelación automática de citas al desactivar odontólogo | CP26 | Desactivar odontólogo con citas pendientes | FAILED | D-06 | Abierto |
| HU11 - Administración de personal | CA: Cancelación automática de citas al modificar horario | CP27 | Cambio de horario con conflicto de citas | FAILED | D-06 | Abierto |
| HU12 - Configuración institucional | CA: Datos institucionales reflejados en portal público | CP28 | Configurar datos institucionales de la clínica | FAILED | D-07 | Abierto |
| HU12 - Excepciones de calendario | CA: Cancelación automática de citas en fecha bloqueada | CP30 | Excepción de calendario sobre fecha con citas | FAILED | D-08 | Abierto |
| HU03 - Agendamiento en línea | CA: Fecha de cita mostrada correctamente al paciente | CP32 | Agendar cita en línea válida | FAILED | D-09 | Abierto |
| HU03 - Agendamiento en línea | CA: Validación de longitud mínima en campo Notas | CP33 | Triaje con motivo/nota demasiado corto | FAILED | D-10 | Abierto |
| HU02 - Registro de citas en recepción | CA: Selección de paciente existente en agendamiento presencial | CP39 | Registro presencial válido | FAILED | D-11 | Abierto |
| HU05 - Gestión de citas en recepción | CA: Registro de cita para paciente sin cuenta de usuario | CP43 | Paciente sin cuenta de usuario | FAILED | D-11 | Abierto |
| HU05 - Gestión de citas en recepción | CA: Filtros avanzados por fecha y nombre/DNI de paciente | CP45 | Filtros de la bandeja de citas | FAILED | D-12 | Abierto |
| HU05 - Gestión de citas en recepción | CA: Flujo de cancelación controlada con motivo válido | CP46 | Cancelar cita con motivo válido | FAILED | D-13 | Abierto |
| HU05 - Gestión de citas en recepción | CA: Validación de longitud mínima del motivo de cancelación | CP47 | Motivo de cancelación muy corto | FAILED | D-13 | Abierto |
| HU13 - Consultas de agenda del personal | CA: Visualización de agenda propia con filtros por estado, paciente y navegación temporal (día/semana/mes). | CP50 | Agenda propia del odontólogo | FAILED | D-14 | Abierto |

## 6. Análisis de Riesgos Pendientes

Se analizan los riesgos del proyecto a partir de la ejecución de la suite de pruebas, la brecha de cobertura y los defectos abiertos:

<!-- Tabla de origen: bloque 274 -->
| Código Riesgo: R-01 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Alta | Severidad | Alta |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Ataques automatizados de diccionario y fuerza bruta | Defecto abierto D-01 no mitigado en el endpoint /api/auth/login. |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Alto riesgo de vulneración de contraseñas de pacientes y administradores. | Implementar de inmediato el fix en rate-limit.ts aplicando ventana móvil de 15 minutos e incorporar prueba unitaria específica en Vitest. |  |  |

<!-- Tabla de origen: bloque 276 -->
| Código Riesgo: R-02 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Media | Severidad | Media |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Brecha de cobertura en validación de tasa de peticiones | Archivo rate-limit.ts con apenas 48.5 % de líneas cubiertas. |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Posibles comportamientos no probados ante reinicios del servidor o múltiples IPs. | Crear mocks de peticiones HTTP en Vitest para alcanzar al menos el 85 % de cobertura exigido en seguridad. |  |  |

<!-- Tabla de origen: bloque 278 -->
| Código Riesgo: R-03 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Media | Severidad | Media |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Dependencia de servicios externos de correo (SMTP) | El caso CP09 depende del servidor de correos para las notificaciones de citas. |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Fallas externas podrían encolar peticiones y degradar el tiempo de respuesta. | Implementar patrón de cola en segundo plano (BullMQ o Worker asíncrono) con reintentos automáticos. |  |  |

<!-- Tabla de origen: bloque 280 -->
| Código Riesgo: R-04 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Alta | Severidad | Alta |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Exclusión de pacientes y bloqueo del canal presencial | Defecto abierto D-02 en el modal de recepción (H-04). |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Pérdida de citas en ventanilla y quejas de pacientes sin correo electrónico (brecha de accesibilidad ODS 10). | Modificar esquema Zod (patient.schema.ts) y migración Prisma para admitir email opcional en altas de recepción. |  |  |

<!-- Tabla de origen: bloque 283 -->
| Código Riesgo: R-05 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Alta | Severidad | Alta |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Exposición de interfaces administrativas a usuarios no autorizados mediante manipulación de URL. | Ausencia de guardia de rutas (middleware de roles) en el frontend Next.js (D-03). |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Un usuario malintencionado puede observar estructuras de datos del personal y formularios de creación de cuentas, comprometiendo la confidencialidad del sistema. | Implementar middleware.ts con validación de rol antes del renderizado de rutas protegidas. |  |  |

<!-- Tabla de origen: bloque 285 -->
| Código Riesgo: R-06 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Media | Severidad | Media |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Administradores sin posibilidad de reactivar cuentas de personal desactivadas. | Ausencia de acción de reactivación en la UI (D-04). |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Un odontólogo dado de baja temporalmente no puede ser reactivado sin intervención directa en base de datos. | Agregar botón de reactivación en la vista de gestión de usuarios. |  |  |

<!-- Tabla de origen: bloque 288 -->
| Código Riesgo: R-07 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Alta | Severidad | Alta |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Flujo de recuperación de contraseña no funcional en entorno de pruebas y potencialmente en producción. | Restricción del proveedor Resend en plan gratuito (D-05). |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Cualquier usuario que olvide su contraseña queda sin acceso al sistema permanentemente. | Migrar a Mailtrap/Ethereal en pruebas y verificar dominio propio en Resend para producción. |  |  |

<!-- Tabla de origen: bloque 290 -->
| Código Riesgo: R-08 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Alta | Severidad | Alta |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Citas huérfanas en estado PENDING para odontólogos desactivados o días bloqueados, con pacientes que se presentarán a la clínica sin atención garantizada. | Defectos abiertos D-06 y D-08. La lógica de cancelación en cascada no está implementada en el backend, y la tabla Appointment no posee el campo cancellationReason. |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Genera conflictos operativos reales: pacientes que asisten a la clínica en fechas o con odontólogos no disponibles, con riesgo de pérdida de confianza y reclamos. | Implementar transacciones de cancelación en cascada en user.service.ts, schedule.service.ts y exception.service.ts, y ejecutar la migración Prisma para agregar el campo cancellationReason. |  |  |

<!-- Tabla de origen: bloque 292 -->
| Código Riesgo: R-09 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Media | Severidad | Media |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Portal público desactualizado mostrando información institucional incorrecta a los pacientes, aunque el administrador ya haya realizado actualizaciones. | Defecto abierto D-07. Los componentes del portal usan datos hardcodeados en lugar de consumir la API de configuración. |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Genera desconfianza en los pacientes y puede provocar que contacten al consultorio con datos incorrectos (teléfono/dirección desactualizados). | Refactorizar los componentes del portal público (footer, contacto) para consumir dinámicamente el endpoint /api/config/clinic. |  |  |

<!-- Tabla de origen: bloque 294 -->
| Código Riesgo: R-10 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Alta | Severidad | Alta |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Pacientes que visualizan la fecha de su cita con un desfase de un día y se presentan a la clínica el día incorrecto. | Defecto abierto D-09. Error de zona horaria (UTC-5 Lima) en el componente frontend de renderizado de fechas. |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Genera pérdida de tiempo del paciente, conflictos de agenda y desconfianza en la plataforma. | Corregir el parseo de fechas en el componente de historial de citas usando date-fns/parseISO o añadiendo la sufijo de zona horaria al string de fecha. |  |  |

<!-- Tabla de origen: bloque 296 -->
| Código Riesgo: R-11 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Media | Severidad | Baja |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Notas clínicas con información insuficiente (menos de 10 caracteres) que llegan al odontólogo sin contexto útil para preparar la consulta. | Defecto abierto D-10. Validación de longitud mínima ausente en frontend y backend (Zod). |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| No bloquea el flujo de agendamiento, pero compromete la calidad clínica de la información del triaje. | Aplicar .min(10) condicional en el esquema Zod y en la validación del formulario frontend. |  |  |

<!-- Tabla de origen: bloque 299 -->
| Código Riesgo: R-12 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Alta | Severidad | Alta |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Paralización total del canal presencial de atención: el recepcionista no puede registrar ninguna cita para pacientes existentes ni para pacientes de paso sin cuenta. | Defecto abierto D-11. El selector de pacientes no carga datos y no existe el flujo de paciente invitado. |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| El módulo de recepción, uno de los flujos operativos más críticos del sistema, está completamente inoperativo. En un entorno de producción, esto obligaría al personal a volver a métodos manuales (WhatsApp, llamadas) para registrar citas, eliminando el valor central del sistema. | Corregir el endpoint de listado de pacientes para el rol RECEPCIONISTA y agregar el flujo de paciente invitado con patientId nullable en el modelo Prisma. |  |  |

<!-- Tabla de origen: bloque 301 -->
| Código Riesgo: R-13 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Media | Severidad | Media |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Dificultad operativa del recepcionista para localizar citas de un paciente o de un día específico en la bandeja, obligando a revisar manualmente toda la lista. | Defecto abierto D-12. Los filtros por fecha y por nombre de paciente no están implementados. |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| En una clínica con alto volumen de citas diarias, la ausencia de estos filtros genera ineficiencia operativa y aumenta la probabilidad de errores en la gestión de la agenda. | Implementar el DatePicker y el campo de búsqueda por paciente en el componente de bandeja, con los parámetros de filtro correspondientes en el endpoint backend. |  |  |

<!-- Tabla de origen: bloque 304 -->
| Código Riesgo: R-14 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Alta | Severidad | Alta |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Cancelaciones accidentales irrecuperables de citas por parte del recepcionista sin posibilidad de auditoría ni notificación al paciente con el motivo real. | Defecto abierto D-13. El flujo de cancelación no tiene modal, no solicita motivo y no tiene doble confirmación. |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Un solo clic erróneo cancela permanentemente una cita sin dejar rastro del motivo. El paciente no recibe explicación de la cancelación, y la clínica no puede auditar qué recepcionista canceló qué cita ni por qué razón. | Implementar el modal de cancelación con campo de motivo (mínimo 25 caracteres), diálogo de doble confirmación y validación en backend (Zod). Agregar migración Prisma para el campo cancellationReason (compartida con D-06 y D-08). |  |  |

<!-- Tabla de origen: bloque 307 -->
| Código Riesgo: R-15 |  |  |  |
| --- | --- | --- | --- |
| Probabilidad | Alta | Severidad | Media |
| Descripción del Riesgo | Causa Raíz / Origen |  |  |
| Ineficiencia y sobrecarga operativa del odontólogo durante la jornada clínica al no poder identificar pacientes en espera ni planificar consultas futuras. | Defecto abierto D-14. La interfaz de agenda médica no ofrece filtros por paciente ni por fecha, y oculta citas en estado "Pendiente". |  |  |
| Impacto en Calidad | Plan de Mitigación / Acción Correctiva |  |  |
| Aunque no compromete la base de datos ni vulnera la privacidad de otros doctores, entorpece severamente el trabajo clínico diario: el odontólogo no puede verificar si tiene pacientes pendientes por atender en ventanilla ni buscar el historial inmediato de un paciente específico sin ayuda del recepcionista. | Modificar el componente de agenda (/dashboard/agenda) incorporando el selector de estados completo, el buscador adaptado al paciente y los controles de paginación temporal/DatePicker en el próximo Sprint. |  |  |

