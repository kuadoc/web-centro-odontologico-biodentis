# BIODENTIS - Sistema de Diseño

Guía completa del diseño UI/UX del proyecto.

---

## 1. Paleta de Colores

### Espacio de Color: OKLCH

Todos los colores están definidos en el espacio **OKLCH** (Lightness, Chroma, Hue) que ofrece mejor percepción visual que RGB/HSL.

### Tema Claro (`:root`)

| Token | Valor OKLCH | Uso |
|-------|-------------|-----|
| `--background` | `oklch(1 0 0)` | Fondo principal (blanco puro) |
| `--foreground` | `oklch(0.145 0 0)` | Texto principal (casi negro) |
| `--card` | `oklch(1 0 0)` | Fondo de tarjetas |
| `--card-foreground` | `oklch(0.145 0 0)` | Texto en tarjetas |
| `--popover` | `oklch(1 0 0)` | Fondo de popovers/modals |
| `--popover-foreground` | `oklch(0.145 0 0)` | Texto en popovers |
| `--primary` | `oklch(0.205 0 0)` | Color primario (negro) |
| `--primary-foreground` | `oklch(0.985 0 0)` | Texto sobre primario (blanco) |
| `--secondary` | `oklch(0.97 0 0)` | Fondo secundario (gris muy claro) |
| `--secondary-foreground` | `oklch(0.205 0 0)` | Texto secundario |
| `--muted` | `oklch(0.97 0 0)` | Fondo atenuado |
| `--muted-foreground` | `oklch(0.556 0 0)` | Texto atenuado (gris medio) |
| `--accent` | `oklch(0.97 0 0)` | Fondo de acento |
| `--accent-foreground` | `oklch(0.205 0 0)` | Texto de acento |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Rojo de error/eliminar |
| `--border` | `oklch(0.922 0 0)` | Color de bordes |
| `--input` | `oklch(0.922 0 0)` | Bordes de inputs |
| `--ring` | `oklch(0.708 0 0)` | Anillo de foco |

### Tema Oscuro (`.dark`)

| Token | Valor OKLCH | Uso |
|-------|-------------|-----|
| `--background` | `oklch(0.145 0 0)` | Fondo principal (casi negro) |
| `--foreground` | `oklch(0.985 0 0)` | Texto principal (blanco) |
| `--card` | `oklch(0.205 0 0)` | Fondo de tarjetas |
| `--card-foreground` | `oklch(0.985 0 0)` | Texto en tarjetas |
| `--popover` | `oklch(0.205 0 0)` | Fondo de popovers |
| `--popover-foreground` | `oklch(0.985 0 0)` | Texto en popovers |
| `--primary` | `oklch(0.922 0 0)` | Color primario (blanco) |
| `--primary-foreground` | `oklch(0.205 0 0)` | Texto sobre primario |
| `--secondary` | `oklch(0.269 0 0)` | Fondo secundario |
| `--secondary-foreground` | `oklch(0.985 0 0)` | Texto secundario |
| `--muted` | `oklch(0.269 0 0)` | Fondo atenuado |
| `--muted-foreground` | `oklch(0.708 0 0)` | Texto atenuado |
| `--accent` | `oklch(0.269 0 0)` | Fondo de acento |
| `--accent-foreground` | `oklch(0.985 0 0)` | Texto de acento |
| `--destructive` | `oklch(0.704 0.191 22.216)` | Rojo de error (más brillante) |
| `--border` | `oklch(1 0 0 / 10%)` | Bordes (blanco 10% opacidad) |
| `--input` | `oklch(1 0 0 / 15%)` | Inputs (blanco 15% opacidad) |
| `--ring` | `oklch(0.556 0 0)` | Anillo de foco |

### Sidebar

| Token | Claro | Oscuro |
|-------|-------|--------|
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-primary` | `oklch(0.205 0 0)` | `oklch(0.488 0.243 264.376)` |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--sidebar-ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` |

### Charts

| Token | Valor |
|-------|-------|
| `--chart-1` | `oklch(0.87 0 0)` |
| `--chart-2` | `oklch(0.556 0 0)` |
| `--chart-3` | `oklch(0.439 0 0)` |
| `--chart-4` | `oklch(0.371 0 0)` |
| `--chart-5` | `oklch(0.269 0 0)` |

---

## 2. Tipografia

### Fuentes

| Fuente | Uso | Variable CSS |
|--------|-----|--------------|
| **Inter** | Texto general (sans-serif) | `--font-sans` |
| **Geist Mono** | Código/monoespaciada | `--font-mono` |

### Jerarquia

| Elemento | Clase Tailwind | Tamaño |
|----------|---------------|--------|
| H1 | `text-4xl font-bold` | 2.25rem / 36px |
| H2 | `text-2xl font-bold` | 1.5rem / 24px |
| H3 | `text-xl font-semibold` | 1.25rem / 20px |
| H4 | `text-lg font-semibold` | 1.125rem / 18px |
| Body | `text-sm` | 0.875rem / 14px |
| Small | `text-xs` | 0.75rem / 12px |
| Caption | `text-xs text-muted-foreground` | 0.75rem / 12px |

---

## 3. Espaciado y Radio

### Radio de Bordes

| Token | Cálculo | Valor |
|-------|---------|-------|
| `--radius` | Base | `0.625rem` (10px) |
| `--radius-sm` | `radius * 0.6` | `0.375rem` (6px) |
| `--radius-md` | `radius * 0.8` | `0.5rem` (8px) |
| `--radius-lg` | `radius` | `0.625rem` (10px) |
| `--radius-xl` | `radius * 1.4` | `0.875rem` (14px) |
| `--radius-2xl` | `radius * 1.8` | `1.125rem` (18px) |
| `--radius-3xl` | `radius * 2.2` | `1.375rem` (22px) |
| `--radius-4xl` | `radius * 2.6` | `1.625rem` (26px) |

### Uso por Componente

| Componente | Radio |
|------------|-------|
| Button | `rounded-lg` |
| Card | `rounded-xl` |
| Input | `rounded-lg` |
| Badge | `rounded-4xl` (pill) |
| Dialog | `rounded-xl` |
| Select popover | `rounded-lg` |
| Table row | Sin radio |

---

## 4. Sombras y Anillos

### Sombras

| Componente | Sombra |
|------------|--------|
| Card | `ring-1 ring-foreground/10` (anillo sutil) |
| Dialog | `ring-1 ring-foreground/10` |
| Select popover | `shadow-md ring-1 ring-foreground/10` |
| Badge | Sin sombra |
| Button | Sin sombra (solo anillo de foco) |

### Anillos de Foco (Focus Ring)

Todos los componentes interactivos usan el mismo patrón:

```css
focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
```

- **Color**: `--ring` (gris)
- **Grosor**: 3px
- **Opacidad**: 50%
- **Transición**: `transition-all` o `transition-colors`

### Estados de Error

```css
aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20
```

En modo oscuro:
```css
dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40
```

---

## 5. Componentes UI

### Button

**Paquete**: `@workspace/ui/components/button`

#### Variantes

| Variante | Estilo | Uso |
|----------|--------|-----|
| `default` | Fondo negro, texto blanco | Acciones principales |
| `outline` | Borde visible, fondo transparente | Acciones secundarias |
| `secondary` | Fondo gris claro | Alternativas |
| `ghost` | Sin fondo, hover gris | Navegación, iconos |
| `destructive` | Rojo claro, texto rojo | Eliminar, alertas |
| `link` | Texto subrayado | Navegación inline |

#### Tamaños

| Tamaño | Altura | Uso |
|--------|--------|-----|
| `xs` | 24px | Botones compactos |
| `sm` | 28px | Botones pequeños |
| `default` | 32px | Estándar |
| `lg` | 36px | Botones grandes |
| `icon` | 32px | Solo icono |
| `icon-xs` | 24px | Icono pequeño |
| `icon-sm` | 28px | Icono mediano |
| `icon-lg` | 36px | Icono grande |

#### Uso

```tsx
import { Button } from "@workspace/ui/components/button"

// Variante default
<Button onPress={handleClick}>Guardar</Button>

// Variante outline
<Button variant="outline" onPress={handleCancel}>Cancelar</Button>

// Variante destructive
<Button variant="destructive" onPress={handleDelete}>Eliminar</Button>

// Solo icono
<Button variant="ghost" size="icon-sm" onPress={handleRefresh}>
  <RefreshCw className="h-4 w-4" />
</Button>

// Deshabilitado
<Button isDisabled={loading}>{loading ? "Cargando..." : "Enviar"}</Button>
```

**Nota**: Los botones de React Aria usan `onPress` (no `onClick`).

---

### Card

**Paquete**: `@workspace/ui/components/card`

#### Sub-componentes

| Componente | Uso |
|------------|-----|
| `Card` | Contenedor principal |
| `CardHeader` | Encabezado con título |
| `CardTitle` | Título de la tarjeta |
| `CardDescription` | Descripción bajo el título |
| `CardAction` | Botón/acción en la esquina |
| `CardContent` | Contenido principal |
| `CardFooter` | Pie con fondo atenuado |

#### Tamaños

| Tamaño | Espaciado |
|--------|-----------|
| `default` | 16px (`--spacing(4)`) |
| `sm` | 12px (`--spacing(3)`) |

#### Uso

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

<Card>
  <CardHeader>
    <CardTitle>Título de la tarjeta</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Contenido aquí</p>
  </CardContent>
</Card>
```

---

### Badge

**Paquete**: `@workspace/ui/components/badge`

#### Variantes

| Variante | Estilo | Uso |
|----------|--------|-----|
| `default` | Fondo negro, texto blanco | Estado principal |
| `secondary` | Fondo gris claro | Estado alternativo |
| `destructive` | Rojo claro | Error, alerta |
| `outline` | Borde visible | Etiquetas |
| `ghost` | Sin fondo | Sutil |
| `link` | Subrayado | Navegación |

#### Uso

```tsx
import { Badge } from "@workspace/ui/components/badge"

<Badge>PENDIENTE</Badge>
<Badge variant="secondary">CONFIRMADA</Badge>
<Badge variant="destructive">CANCELADA</Badge>
```

---

### Input

**Paquete**: `@workspace/ui/components/input`

- Altura: 32px (`h-8`)
- Radio: `rounded-lg`
- Borde: `border-input`
- Foco: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`
- Placeholder: `placeholder:text-muted-foreground`

```tsx
import { Input } from "@workspace/ui/components/input"

<Input type="email" placeholder="tu@email.com" />
<Input type="password" placeholder="••••••••" />
```

---

### Textarea

**Paquete**: `@workspace/ui/components/textarea`

- Altura mínima: 64px (`min-h-16`)
- Auto-ajuste: `field-sizing-content`
- Mismos estilos de foco que Input

```tsx
import { Textarea } from "@workspace/ui/components/textarea"

<Textarea placeholder="Descripción..." />
```

---

### Select

**Paquete**: `@workspace/ui/components/select`

#### Sub-componentes

| Componente | Uso |
|------------|-----|
| `Select` | Contenedor raíz |
| `SelectTrigger` | Botón que abre el select |
| `SelectValue` | Valor seleccionado |
| `SelectContent` | Dropdown con opciones |
| `SelectItem` | Cada opción |
| `SelectGroup` | Grupo de opciones |
| `SelectLabel` | Etiqueta del grupo |
| `SelectInput` | Campo de búsqueda |
| `SelectSeparator` | Separador visual |

#### Uso

```tsx
import {
  Select, SelectTrigger, SelectValue, SelectContent,
  SelectItem, SelectGroup, SelectLabel
} from "@workspace/ui/components/select"

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Seleccionar..." />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Roles</SelectLabel>
      <SelectItem id="PATIENT">Paciente</SelectItem>
      <SelectItem id="DENTIST">Odontólogo</SelectItem>
      <SelectItem id="ADMIN">Administrador</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

---

### Dialog

**Paquete**: `@workspace/ui/components/dialog`

#### Sub-componentes

| Componente | Uso |
|------------|-----|
| `DialogTrigger` | Abre el modal |
| `Dialog` | Modal completo con overlay |
| `DialogHeader` | Encabezado |
| `DialogTitle` | Título del modal |
| `DialogDescription` | Descripción |
| `DialogContent` | Contenido |
| `DialogFooter` | Pie con acciones |
| `DialogClose` | Botón de cerrar |

#### Características

- Overlay: `bg-black/10` con `backdrop-blur-xs`
- Animaciones: `fade-in-0`, `zoom-in-95`
- Cierre: Click fuera o botón X
- Radio: `rounded-xl`

```tsx
import {
  Dialog, DialogTrigger, DialogHeader, DialogTitle,
  DialogDescription, DialogContent, DialogFooter
} from "@workspace/ui/components/dialog"

<DialogTrigger>
  <Button>Abrir</Button>
  <Dialog>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
      <DialogDescription>Descripción</DialogDescription>
    </DialogHeader>
    <DialogContent>
      <p>Contenido del modal</p>
    </DialogContent>
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button>Aceptar</Button>
    </DialogFooter>
  </Dialog>
</DialogTrigger>
```

---

### Table

**Paquete**: `@workspace/ui/components/table`

#### Sub-componentes

| Componente | Uso |
|------------|-----|
| `Table` | Contenedor con scroll |
| `TableHeader` | Encabezado |
| `TableBody` | Cuerpo |
| `TableFooter` | Pie |
| `TableRow` | Fila |
| `TableHead` | Columna del encabezado |
| `TableCell` | Celda de datos |
| `TableCaption` | Leyenda |

#### Características

- Hover en filas: `hover:bg-muted/50`
- Fila seleccionada: `data-selected:bg-muted`
- Bordes: `border-b` en filas

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@workspace/ui/components/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nombre</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Juan</TableCell>
      <TableCell>juan@email.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## 6. Temas

### Sistema de Temas

- **Proveedor**: `next-themes`
- **Método**: Clase CSS `dark` en `<html>`
- **Hotkey**: Tecla `D` para alternar claro/oscuro
- **Selector**: Botón en el header (Sol/Luna/Monitor)

### Configuración

```tsx
// components/theme-provider.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
```

### Uso de Colores en Componentes

```tsx
// Claro: fondo blanco, texto negro
<div className="bg-background text-foreground">...</div>

// Card: fondo de tarjeta
<div className="bg-card text-card-foreground">...</div>

// Texto atenuado
<p className="text-muted-foreground">Secundario</p>

// Botón primario
<Button className="bg-primary text-primary-foreground">...</Button>
```

---

## 7. Layout del Dashboard

### Estructura

```
┌─────────────────────────────────────────────────┐
│                    Header                        │
│  [Tema] [Badge Rol] [Email Usuario]             │
├──────────┬──────────────────────────────────────┤
│          │                                       │
│ Sidebar  │         Main Content                  │
│  w-64    │         p-6                           │
│          │                                       │
│ [Nav]    │   ┌─────────────────────────────┐    │
│          │   │                             │    │
│          │   │      Contenido aquí         │    │
│          │   │                             │    │
│          │   └─────────────────────────────┘    │
│          │                                       │
├──────────┤                                       │
│ Usuario  │                                       │
│ [Logout] │                                       │
└──────────┴──────────────────────────────────────┘
```

### Sidebar

- **Ancho fijo**: 256px (`w-64`)
- **Borde derecho**: `border-r`
- **Fondo**: `bg-card`
- **Navegación**: Filtrada por rol del usuario
- **Logo**: "BIODENTIS" en el header
- **Usuario**: Nombre, rol, y botón de logout en el footer

### Header

- **Altura**: 56px (`h-14`)
- **Borde inferior**: `border-b`
- **Fondo**: `bg-card`
- **Contenido**: Título, selector de tema, badge de rol, email

---

## 8. Iconos

### Librería: Lucide React

**Instalación**: `lucide-react@^1.37.0`

### Iconos Comunes en el Proyecto

| Icono | Uso |
|-------|-----|
| `Calendar` | Citas |
| `Users` | Pacientes |
| `Stethoscope` | Odontólogos |
| `FileText` | Historial clínico |
| `LayoutDashboard` | Dashboard |
| `LogOut` | Cerrar sesión |
| `Sun` / `Moon` / `Monitor` | Selector de tema |
| `Plus` | Agregar |
| `CheckCircle` | Confirmar |
| `XCircle` | Cancelar |
| `Clock` | Horario |
| `Mail` | Email |
| `Phone` | Teléfono |

### Tamaños

| Clase | Tamaño |
|-------|--------|
| `h-3 w-3` | 12px (iconos inline) |
| `h-4 w-4` | 16px (estándar) |
| `h-5 w-5` | 20px |
| `h-6 w-6` | 24px |

---

## 9. Animaciones

### Transiciones

| Componente | Transición |
|------------|-----------|
| Button | `transition-all` + `active:translate-y-px` |
| Input | `transition-colors` |
| Table row | `transition-colors` |
| Dialog | `duration-100` + animaciones de entrada/salida |

### Animaciones de Dialog

```css
/* Entrada */
data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95

/* Salida */
data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95
```

### Animaciones de Select Popover

```css
data-[placement=bottom]:slide-in-from-top-2
data-[placement=left]:slide-in-from-right-2
data-[placement=right]:slide-in-from-left-2
data-[placement=top]:slide-in-from-bottom-2
```

---

## 10. Utilidades

### Función `cn()`

```typescript
import { cn } from "@workspace/ui/lib/utils"

// Fusiona clases de Tailwind de forma condicional
cn("base-class", condition && "conditional-class", "override-class")
```

### Funciones de Formato

```typescript
import { formatDate, formatTime, formatDateTime } from "@workspace/ui/lib/utils"

formatDate("2024-01-15")        // "15/01/2024"
formatTime("14:30")             // "14:30"
formatDateTime("2024-01-15T14:30") // "15/01/2024 14:30"
```

---

## 11. Paleta de Estados (Citas)

| Estado | Color Badge | Uso |
|--------|------------|-----|
| `PENDING` | `bg-yellow-100 text-yellow-800` | Pendiente de confirmación |
| `CONFIRMED` | `bg-blue-100 text-blue-800` | Confirmada |
| `COMPLETED` | `bg-green-100 text-green-800` | Completada |
| `CANCELLED` | `bg-red-100 text-red-800` | Cancelada |
| `NO_SHOW` | `bg-gray-100 text-gray-800` | No se presentó |

---

## 12. Iconos por Rol

| Rol | Badge Color | Icono |
|-----|------------|-------|
| `ADMIN` | `bg-purple-100 text-purple-800` | Shield |
| `RECEPTIONIST` | `bg-blue-100 text-blue-800` | Headphones |
| `DENTIST` | `bg-green-100 text-green-800` | Stethoscope |
| `PATIENT` | `bg-gray-100 text-gray-800` | User |

---

## 13. Convenciones de Código

### Imports

```tsx
// 1. React y librerías externas
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// 2. Componentes UI
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

// 3. Utilidades
import { cn, formatDate } from "@workspace/ui/lib/utils"

// 4. Hooks del proyecto
import { useAuth } from "@/hooks/use-auth"
import { useApi } from "@/hooks/use-api"

// 5. Iconos
import { Calendar, Users } from "lucide-react"

// 6. Types
import { Role } from "@biodentis/shared-types"
```

### naming

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes | PascalCase | `AppointmentPage` |
| Hooks | camelCase con `use` | `useAuth`, `useApi` |
| Utilidades | camelCase | `formatDate`, `cn` |
| Constantes | UPPER_SNAKE | `HOURS_24_IN_MS` |
| Archivos de componentes | kebab-case | `appointment-page.tsx` |
| Archivos de utilidad | kebab-case | `use-auth.tsx` |

---

## 14. Referencia Rápida

### Colores más usados

```tsx
// Fondo principal
bg-background text-foreground

// Tarjetas
bg-card text-card-foreground

// Texto secundario
text-muted-foreground

// Bordes
border-border

// Input
border-input

// Botón primario
bg-primary text-primary-foreground

// Botón secundario
bg-secondary text-secondary-foreground

// Error/destructivo
bg-destructive/10 text-destructive
```

### Clases de utilidad frecuentes

```tsx
// Espaciado
p-4, px-6, py-2, gap-4, space-y-4

// Layout
flex, items-center, justify-between, grid, grid-cols-2

// Tipografía
text-sm, text-xs, font-medium, font-bold, text-muted-foreground

// Bordes
rounded-lg, rounded-xl, rounded-full, border, border-b

// Sombras
ring-1 ring-foreground/10, shadow-md

// Transiciones
transition-all, transition-colors
```
