# RF-AUTH-01 — Autenticación

## Estado y objetivo

**Refactorización realizada: persistencia extraída a `AuthRepository`.**

Las 23 pruebas de caracterización del servicio pasan antes y después con el mismo
contenido. Las 41 pruebas existentes de login, sesiones y permisos también pasan
en ambas versiones. Esto acredita los escenarios ejecutados, no la totalidad del
sistema ni el comportamiento de una BD real.

Este documento sigue la presentación de
[refactorización de disponibilidad](refactorizacion-disponibilidad.md):
alcance, referencia del antes, código completo antes/después y evidencia de pruebas.

Objetivo: separar las consultas y escrituras de persistencia de `AuthService`,
trasladándolas al repository del dominio y conservando las reglas de autenticación,
los retornos, los errores y el orden de efectos.

## Archivos y alcance realizado

| Archivo | Cambio | Responsabilidad |
|---|---|---|
| [auth.service.ts](../apps/web/modules/auth/auth.service.ts) | Refactorizado | Validación, comprobación de credenciales, generación de tokens y coordinación; delega persistencia |
| [auth.repository.ts](../apps/web/modules/auth/auth.repository.ts) | Nuevo | Consultas y escrituras de Prisma y transacción existente de rotación |
| [auth.service.test.cts](../apps/web/tests/auth/auth.service.test.cts) | Nuevo antes del cambio estructural | 23 pruebas de caracterización ejecutadas contra ambas versiones |
| [package.json](../apps/web/package.json) | Añadido `test:auth-service` | Comando dedicado para ejecutar la caracterización |
| Este documento | Actualizado | Mapeo, código completo y resultados |

Las rutas HTTP, los schemas, el esquema de BD, las migraciones, los helpers JWT
y los otros servicios de sesiones se conservaron durante este trabajo.
Se mantuvo el helper existente `nextPatientCode()`, ahora invocado desde el
repository. No se añadió una dependencia ni se cambió su algoritmo.

El directorio de trabajo ya contenía cambios de sesiones anteriores a este
refactor. La comparación usa la versión capturada abajo, no HEAD. En particular,
la vinculación del access token a `jti` ya existía y se conservó; no es un cambio
introducido por esta extracción.

## Mapeo para capturas del antes

Archivo: `apps/web/modules/auth/auth.service.ts`.
Estos números corresponden exclusivamente al bloque anterior conservado abajo.

| Líneas antes | Método | Persistencia trasladada |
|---|---|---|
| 11–54 | `register()` | Búsqueda de usuario por email (14), creación de usuario (21–31) y almacenamiento del refresh token (40–47) |
| 56–94 | `login()` | Búsqueda de usuario por email (59) y almacenamiento del refresh token (80–87) |
| 96–159 | `refresh()` | Búsqueda del token (100–102), búsqueda del usuario (121) y transacción de rotación (137–153) |
| 161–175 | `logout()` y `revokeAllUserTokens()` | Revocación del token indicado (164–167) y de los tokens del usuario (171–174) |

Captura principal del antes: **96–159**, dividida en 96–129 y 130–159 si hace falta.

## Mapeo para capturas del después

Los números corresponden a los archivos finales incluidos en este documento.

| Archivo | Líneas después | Contenido |
|---|---|---|
| `auth.service.ts` | 9–10 | Constructor con repository por defecto; `new AuthService()` sigue funcionando |
| `auth.service.ts` | 12–50 | `register()` |
| `auth.service.ts` | 52–88 | `login()` |
| `auth.service.ts` | 90–140 | `refresh()`; delegación de la rotación en 129–134 |
| `auth.service.ts` | 142–150 | `logout()` y `revokeAllUserTokens()` |
| `auth.repository.ts` | 11–26 | Búsqueda y creación de usuarios |
| `auth.repository.ts` | 28–44 | Persistencia, consulta y rotación de tokens; transacción en 36–44 |
| `auth.repository.ts` | 46–58 | Revocación individual y global |

Para comparar la captura principal anterior, mostrar **90–140 del servicio** y
**36–44 del repository**. El servicio conserva las decisiones; el repository
contiene las dos escrituras agrupadas en la misma transacción de Prisma.

## Referencia del antes

- Fecha local de registro: 2026-11-06, zona `America/Lima`.
- Fuente: archivo del directorio de trabajo; no se presupone que coincida con HEAD.
- SHA-256 de los bytes del archivo antes del refactor: `E6B4940131BEF4ED27AC7DF25628BC0B6E09F8C65C8235C45C0CB77799FE9689`.
- SHA-256 del bloque de código (UTF-8 sin BOM y saltos LF): `560E37FF5B93AB46EB8A65250C60A73835A9290ED2580986BBD3DC9C2FD33B23`.

## Antes de refactorizar — servicio completo

Contenido completo de `apps/web/modules/auth/auth.service.ts`, incluidos imports
y todos sus métodos. Esta es la referencia para las capturas y la comparación.

```ts
import { prisma } from "@/lib/prisma";
import { nextPatientCode } from "@/lib/patient-code";
import bcrypt from "bcrypt";
import { RegisterSchema, LoginSchema } from "@biodentis/shared-validators";
import { generateAccessToken, generateRefreshToken, hashToken, verifyRefreshToken } from "@/lib/auth";
import { AuthenticationError, DomainError, NotFoundError } from "@/lib/errors";

const REFRESH_EXPIRATION_DAYS = 7;

export class AuthService {
  async register(data: unknown) {
    const parsed = RegisterSchema.parse(data);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) {
      throw new DomainError("El email ya está registrado", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        passwordHash,
        role: "PATIENT",
        patientCode: await nextPatientCode(),
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
      },
    });

    const { token: refreshToken, jti } = generateRefreshToken(user.id);
    const accessToken = generateAccessToken(user.id, jti);
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await prisma.refreshToken.create({
      data: {
        jti,
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      accessToken,
      refreshToken,
    };
  }

  async login(data: unknown) {
    const parsed = LoginSchema.parse(data);

    const user = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (!user) {
      throw new AuthenticationError("Credenciales inválidas");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Cuenta desactivada. Contacte al administrador.");
    }

    const valid = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!valid) {
      throw new AuthenticationError("Credenciales inválidas");
    }

    const { token: refreshToken, jti } = generateRefreshToken(user.id);
    const accessToken = generateAccessToken(user.id, jti);
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await prisma.refreshToken.create({
      data: {
        jti,
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new AuthenticationError("Refresh token inválido");
    }

    if (storedToken.revokedAt) {
      await this.revokeAllUserTokens(storedToken.userId);
      throw new AuthenticationError("Refresh token revocado — sesión cerrada por seguridad");
    }

    if (storedToken.expiresAt < new Date()) {
      throw new AuthenticationError("Refresh token expirado");
    }

    if (storedToken.userId !== payload.sub) {
      throw new AuthenticationError("Refresh token no pertenece a este usuario");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Cuenta desactivada");
    }

    const { token: newRefreshToken, jti: newJti } = generateRefreshToken(user.id);
    const accessToken = generateAccessToken(user.id, newJti);
    const newTokenHash = hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { tokenHash },
        data: {
          revokedAt: new Date(),
          replacedByToken: newJti,
        },
      }),
      prisma.refreshToken.create({
        data: {
          jti: newJti,
          tokenHash: newTokenHash,
          userId: user.id,
          expiresAt,
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
```

## Después de refactorizar — servicio completo

Contenido completo de `apps/web/modules/auth/auth.service.ts`.

SHA-256 (UTF-8 sin BOM, LF): `A45DBBDD08B64E450D9F76B20BFB8B679DC07A23F47977B75882053B248E8C82`.

```ts
import { AuthRepository } from "@/modules/auth/auth.repository";
import bcrypt from "bcrypt";
import { RegisterSchema, LoginSchema } from "@biodentis/shared-validators";
import { generateAccessToken, generateRefreshToken, hashToken, verifyRefreshToken } from "@/lib/auth";
import { AuthenticationError, DomainError, NotFoundError } from "@/lib/errors";

const REFRESH_EXPIRATION_DAYS = 7;

export class AuthService {
  constructor(private readonly authRepository = new AuthRepository()) {}

  async register(data: unknown) {
    const parsed = RegisterSchema.parse(data);

    const existing = await this.authRepository.findUserByEmail(parsed.email);
    if (existing) {
      throw new DomainError("El email ya está registrado", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const user = await this.authRepository.createPatient({
      email: parsed.email,
      passwordHash,
      role: "PATIENT",
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      phone: parsed.phone,
    });

    const { token: refreshToken, jti } = generateRefreshToken(user.id);
    const accessToken = generateAccessToken(user.id, jti);
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await this.authRepository.createRefreshToken({
      jti,
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      accessToken,
      refreshToken,
    };
  }

  async login(data: unknown) {
    const parsed = LoginSchema.parse(data);

    const user = await this.authRepository.findUserByEmail(parsed.email);
    if (!user) {
      throw new AuthenticationError("Credenciales inválidas");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Cuenta desactivada. Contacte al administrador.");
    }

    const valid = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!valid) {
      throw new AuthenticationError("Credenciales inválidas");
    }

    const { token: refreshToken, jti } = generateRefreshToken(user.id);
    const accessToken = generateAccessToken(user.id, jti);
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await this.authRepository.createRefreshToken({
      jti,
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const storedToken = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new AuthenticationError("Refresh token inválido");
    }

    if (storedToken.revokedAt) {
      await this.revokeAllUserTokens(storedToken.userId);
      throw new AuthenticationError("Refresh token revocado — sesión cerrada por seguridad");
    }

    if (storedToken.expiresAt < new Date()) {
      throw new AuthenticationError("Refresh token expirado");
    }

    if (storedToken.userId !== payload.sub) {
      throw new AuthenticationError("Refresh token no pertenece a este usuario");
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Cuenta desactivada");
    }

    const { token: newRefreshToken, jti: newJti } = generateRefreshToken(user.id);
    const accessToken = generateAccessToken(user.id, newJti);
    const newTokenHash = hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await this.authRepository.rotateRefreshToken(tokenHash, {
      jti: newJti,
      tokenHash: newTokenHash,
      userId: user.id,
      expiresAt,
    }, new Date());

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    await this.authRepository.revokeRefreshToken(tokenHash, new Date());
  }

  async revokeAllUserTokens(userId: string) {
    await this.authRepository.revokeAllUserTokens(userId, new Date());
  }
}
```

## Después de refactorizar — repository completo (archivo nuevo)

Contenido completo de `apps/web/modules/auth/auth.repository.ts`.
Este archivo no existía antes de la extracción; no tiene un bloque anterior.

SHA-256 (UTF-8 sin BOM, LF): `03AB6B49485F4FD2D5675CE1E19B1352B790DC13466A46D19543E6BEAD0114B7`.

```ts
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextPatientCode } from "@/lib/patient-code";

type RefreshTokenData = Pick<
  Prisma.RefreshTokenUncheckedCreateInput,
  "jti" | "tokenHash" | "userId" | "expiresAt"
>;

export class AuthRepository {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async createPatient(data: Pick<
    Prisma.UserCreateInput,
    "email" | "passwordHash" | "role" | "firstName" | "lastName" | "phone"
  >) {
    return prisma.user.create({
      data: { ...data, patientCode: await nextPatientCode() },
    });
  }

  createRefreshToken(data: RefreshTokenData) {
    return prisma.refreshToken.create({ data });
  }

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  rotateRefreshToken(tokenHash: string, replacement: RefreshTokenData, revokedAt: Date) {
    return prisma.$transaction([
      prisma.refreshToken.update({
        where: { tokenHash },
        data: { revokedAt, replacedByToken: replacement.jti },
      }),
      prisma.refreshToken.create({ data: replacement }),
    ]);
  }

  revokeRefreshToken(tokenHash: string, revokedAt: Date) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt },
    });
  }

  revokeAllUserTokens(userId: string, revokedAt: Date) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
```

SHA-256 de la suite antes y después: `D66D6231C6C8DDA4DDFE615C27CF0A36AC594E07A479653BDEA77FF6793335DE`.

## Qué cambió y qué comportamiento se conservó

| Responsabilidad | Antes | Después |
|---|---|---|
| Buscar usuario por email | `prisma.user.findUnique()` en registro y login | `AuthRepository.findUserByEmail()` |
| Buscar usuario por ID | Consulta directa en `refresh()` | `AuthRepository.findUserById()` |
| Crear paciente | Datos y llamada a `nextPatientCode()` dentro de `register()` | El servicio fija `PATIENT`; `createPatient()` invoca el helper existente y crea el registro |
| Guardar refresh token | Escritura directa en registro y login | `AuthRepository.createRefreshToken()` |
| Consultar refresh token | Consulta directa por hash | `AuthRepository.findRefreshTokenByHash()` |
| Rotar refresh token | `$transaction` dentro del servicio | `AuthRepository.rotateRefreshToken()` mantiene actualización y creación en una transacción |
| Revocar token | `updateMany()` dentro de `logout()` | `AuthRepository.revokeRefreshToken()` conserva hash y filtro `revokedAt: null` |
| Revocar sesiones del usuario | `updateMany()` dentro del servicio | `AuthRepository.revokeAllUserTokens()` conserva usuario y filtro `revokedAt: null` |

El servicio conserva Zod, bcrypt con coste 12 para el registro, los controles de
cuenta activa y contraseña, el orden de validación del refresh token, los mensajes
y clases de error, y la respuesta pública sin contraseña. También conserva la
generación de JWT, el hash persistido del refresh token, la vinculación de la
sesión y la expiración calculada mediante `setDate(... + 7)`.

Las fechas de revocación se siguen obteniendo en el servicio al efectuar la
operación y se pasan al repository. El registro de un paciente y el guardado de
su sesión siguen siendo operaciones separadas, como en la versión anterior.
La transacción de rotación conserva las dos operaciones originales, su orden y
sus datos. Las revocaciones siguen devolviendo `undefined` desde el servicio.

## Pruebas y trazabilidad

Suite: `apps/web/tests/auth/auth.service.test.cts`.
Los identificadores agrupados generan 23 pruebas por sus variantes.

| Caso | Escenario | Antes | Después |
|---|---|---|---|
| AUTH-01 | Registro: rol PATIENT aun si el cliente envía ADMIN, código de paciente, datos persistidos, respuesta pública y sesión | Aprobado | Aprobado |
| AUTH-02 | Email duplicado: error 409 y ausencia de escrituras | Aprobado | Aprobado |
| AUTH-03 | Registro y login inválidos: Zod rechaza antes de consultar BD (2 variantes) | Aprobado | Aprobado |
| AUTH-04 | Login correcto: comparación de contraseña, respuesta y sesión de siete días | Aprobado | Aprobado |
| AUTH-05 | Login: usuario ausente, inactivo o contraseña incorrecta (3 variantes) | Aprobado | Aprobado |
| AUTH-06 | Rotación: revocación del anterior, referencia al reemplazo y envío de ambas escrituras en una transacción | Aprobado | Aprobado |
| AUTH-07 | Firma inválida rechazada antes de consultar BD | Aprobado | Aprobado |
| AUTH-08 | Refresh: token ausente, expirado en BD, otro propietario, usuario ausente o inactivo (5 variantes) | Aprobado | Aprobado |
| AUTH-09 | Reutilización de token revocado: revoca sesiones activas de ese usuario y conserva las de otros | Aprobado | Aprobado |
| AUTH-10 | Logout: revocación individual idempotente, sin afectar otra sesión | Aprobado | Aprobado |
| AUTH-11 | Revocación global: alcance al usuario indicado y retorno vacío | Aprobado | Aprobado |
| AUTH-12 | Fallos de lectura, escritura y transacción: propagación del mismo error (3 variantes) | Aprobado | Aprobado |
| AUTH-13 | Expiración persistida igual a ahora: conserva la comparación estricta existente | Aprobado | Aprobado |
| AUTH-14 | Token firmado sin sesión persistida: renovación rechazada | Aprobado | Aprobado |

Se usan `node:test`, reloj fijo, JWT reales con secretos exclusivos de fixtures,
bcrypt simulado y un cliente Prisma falso que rechaza operaciones no simuladas.
No se leen credenciales ni se abren conexiones a una BD. Los tests observan
retornos, errores, datos escritos, alcance de revocación y orden de operaciones.

## Ejecución anterior al refactor

Fecha local: 2026-11-06. Windows, Node.js `v22.20.0`.
Comando desde `apps/web`, ejecutado antes de modificar el servicio:

```powershell
node --require tsx/cjs --test tests/auth/auth.service.test.cts
```

Resumen literal; código de salida 0:

```text
1..23
# tests 23
# suites 0
# pass 23
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 971.6227
```

También se ejecutaron las cuatro suites existentes:

```powershell
node --require tsx/cjs --test tests/auth/login.test.cts tests/auth/access-session.test.cts tests/auth/client-session.test.cts tests/auth/route-access.test.cts
```

Resumen literal; código de salida 0:

```text
1..41
# tests 41
# suites 0
# pass 41
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1270.836
```

El primer intento restringido falló antes de cargar la suite por
`uv_os_get_passwd` / `ENOMEM` en tsx. Los resultados anteriores corresponden a
la ejecución local autorizada fuera de ese entorno.

## Ejecución posterior al refactor

Las mismas cinco suites, incluidas las 23 pruebas de caracterización sin cambios,
se ejecutaron juntas desde `apps/web`:

```powershell
node --require tsx/cjs --test tests/auth/auth.service.test.cts tests/auth/login.test.cts tests/auth/access-session.test.cts tests/auth/client-session.test.cts tests/auth/route-access.test.cts
```

Resumen literal; código de salida 0:

```text
1..64
# tests 64
# suites 0
# pass 64
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1377.7948
```

La suite de caracterización también puede repetirse desde la raíz:

```powershell
pnpm --filter web test:auth-service
```

Node muestra una advertencia experimental por `MockTimers`. Las duraciones
registran las ejecuciones; no constituyen una medición de mejora de rendimiento.

## Comprobaciones adicionales

| Comprobación | Resultado |
|---|---|
| `pnpm.cmd typecheck` | Código 0; 4 tareas correctas, 3 desde caché; 15.445 s |
| `pnpm.cmd lint` | Código 0; 0 errores y 33 advertencias en archivos ajenos al refactor; 22.581 s |
| `git diff --check -- apps/web/modules/auth/auth.service.ts apps/web/package.json` | Código 0, sin errores de espacios |
| Comparación del bloque anterior y de los bloques finales | SHA-256 registrado; bloques finales completos correspondientes a los archivos |
| Suite antes/después | Mismo SHA-256; no se cambiaron expectativas para obtener la aprobación posterior |

En PowerShell se utilizó `pnpm.cmd` porque la política local bloquea `pnpm.ps1`.
Los intentos restringidos de pnpm fallaron al acceder al registro para verificar
su versión; typecheck y lint se completaron fuera del entorno con autorización.
No se obtuvo una referencia anterior de estos dos checks: los resultados de la
tabla corresponden al código posterior. Las pruebas sí se ejecutaron antes y después.

## Riesgos y límites de la evidencia

- Prisma está simulado: se verifica que la rotación envía ambas escrituras en una
  transacción, pero no se prueba rollback real, aislamiento ni concurrencia en PostgreSQL.
- No se midió cobertura porcentual ni rendimiento. Los resultados de 64 pruebas
  no demuestran cobertura completa de todas las rutas o reglas del sistema.
- Bcrypt está simulado en la caracterización; se comprueban sus argumentos y
  decisiones del servicio, no la implementación criptográfica de la biblioteca.
- El typecheck habitual no incluye `.cts` entre sus patrones de entrada; ejecutar
  esta suite no equivale a comprobar estáticamente todos los tipos de los tests.
- Se mantuvo el helper compartido `nextPatientCode()` sin mover su implementación;
  su acceso a Prisma permanece en `lib/patient-code.ts`. El servicio de autenticación
  ya no importa Prisma ni ese helper. No se hizo un refactor transversal de códigos
  de pacientes ni de los demás consumidores del helper.
- Las consultas, validaciones y políticas existentes se conservaron. Esta extracción
  no demuestra garantías nuevas frente a registros o renovaciones simultáneos.
- No se modificaron contratos HTTP, permisos, cookies, políticas de sesión, schema
  ni migraciones. Tampoco se publicaron cambios ni se creó un commit en este paso.

## Uso de IA y presentación de evidencia

La IA apoyó la revisión de dependencias, las pruebas de caracterización y la
extracción de persistencia. Se contrastó el cambio con el código anterior capturado
y con resultados ejecutados; las propuestas pendientes no se presentan como hechos.

Para las capturas, usar el mapeo del antes y del después y el código completo
incluido en este documento. El diff frente a HEAD contiene además cambios previos
de sesiones y no debe atribuirse por completo a este refactor. Adjuntar los
resúmenes de ejecución y conservar visibles los límites de las pruebas.
