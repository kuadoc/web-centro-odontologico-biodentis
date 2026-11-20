# Reconstrucción local de PostgreSQL con seed v3

## Estado final

Ejecutado el 19/11/2026 por solicitud explícita del propietario: eliminar el contenedor y su volumen anterior, reconstruirlos conservando sus nombres y usar **postgres** como nombre de la base de datos.

| Recurso | Nombre / estado |
| --- | --- |
| Proyecto Compose | next-monorepo |
| Servicio | postgres |
| Contenedor | next-monorepo-postgres-1, reconstruido |
| Volumen | next-monorepo_postgres_data, eliminado y recreado |
| Base de datos | postgres |
| Usuario de conexión actual | postgres |
| Puerto | localhost:5432 |
| Migraciones | Las cuatro aplicadas correctamente |
| Seed | Versión 3, carga completada |

No se creó un contenedor adicional para la base de datos. El contenedor desechable de pruebas biodentis-acid-tests-20261119 y su volumen anónimo fueron eliminados previamente por solicitud del propietario.

## Respaldo y reemplazo de datos

Antes de borrar el volumen se creó y comprobó el archivo de respaldo:

`.backups/biodentis-before-volume-reset-2026-11-19T19-00-45-284Z.dump`

También se conserva el respaldo previo `.backups/biodentis-before-acid-20261119.dump`, cuya restauración se había verificado anteriormente. Los respaldos están fuera de Docker y excluidos de Git.

Eliminar el volumen eliminó las bases que contenía: la antigua biodentis y las copias de referencia y ensayo. La reconstrucción contiene los datos demo nuevos, sin trasladar las citas superpuestas o el teléfono inválido de la base anterior.

## Datos cargados y comprobados

- 18 usuarios: administrador, recepción, tres odontólogos y trece pacientes, incluido uno inactivo.
- 27 citas válidas, seis notas clínicas y tres planes de tratamiento.
- Tres especialidades, nueve servicios y tres sillones.
- Seis plantillas de correo y cero trabajos pendientes de correo.
- DNI, teléfonos y códigos de paciente compatibles con las restricciones.
- 15 restricciones CHECK, una exclusión de solapamientos y cuatro triggers personalizados.
- auth_throttles, email_outbox y patient_code_seq presentes.
- Historial Prisma con las cuatro migraciones terminadas.

Se ejecutaron las dos comprobaciones de preflight-integrity.sql: no devolvieron incidencias de integridad ni diferencias entre categorías y especialidades.

Las contraseñas demo fueron comprobadas contra sus hashes para administrador, recepción, odontólogo y paciente, sin mostrarlas ni generar sesiones. La contraseña es el valor actual de SEED_DEMO_PASSWORD en apps/web/.env.

## Configuración y código

- docker-compose.yml inicializa POSTGRES_DB=postgres. El usuario se obtiene de DB_USER, con postgres como valor predeterminado.
- DATABASE_URL y DIRECT_URL de apps/web/.env apuntan ahora a localhost:5432/postgres, conservando las credenciales configuradas. SMTP y secretos JWT no se reemplazaron.
- apps/web/.env.example se actualizó al mismo nombre y usuario predeterminados, con contraseña de ejemplo vacía de credenciales reales.
- scripts/rebuild-local-seed-v3.cjs comprueba el contenedor y volumen concretos, guarda respaldo y exige el argumento --replace-volume. Ese argumento realiza una operación destructiva y no debe ejecutarse para iniciar normalmente el proyecto.

No se enviaron correos y no se intervino ninguna base remota.

## Iniciar la aplicación

Desde la raíz del monorepo, reiniciar cualquier servidor de desarrollo que estuviera abierto para que tome las nuevas conexiones:

```powershell
pnpm.cmd dev
```

Abrir http://localhost:3000. Cuentas demo: admin@biodentis.com, recepcion@biodentis.com, dr.martinez@biodentis.com y paciente@biodentis.com. Todas usan SEED_DEMO_PASSWORD.

Las revisiones anteriores de biodentis en otros reportes son antecedentes históricos. El estado vigente es la base postgres reconstruida descrita aquí.
