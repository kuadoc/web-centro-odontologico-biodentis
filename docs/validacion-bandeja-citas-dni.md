# Bandeja de citas: filtros y columna DNI

Fecha: 2026-11-06. Cambio funcional separado del refactor de `create()`.

## Clasificación del hallazgo inicial

Esta tabla registra el estado encontrado antes de implementar DNI y los filtros.
La actualización posterior se describe al final del documento.

| Observación | Evidencia | Clasificación |
|---|---|---|
| Estado y texto de odontólogo se combinan | `apps/web/app/(dashboard)/appointments/page-content.tsx`: `filteredAppointments` aplica ambos criterios | Comportamiento implementado; sin defecto confirmado en esta revisión estática |
| Falta filtro de fecha o rango en la bandeja | HU-04, criterio 2 (`HU-biodentis.md:47`), y HU-12, criterio 3 (`HU-biodentis.md:238`); la UI no tiene controles de filtrado temporal | Defecto funcional por requisito incompleto. No es una regresión demostrada del refactor |
| Falta DatePicker concreto | Los requisitos exigen filtrar por fecha, sin imponer una biblioteca o componente concreto | La ausencia del componente por sí sola no es el defecto; lo es la falta de filtrado temporal |
| Buscador de citas solo encuentra odontólogos | `dentistSearch` compara exclusivamente el nombre del odontólogo | Limitación confirmada. Buscar pacientes en esta bandeja es una mejora mientras no se establezca ese criterio específico |
| No existía DNI persistido ni búsqueda por DNI de pacientes | HU-10 (`HU-biodentis.md:111` y `:224`) exige buscar pacientes por nombre/DNI; el modelo anterior solo tenía `patientCode` | Defecto funcional de HU-10. `patientCode` no equivale al DNI |
| Añadir columna DNI en citas | Petición de esta tarea; no se encontró una exigencia previa de esa columna en las HU revisadas | Ampliación de presentación, sustentada por el nuevo dato administrativo |

La búsqueda por nombre/DNI de HU-10 corresponde al directorio administrativo de
pacientes. No se atribuye automáticamente ese requisito a todos los buscadores.

## Cambio implementado en el código

- Columna DNI después de Paciente en citas y dato equivalente en las tarjetas móviles.
- Los pacientes sin DNI muestran «Sin registrar».
- Campo DNI opcional al crear o editar pacientes desde el directorio administrativo.
- Validación compartida: ocho dígitos; se conservan ceros iniciales y se recortan
  espacios. Un campo vacío se convierte en `null`; omitirlo en una edición conserva
  el valor existente.
- Persistencia de DNI en pacientes y selección explícita en listado y detalle de citas.
- Consulta por DNI en el directorio de pacientes manteniendo sus restricciones de rol
  y alcance; invalidación de citas al actualizar datos de un paciente.
- Modelo Prisma con `User.dni` nullable y script SQL aditivo preparado.

En la primera entrega de DNI, el buscador de la bandeja continuaba dedicado al
odontólogo y no se habían añadido filtros temporales. Posteriormente el usuario
autorizó ambos cambios; su implementación figura en la sección final. Los resultados
históricos del refactor de citas permanecen en su documento original.

## Migración de base de datos aplicada

El 2026-11-06, tras la autorización del usuario, se aplicó la columna `users.dni`
en la base local configurada. El primer intento falló con P1001 porque PostgreSQL
estaba detenido. Se inició Docker Desktop y el contenedor existente
`next-monorepo-postgres-1`, conservando su volumen, y se repitió el comando con éxito.
No se recreó la base ni se modificaron documentos de pacientes.

Script revisable: `apps/web/prisma/patient-dni-upgrade.sql`:

```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dni" VARCHAR(8);
```

Comando ejecutado desde la raíz, con código de salida 0:

```powershell
pnpm --filter web db:patient-dni
```

Prisma confirmó `Script executed successfully.`. El comando añade solo la columna
nullable. Los pacientes existentes no reciben
documentos inventados ni se convierten sus códigos internos en DNI. No se usa
`db push`, ni se ejecuta una sincronización general del esquema.

Este repositorio mantiene actualizaciones SQL manuales y no dispone de un historial
de `prisma/migrations`. Se utilizó ese mecanismo existente; no se ejecutó
`prisma migrate dev` ni se inicializó un historial incompleto sobre la base existente.

Verificación posterior, únicamente de lectura:

- `information_schema`: columna `public.users.dni`, `character varying`, longitud 8,
  nullable (`YES`).
- Prisma: 19 pacientes existentes; ninguno tiene DNI registrado todavía.
- Consulta de `appointment.patient.dni` mediante Prisma: correcta.
- `pnpm --filter web db:generate`: código 0 tras aplicar el SQL.
- Servidor de desarrollo iniciado en `http://localhost:3000`.

## Verificación ejecutada

- 61 pruebas aprobadas: las 51 existentes de citas y 10 nuevas de DNI.
- Las pruebas nuevas cubren validación, omisión, borrado, ceros iniciales,
  persistencia de alta y edición, selección en citas y búsqueda con alcance.
- Pruebas automatizadas con BD y correo simulados. Además, se verificó en lectura
  la columna aplicada y una consulta real de Prisma contra la base local.
- `pnpm.cmd typecheck`: código 0; 4 tareas correctas.
- `pnpm.cmd lint`: código 0; 0 errores y 33 advertencias ajenas al cambio.
- Regeneración de cliente Prisma y build de `@biodentis/shared-types`: código 0.
- Sin comprobación visual en navegador en este paso.

## Validación visual

1. Abrir Pacientes con una cuenta ADMIN o RECEPTIONIST y editar un paciente.
2. Registrar su DNI de ocho dígitos, indicando el motivo de auditoría requerido.
3. Abrir Citas y comprobar la columna DNI junto al nombre de ese paciente.
4. Comprobar las tarjetas en tamaño móvil y un paciente sin documento registrado.
5. Buscar ese DNI en el directorio de Pacientes y comprobar que se conserva el
   alcance autorizado. La ampliación posterior también permite buscarlo en Citas.

## Actualización posterior: Date Range Picker y búsqueda de citas

Se implementó el rango de fechas y la búsqueda ampliada solicitados por el usuario.
Es un cambio funcional posterior a los refactors, sin cambios adicionales de BD.

- Componente compartido `packages/ui/src/components/date-range-picker.tsx`,
  construido con React Aria, dependencia ya instalada, y estilos del proyecto.
- Calendario desplegable en español con campos Desde/Hasta, entrada por teclado,
  navegación entre meses, selección del intervalo y mensaje de fechas inválidas.
- Presentación compacta: ancho de 288 px en escritorio, fechas en una sola fila
  y adaptación al ancho disponible en móvil. Desde/Hasta conservan sus etiquetas
  accesibles; se redujo el texto visible para dar más espacio al buscador.
- Filtro inclusivo: una cita del día Desde o del día Hasta forma parte del resultado.
  Seleccionar el mismo día en ambos extremos permite consultar un único día.
- Búsqueda por nombres/apellidos del paciente, nombres/apellidos del odontólogo o
  DNI completo/parcial. Ignora mayúsculas, tildes y espacios repetidos, conserva
  ceros iniciales y admite términos del nombre en distinto orden.
- Búsqueda, estado y rango se combinan; Limpiar filtros restablece todos.
- El filtrado opera sobre las citas ya autorizadas por la API, sin ampliar permisos.
  Compara la fecha civil de la cita, sin convertirla a la zona horaria del navegador.
- Corregido un caso de la paginación compartida: limpiar filtros podía recuperar
  la página antigua al volver a una clave previa. Ahora registra cada cambio de
  filtros y mantiene el reinicio en la primera página.

Archivos principales: `apps/web/lib/appointment-filters.ts`,
`apps/web/app/(dashboard)/appointments/page-content.tsx`, componente de calendario
y `packages/ui/src/hooks/use-pagination.ts`.

Verificación de esta actualización:

- 20 pruebas unitarias aprobadas: 10 de filtros y 10 de DNI.
- Prueba real de navegador `apps/web/tests/e2e/appointment-filters.cts` aprobada:
  búsqueda por las tres alternativas, filtro por calendario combinado con estado
  y DNI, cambio de página, reinicio y limpieza de filtros.
- Escritorio a 1440 px y móvil a 375/320 px; calendario sin desborde horizontal.
- Checks finales: `pnpm.cmd typecheck` con código 0 (4 tareas correctas, 21.081 s)
  y `pnpm.cmd lint` con código 0 (0 errores, las mismas 33 advertencias ajenas,
  25.493 s).
- Cuenta de prueba temporal eliminada al finalizar. Las citas son fixtures
  interceptadas en el navegador; no se modifican pacientes ni citas de la base.

Comandos para repetir desde `apps/web`:

```powershell
node --require tsx/cjs --test tests/unit/appointment-filters.test.cts tests/unit/patient-dni.test.cts
node --env-file=.env --require tsx/cjs tests/e2e/appointment-filters.cts
```

El segundo comando requiere PostgreSQL, el servidor local y Chrome. Crea una cuenta
temporal para el login y la elimina junto con sus sesiones al terminar.
