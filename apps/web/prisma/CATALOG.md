# Catálogo de especialidades y servicios

Para actualizar una base existente, ejecutar una sola vez desde la raíz:

```sh
pnpm --filter web db:catalog
pnpm db:generate
```

Reiniciar el servidor después de generar Prisma. En Windows debe detenerse antes
de generar si mantiene bloqueada la DLL del motor.

La actualización es aditiva: conserva servicios, precios, citas, planes e
historiales. Relaciona las categorías históricas con especialidades y asigna
odontólogos reales según su especialidad actual. Añade las nueve especialidades
y los servicios del boceto, con duración inicial de 30 minutos y precio pendiente.
El administrador puede ajustar estos valores desde `/dentists` (Catálogo).

Para una base nueva, ejecutar primero `db:push` y `db:seed`, y después `db:catalog`.
No volver a ejecutar la actualización sobre un catálogo administrado: las
asignaciones iniciales podrían restablecerse.

Las especialidades inactivas o sin odontólogos activos y los servicios inactivos
quedan fuera de los catálogos público y de reservas. Desactivar conserva todas
las citas existentes. Las nuevas reservas guardan `treatmentId` y toman la
duración del servicio en el servidor.
