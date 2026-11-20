# RF-DISP-01 — Disponibilidad de horarios

## Estado y objetivo

**Pasos 1 y 2 realizados: suite de caracterización y refactorización del servicio.**
Las mismas 11 pruebas pasan antes y después del cambio, sin modificar sus
expectativas. Esto acredita los escenarios ejecutados, no la totalidad del sistema.

Objetivo: reorganizar la generación y el filtrado de bloques de disponibilidad
en métodos pequeños del servicio existente, conservando los resultados,
errores, orden de bloques y contratos de la API. La suite permite comparar
los resultados observables antes y después del cambio.

## Problema y alcance

`getAvailableSlots()` coordina la consulta del tratamiento, la selección del día
de atención, la consulta de excepciones, la generación de bloques y el filtrado
de citas ocupadas y horarios pasados. El acceso a Prisma ya está separado en
`AvailabilityRepository`; no se propone crear otra capa de persistencia.

Archivos de referencia:

- [Servicio actual](../apps/web/modules/availability/availability.service.ts).
- [Repositorio actual](../apps/web/modules/availability/availability.repository.ts).
- [Ruta HTTP](../apps/web/app/api/dentists/[id]/availability/route.ts).
- [Historias de usuario](../HU-biodentis.md): HU-02, HU-03 y HU-09.
- [Integración existente de catálogo](../apps/web/tests/integration/catalog.test.cts):
  comprueba duración de 45 minutos y exclusión de citas ocupadas utilizando BD.
  Esta integración no se ejecutó en este paso.

El paso 1 añade
[pruebas específicas del servicio](../apps/web/tests/availability/availability.service.test.cts)
y el comando `test:availability` en `apps/web/package.json`.
Ese primer paso no modificó el servicio, el repositorio, las rutas, las reglas
de negocio ni la BD. En el paso 2 se modifica únicamente la estructura interna
de `availability.service.ts` y se actualiza este documento con la comparación.
Los cambios previos de autenticación permanecen fuera de este trabajo.

## Referencia reproducible

- Fecha local de registro: 2026-11-05, zona `America/Lima` (UTC-05:00).
- Plataforma: Windows; Node.js `v22.20.0`.
- Commit base: `ee65ab5b7695140f72840275c87670ea51cb2281`.
- Estado: ejecución sobre el directorio de trabajo, con cambios sin commit.
  El commit base por sí solo no contiene las nuevas pruebas.
- SHA-256 del servicio antes de refactorizar:
  `5CE4676733D93EE16554568CCD1AECE1BC87C307A7CF1944A42ADD9F325E7708`.
- SHA-256 del repositorio antes de refactorizar:
  `907202B753F982296FA0C73A363819932AB0806FD0CF83A7145D307926130A3C`.

Las pruebas usan `node:test`, repositorio y catálogo simulados y un reloj fijo.
No requieren credenciales ni abren conexiones a una BD. Usan como referencia
el lunes 2030-01-07 y horas explícitas en UTC y Lima.

## Casos y trazabilidad

Cada identificador aparece también en el nombre de la prueba automatizada.
La asociación a una historia indica cobertura parcial de sus criterios;
no acredita que toda la historia esté validada.

| Caso | Historia | Escenario y resultado comprobado | Antes del refactor | Después |
|---|---|---|---|---|
| DISP-01 | HU-02/HU-03 | Sin tratamiento: cuatro bloques de 30 minutos entre 08:00 y 10:00 | Aprobado | Aprobado |
| DISP-02 | HU-03 | Tratamiento de 45 minutos: seis inicios cada 15 minutos, sin exceder 10:00 | Aprobado | Aprobado |
| DISP-03 | HU-03 | Tratamiento que termina exactamente al cierre: se ofrece | Aprobado | Aprobado |
| DISP-04 | HU-03 | Tratamiento más largo que el tiempo restante: lista vacía | Aprobado | Aprobado |
| DISP-05 | HU-02/HU-03 | Cita 08:45–09:30: elimina cruces y conserva bloques que terminan o empiezan en sus límites | Aprobado | Aprobado |
| DISP-06 | HU-02/HU-03 | Sin horario semanal para ese día: lista vacía | Aprobado | Aprobado |
| DISP-07 | HU-09 | Excepción parcial devuelta por el repositorio: actualmente bloquea el día completo, tanto de odontólogo como de clínica | Aprobado como caracterización; regla pendiente de revisión | Aprobado como caracterización |
| DISP-08 | HU-03 | A las 09:00 de Lima: excluye inicios anteriores e iguales a las 09:00; también excluye una fecha pasada | Aprobado | Aprobado |
| DISP-09 | HU-02/HU-03 | Consulta la fecha civil solicitada usando su día UTC, incluso cuando en Lima aún es el día anterior | Aprobado | Aprobado |
| DISP-10 | HU-03 | Tratamiento no reservable: propaga el error de dominio del catálogo | Aprobado | Aprobado |
| DISP-11 | HU-02/HU-03 | Jornadas 08:00–09:00 y 14:00–15:00: conserva los bloques de ambas sin ocupar el receso | Aprobado | Aprobado |

## Ejecución anterior a la refactorización

Desde la raíz:

```powershell
pnpm --filter web test:availability
```

Comando directo ejecutado desde `apps/web`:

```powershell
node --require tsx/cjs --test tests/availability/availability.service.test.cts
```

Resumen literal de la salida TAP de esa ejecución (código de salida 0):

```text
1..11
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 651.0776
```

Node emitió una advertencia de API experimental por `MockTimers`; las pruebas
terminaron correctamente. El primer intento dentro del entorno restringido
falló antes de cargar los tests (`uv_os_get_passwd`, `ENOMEM`); el resultado
anterior corresponde a la ejecución local autorizada fuera de ese entorno.

Comprobaciones adicionales de este paso:

| Comprobación | Resultado observado |
|---|---|
| `pnpm typecheck` | Código 0; cuatro tareas correctas, tres desde caché y una ejecutada |
| `pnpm lint` | Código 0; cero errores y 34 advertencias en archivos ajenos a este paso |
| SHA-256 de servicio y repositorio al terminar | Coinciden con los valores anteriores: código productivo de disponibilidad sin cambios |

Durante el trabajo apareció además un cambio ajeno en `apps/web/.env.example`.
No se modificó ese archivo; sus avisos de espacios finales en la comprobación
global de Git no corresponden a esta suite.

## Uso de IA

La IA apoyó la inspección del servicio y propuso escenarios de límite:
tratamiento que cabe exactamente al cierre, duración excesiva, cruces
parciales, citas contiguas, hora actual, desfase UTC/Lima y excepción parcial.
Las propuestas se contrastaron con el código existente y se implementaron
como pruebas de resultados observables, ejecutadas contra el servicio actual.

Se aceptaron estos escenarios para establecer una referencia repetible.
Se dejó la corrección de excepciones parciales fuera del refactor porque
cambiaría resultados. No se presentan sugerencias de IA como resultados
de pruebas hasta haberlas ejecutado. La aceptación final de los requisitos
de negocio debe realizarla el responsable del proyecto.

## Riesgos y límites

- `TODO(bug?)`: el servicio devuelve una lista vacía ante cualquier excepción
  encontrada. La HU-09 también menciona excepciones por horas. DISP-07 describe
  ese comportamiento actual; su aprobación no demuestra que la regla sea correcta.
  Aclarar el requisito y tratar cualquier corrección como cambio separado.
- Las consultas están simuladas: no se verificó el SQL de excepciones,
  los estados de las citas filtrados por Prisma ni la persistencia de horarios.
- Estos tests evalúan el servicio; no prueban permisos o respuestas HTTP,
  interacción de la pantalla ni reservas concurrentes contra PostgreSQL.
- No se midió cobertura porcentual de líneas, ramas o funciones.
- La suite cubre `getAvailableSlots()`, no todas las operaciones de configuración
  semanal y gestión de excepciones del módulo.
- El `typecheck` habitual de la aplicación no incluye archivos `.cts` en sus
  patrones de entrada; ejecutar estos tests no equivale a comprobar estáticamente
  todos sus tipos.

## Refactorización realizada

La consulta de tratamiento, excepciones, horarios y citas permanece en
`getAvailableSlots()`, en el mismo orden. Se extrajeron dos métodos privados
dentro de `AvailabilityService`, sin añadir clases ni dependencias:

| Responsabilidad | Antes | Después |
|---|---|---|
| Generar bloques para los períodos del día | Bucle dentro de `getAvailableSlots()` | `generateDailySlots()` utiliza el generador de intervalos existente |
| Excluir cruces y horas pasadas | Predicado dentro de `getAvailableSlots()` | `filterAvailableSlots()` recibe bloques, citas, fecha y una única lectura de la hora actual |
| Generar un intervalo | `generateTimeSlots()` | Se conserva el mismo algoritmo |

### Archivo refactorizado y alcance de la comparación

El archivo refactorizado en el paso 2 es
`apps/web/modules/availability/availability.service.ts`.
A continuación se incluye su contenido completo: primero antes del refactor
y luego inmediatamente después, incluidos imports, constructor y métodos
que no cambiaron. Los bloques sustituyen los fragmentos de la comparación anterior.

La versión anterior se recuperó del commit base `ee65ab5b7695140f72840275c87670ea51cb2281`.
La versión posterior se reconstruyó tomando de ese archivo los métodos sin cambios
e incorporando la coordinación refactorizada, los dos métodos privados extraídos
y la anotación `TODO(bug?)`. Se verificó que ambos contenidos coinciden exactamente
con los SHA-256 históricos de este documento, usando UTF-8 sin BOM y saltos LF.

**Estas son las versiones históricas del paso 2.** El archivo actual contiene
además validación de identificadores, protección de citas al reducir horarios,
transacciones y registro de cambios de horario. Esos cambios quedan fuera de esta
comparación y de la evidencia de las 11 pruebas registrada para el refactor original.
El repositorio, las rutas y los schemas son referencias del módulo; no se presentan
como archivos refactorizados en este paso. La suite y el comando del paso 1 son
soporte de verificación.

### Antes de refactorizar — archivo completo

SHA-256: `5CE4676733D93EE16554568CCD1AECE1BC87C307A7CF1944A42ADD9F325E7708`.

```ts
import {
  AvailabilityRepository,
  AvailableSlot,
} from "./availability.repository"
import {
  ConfigureAvailabilitySchema,
  ReplaceWeeklyAvailabilitySchema,
  AddScheduleExceptionSchema,
} from "@biodentis/shared-validators"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"

export class AvailabilityService {
  constructor(
    private readonly availabilityRepository = new AvailabilityRepository(),
    private readonly catalog = new CatalogAdminService()
  ) {}
  async getAvailableSlots(
    dentistId: string,
    dateStr: string,
    treatmentId?: string
  ): Promise<AvailableSlot[]> {
    const treatment = treatmentId
      ? await this.catalog.requireBookable(treatmentId, dentistId)
      : null
    const date = new Date(dateStr)
    // dateStr es YYYY-MM-DD (UTC): usar getUTCDay evita desfases por zona horaria.
    const dayOfWeek = date.getUTCDay()

    const exception = await this.availabilityRepository.findException(
      dentistId,
      date
    )
    if (exception) return []

    const dayAvailability =
      await this.availabilityRepository.findByDentistAndDay(
        dentistId,
        dayOfWeek
      )
    if (dayAvailability.length === 0) return []

    const allSlots: AvailableSlot[] = []
    for (const slot of dayAvailability) {
      const slots = this.generateTimeSlots(
        slot.startTime,
        slot.endTime,
        treatment?.durationMinutes ?? 30,
        treatment ? 15 : 30
      )
      allSlots.push(...slots)
    }

    const bookedAppointments =
      await this.availabilityRepository.findBookedAppointments(dentistId, date)

    const now = new Date()
    return allSlots.filter(
      (slot) =>
        !bookedAppointments.some(
          (a) => slot.startTime < a.endTime && slot.endTime > a.startTime
        ) && new Date(`${dateStr}T${slot.startTime}:00-05:00`) > now
    )
  }

  async getWeekly(dentistId: string) {
    return this.availabilityRepository.findByDentist(dentistId)
  }

  async replaceWeekly(dentistId: string, data: unknown) {
    const parsed = ReplaceWeeklyAvailabilitySchema.parse(data)
    await this.availabilityRepository.replaceWeek(dentistId, parsed.days)
    return this.availabilityRepository.findByDentist(dentistId)
  }

  async configure(dentistId: string, data: unknown) {
    const parsed = ConfigureAvailabilitySchema.parse(data)
    return this.availabilityRepository.upsert(dentistId, parsed)
  }

  async addException(dentistId: string, data: unknown) {
    const parsed = AddScheduleExceptionSchema.parse(data)
    return this.availabilityRepository.addException(
      dentistId,
      new Date(parsed.startDate),
      new Date(parsed.endDate),
      parsed.reason
    )
  }

  async removeException(dentistId: string, dateStr: string) {
    return this.availabilityRepository.removeException(
      dentistId,
      new Date(dateStr)
    )
  }

  private generateTimeSlots(
    startTime: string,
    endTime: string,
    durationMinutes: number,
    stepMinutes = durationMinutes
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = []
    const [startH, startM] = startTime.split(":").map(Number) as [
      number,
      number,
    ]
    const [endH, endM] = endTime.split(":").map(Number) as [number, number]

    let currentMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStart = `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`
      const slotEndMinutes = currentMinutes + durationMinutes
      const slotEnd = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, "0")}:${String(slotEndMinutes % 60).padStart(2, "0")}`
      slots.push({ startTime: slotStart, endTime: slotEnd })
      currentMinutes += stepMinutes
    }

    return slots
  }
}
```

### Después de refactorizar — archivo completo

SHA-256: `8BF34073B19B40D1E51F6D1377C2DC6B0CAC1B9666DA296EAE3A118BC1C05B25`.

```ts
import {
  AvailabilityRepository,
  AvailableSlot,
} from "./availability.repository"
import {
  ConfigureAvailabilitySchema,
  ReplaceWeeklyAvailabilitySchema,
  AddScheduleExceptionSchema,
} from "@biodentis/shared-validators"
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service"

export class AvailabilityService {
  constructor(
    private readonly availabilityRepository = new AvailabilityRepository(),
    private readonly catalog = new CatalogAdminService()
  ) {}
  async getAvailableSlots(
    dentistId: string,
    dateStr: string,
    treatmentId?: string
  ): Promise<AvailableSlot[]> {
    const treatment = treatmentId
      ? await this.catalog.requireBookable(treatmentId, dentistId)
      : null
    const date = new Date(dateStr)
    // dateStr es YYYY-MM-DD (UTC): usar getUTCDay evita desfases por zona horaria.
    const dayOfWeek = date.getUTCDay()

    const exception = await this.availabilityRepository.findException(
      dentistId,
      date
    )
    // TODO(bug?): una excepción parcial también bloquea el día completo; confirmar HU-09.
    if (exception) return []

    const dayAvailability =
      await this.availabilityRepository.findByDentistAndDay(
        dentistId,
        dayOfWeek
      )
    if (dayAvailability.length === 0) return []

    const allSlots = this.generateDailySlots(
      dayAvailability,
      treatment?.durationMinutes ?? 30,
      treatment ? 15 : 30
    )

    const bookedAppointments =
      await this.availabilityRepository.findBookedAppointments(dentistId, date)

    return this.filterAvailableSlots(
      allSlots,
      bookedAppointments,
      dateStr,
      new Date()
    )
  }

  async getWeekly(dentistId: string) {
    return this.availabilityRepository.findByDentist(dentistId)
  }

  async replaceWeekly(dentistId: string, data: unknown) {
    const parsed = ReplaceWeeklyAvailabilitySchema.parse(data)
    await this.availabilityRepository.replaceWeek(dentistId, parsed.days)
    return this.availabilityRepository.findByDentist(dentistId)
  }

  async configure(dentistId: string, data: unknown) {
    const parsed = ConfigureAvailabilitySchema.parse(data)
    return this.availabilityRepository.upsert(dentistId, parsed)
  }

  async addException(dentistId: string, data: unknown) {
    const parsed = AddScheduleExceptionSchema.parse(data)
    return this.availabilityRepository.addException(
      dentistId,
      new Date(parsed.startDate),
      new Date(parsed.endDate),
      parsed.reason
    )
  }

  async removeException(dentistId: string, dateStr: string) {
    return this.availabilityRepository.removeException(
      dentistId,
      new Date(dateStr)
    )
  }

  private generateDailySlots(
    dayAvailability: AvailableSlot[],
    durationMinutes: number,
    stepMinutes: number
  ): AvailableSlot[] {
    const allSlots: AvailableSlot[] = []
    for (const slot of dayAvailability) {
      allSlots.push(
        ...this.generateTimeSlots(
          slot.startTime,
          slot.endTime,
          durationMinutes,
          stepMinutes
        )
      )
    }
    return allSlots
  }

  private filterAvailableSlots(
    slots: AvailableSlot[],
    bookedAppointments: AvailableSlot[],
    dateStr: string,
    now: Date
  ): AvailableSlot[] {
    return slots.filter(
      (slot) =>
        !bookedAppointments.some(
          (a) => slot.startTime < a.endTime && slot.endTime > a.startTime
        ) && new Date(`${dateStr}T${slot.startTime}:00-05:00`) > now
    )
  }

  private generateTimeSlots(
    startTime: string,
    endTime: string,
    durationMinutes: number,
    stepMinutes = durationMinutes
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = []
    const [startH, startM] = startTime.split(":").map(Number) as [
      number,
      number,
    ]
    const [endH, endM] = endTime.split(":").map(Number) as [number, number]

    let currentMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStart = `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`
      const slotEndMinutes = currentMinutes + durationMinutes
      const slotEnd = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, "0")}:${String(slotEndMinutes % 60).padStart(2, "0")}`
      slots.push({ startTime: slotStart, endTime: slotEnd })
      currentMinutes += stepMinutes
    }

    return slots
  }
}
```

### Qué cambió en este archivo

1. **Generación diaria:** el bucle que recorría `dayAvailability` salió de
   `getAvailableSlots()` y pasó a `generateDailySlots()`. Este método sigue
   usando `generateTimeSlots()` para cada período y conserva su orden.
2. **Filtrado:** el predicado de solapamientos y horas pasadas salió de
   `getAvailableSlots()` y pasó a `filterAvailableSlots()`. Recibe la fecha y
   una única lectura de la hora actual, realizada después de consultar las citas.
3. **Coordinación:** `getAvailableSlots()` llama a los dos métodos privados
   y conserva el orden de consultas y las salidas tempranas.
4. **Anotación del riesgo existente:** se añadió `TODO(bug?)` junto a la
   excepción que bloquea el día completo. La condición permanece igual.

Los imports, el constructor, `getWeekly()`, `replaceWeekly()`, `configure()`,
`addException()`, `removeException()` y el algoritmo de `generateTimeSlots()`
se conservaron en este refactor.

Se mantienen los bloques de 30 minutos sin tratamiento, el avance de 15 minutos
con tratamiento, el límite inclusivo del cierre, el orden de los períodos,
la comparación estricta con la hora actual en Lima y el criterio de solapamiento.
La consulta de citas sigue ocurriendo después de generar los bloques y la hora
actual se obtiene una vez, después de esa consulta. Los errores siguen propagándose.
El posible defecto de excepciones parciales queda señalado con `TODO(bug?)`;
su corrección no forma parte de este refactor.

## Ejecución posterior a la refactorización

- Fecha de registro: `2026-11-05T23:56:00-05:00`.
- Mismo entorno y comando directo de la ejecución anterior.
- Servicio posterior, SHA-256:
  `8BF34073B19B40D1E51F6D1377C2DC6B0CAC1B9666DA296EAE3A118BC1C05B25`.
- Repositorio: conserva su SHA-256 anterior.
- Suite: no se modificó durante el refactor; SHA-256 registrado al terminar:
  `586C4F2FB784D5ECFF5FBFD6BB71DD3BC122DE3A1F8D9AE7060DAAF47EA05E83`.

Resumen literal de la ejecución posterior (código de salida 0):

```text
1..11
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 644.6977
```

La advertencia experimental de `MockTimers` también aparece en esta ejecución.
Las duraciones registradas son evidencia de ejecución, no una medición de
mejora de rendimiento. No se añadió una medición de cobertura porcentual.

Comprobaciones posteriores del monorepo:

| Comprobación | Resultado observado |
|---|---|
| `pnpm typecheck` | Código 0; cuatro tareas correctas, tres desde caché y una ejecutada; 13.347 s |
| `pnpm lint` | Código 0; cero errores y las mismas 34 advertencias en archivos ajenos; 13.671 s |
| `git diff --check -- apps/web/modules/availability/availability.service.ts apps/web/package.json` | Sin errores de espacios finales en esos cambios |

La revisión del diff muestra únicamente la extracción de los métodos privados
y la anotación del posible defecto dentro del servicio. La ruta, el repositorio,
los schemas, las migraciones y la suite de caracterización permanecen sin cambios
durante el paso 2. Los escenarios ejecutados conservan sus resultados esperados;
no se detectaron regresiones en esos 11 casos.

## Cómo presentar la evidencia académica

1. Adjuntar este documento con la matriz de casos y las dos salidas de pruebas.
2. Mostrar los dos archivos completos incluidos en «Refactorización realizada».
   Para revisar además el estado actual frente al commit base desde la raíz:

   ```powershell
   git diff -- apps/web/modules/availability/availability.service.ts
   ```

   El diff actual incluye cambios adicionales al refactor histórico; para la
   comparación del paso 2, usar los bloques anteriores verificados por SHA-256.

3. Si la rúbrica pide capturas, registrar la comparación histórica y una nueva ejecución del
   comando de pruebas. Las capturas no se han generado en este trabajo.
4. Cuando se cree el commit o PR, agregar su referencia aquí. Este trabajo
   permanece en el directorio de trabajo; no se creó un commit ni se publicó.
5. Conservar visibles los riesgos pendientes y el alcance parcial de las pruebas.
