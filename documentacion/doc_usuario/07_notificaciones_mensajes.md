# 8. Notificaciones y Mensajes

## 8.1 Sistema de Notificaciones

El sistema le mantiene informado sobre eventos importantes mediante **notificaciones** en tiempo real.

### Tipos de notificaciones

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIPOS DE NOTIFICACIONES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ℹ️ INFORMACIÓN                                                  │
│  ─────────────                                                   │
│  Eventos informativos generales                                  │
│  Ejemplo: "Su archivo se ha subido correctamente"               │
│                                                                  │
│  ✓ ÉXITO                                                        │
│  ───────                                                        │
│  Operaciones completadas exitosamente                           │
│  Ejemplo: "Archivo renombrado correctamente"                    │
│                                                                  │
│  ⚠️ ADVERTENCIA                                                  │
│  ─────────────                                                   │
│  Situaciones que requieren su atención                          │
│  Ejemplo: "El archivo será eliminado en 3 días"                 │
│                                                                  │
│  ❌ ERROR                                                        │
│  ────────                                                        │
│  Problemas que impiden una operación                            │
│  Ejemplo: "No se pudo subir el archivo"                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Ver notificaciones

Haga clic en el ícono de **🔔 campana** en la barra superior:

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 IGAC                              🔔 3  👤 Juan Pérez  🚪   │
│                                        ↑                        │
│                                        Número de notificaciones │
│                                        sin leer                  │
└─────────────────────────────────────────────────────────────────┘

                            ↓ Clic en la campana

┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICACIONES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ● ✓ Archivo subido exitosamente                 Hace 5 min  ││
│  │     20250107_informe.pdf se ha subido a /Documentos         ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ● ⚠️ Enlace por expirar                         Hace 1 hora ││
│  │     El enlace de datos.xlsx expira mañana                   ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ● ℹ️ Nuevo mensaje del administrador            Hace 2 horas││
│  │     Mantenimiento programado para el viernes               ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ○ ✓ Carpeta creada                              Ayer        ││
│  │     Catastro_2025 creada en /Proyectos                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ● = No leída    ○ = Leída                                      │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │ ✓ Marcar leídas   │  │ Ver todas         │                   │
│  └───────────────────┘  └───────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Centro de notificaciones

Para ver el historial completo, vaya a **🔔 Alertas** en el menú lateral:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CENTRO DE ALERTAS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Filtrar por:  [Todas ▼]  [Esta semana ▼]                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  HOY                                                         ││
│  │  ────                                                        ││
│  │  09:30  ✓  Archivo subido: 20250107_informe.pdf             ││
│  │  09:15  ✓  Sesión iniciada desde Chrome/Windows             ││
│  │                                                              ││
│  │  AYER                                                        ││
│  │  ────                                                        ││
│  │  16:45  ⚠️ Archivo movido a papelera: datos_antiguos.xlsx   ││
│  │  14:20  ✓  Carpeta creada: Catastro_2025                    ││
│  │  10:00  ℹ️ Mensaje del sistema: Actualización disponible    ││
│  │                                                              ││
│  │  ESTA SEMANA                                                 ││
│  │  ───────────                                                 ││
│  │  05/01  ✓  3 archivos renombrados automáticamente           ││
│  │  04/01  ℹ️ Enlace compartido descargado 5 veces             ││
│  │  03/01  ⚠️ Intento de acceso desde ubicación desconocida    ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Mostrando 10 de 45 alertas  │  ◀ 1 2 3 4 5 ▶                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8.2 Sistema de Mensajes

Los **mensajes** son comunicaciones importantes enviadas por el administrador del sistema o generadas automáticamente.

### Ver mensajes

Acceda a través de **💬 Mensajes** en el menú lateral:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BANDEJA DE MENSAJES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Recibidos (3)  │  Enviados  │  Importantes  │  Archivados      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ● De: Administrador del Sistema           07/01/2025 08:00  ││
│  │   Asunto: Mantenimiento programado                          ││
│  │   El sistema estará en mantenimiento el viernes de 22:00... ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ● De: Sistema Automático                  05/01/2025 10:30  ││
│  │   Asunto: Resumen semanal de actividad                      ││
│  │   Esta semana usted subió 15 archivos y descargó 8...       ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ○ De: Administrador del Sistema           03/01/2025 14:00  ││
│  │   Asunto: Bienvenido al nuevo sistema                       ││
│  │   Hemos actualizado el sistema de gestión de archivos...    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ● = No leído    ○ = Leído                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Leer un mensaje

Haga clic en cualquier mensaje para abrirlo:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MENSAJE                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  De:      Administrador del Sistema                             │
│  Fecha:   07/01/2025 08:00                                      │
│  Asunto:  Mantenimiento programado                              │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Estimados usuarios,                                             │
│                                                                  │
│  Les informamos que el sistema estará en mantenimiento          │
│  programado el próximo viernes 10 de enero de 2025, desde       │
│  las 22:00 hasta las 02:00 del sábado.                          │
│                                                                  │
│  Durante este período:                                           │
│  • El sistema no estará disponible                              │
│  • Las descargas en progreso se cancelarán                      │
│  • Los enlaces compartidos seguirán funcionando                 │
│                                                                  │
│  Recomendamos guardar su trabajo antes de las 21:30.            │
│                                                                  │
│  Atentamente,                                                    │
│  Equipo de Sistemas IGAC                                        │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ ↩️ Responder  │  │ ⭐ Importante │  │ 📁 Archivar  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Marcar como importante

Para no perder mensajes importantes:

1. Abra el mensaje
2. Haga clic en **⭐ Importante**
3. El mensaje aparecerá en la pestaña "Importantes"

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ⭐ Mensaje marcado como importante                              │
│                                                                  │
│  Puede encontrarlo en la pestaña "Importantes"                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8.3 Configurar Notificaciones

Personalice qué notificaciones desea recibir:

1. Vaya a **Perfil > Configuración > Notificaciones**

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN DE NOTIFICACIONES               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NOTIFICACIONES EN LA APLICACIÓN                                 │
│  ──────────────────────────────                                  │
│                                                                  │
│  [✓] Archivos subidos exitosamente                              │
│  [✓] Archivos eliminados                                        │
│  [✓] Archivos renombrados automáticamente                       │
│  [✓] Enlaces compartidos próximos a expirar                     │
│  [✓] Enlaces compartidos descargados                            │
│  [ ] Inicio de sesión desde nuevo dispositivo                   │
│  [✓] Mensajes del administrador                                 │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  NOTIFICACIONES POR CORREO                                       │
│  ─────────────────────────                                       │
│                                                                  │
│  [✓] Resumen semanal de actividad                               │
│  [ ] Cada archivo subido                                        │
│  [✓] Alertas de seguridad                                       │
│  [✓] Mensajes importantes del administrador                     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  FRECUENCIA DE RESÚMENES                                         │
│  ───────────────────────                                         │
│                                                                  │
│  ○ Diario                                                       │
│  ● Semanal                                                      │
│  ○ Mensual                                                      │
│  ○ Nunca                                                        │
│                                                                  │
│  ┌───────────────┐                                              │
│  │ ✓ Guardar     │                                              │
│  └───────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8.4 Notificaciones en Tiempo Real

Las notificaciones aparecen automáticamente mientras usa el sistema:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ✓ Archivo subido exitosamente                        ✕    │ │
│  │   20250107_informe.pdf                                    │ │
│  │   ─────────────────────────────────────────────           │ │
│  │   Se desvanece en 5 segundos...                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Las notificaciones aparecen en la esquina superior derecha     │
│  y desaparecen automáticamente después de unos segundos.        │
│                                                                  │
│  Puede hacer clic en ✕ para cerrarlas inmediatamente.           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Notificaciones apiladas

Si ocurren varias notificaciones seguidas:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         ┌──────────────────────────────────────┐│
│                         │ ✓ 3 archivos subidos          ✕     ││
│                         │   informe.pdf, datos.xlsx, mapa.png ││
│                         └──────────────────────────────────────┘│
│                         ┌──────────────────────────────────────┐│
│                         │ ✓ Carpeta creada              ✕     ││
│                         │   Catastro_2025                     ││
│                         └──────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8.5 Alertas de Seguridad

El sistema le notificará sobre eventos de seguridad importantes:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALERTA DE SEGURIDAD                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️ Inicio de sesión desde nueva ubicación                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  Detectamos un inicio de sesión desde una ubicación         ││
│  │  que no reconocemos:                                         ││
│  │                                                              ││
│  │  📍 Ubicación: Bogotá, Colombia                              ││
│  │  💻 Dispositivo: Chrome en Windows 11                        ││
│  │  🕐 Fecha/Hora: 07/01/2025 14:30                             ││
│  │  🌐 IP: 190.xxx.xxx.xxx                                      ││
│  │                                                              ││
│  │  ¿Fue usted?                                                 ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────────────────┐           │
│  │ ✓ Sí, fui yo    │  │ ⚠️ No, asegurar mi cuenta   │           │
│  └─────────────────┘  └─────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tipos de alertas de seguridad

| Alerta | Descripción |
|--------|-------------|
| **Nuevo dispositivo** | Inicio de sesión desde navegador/dispositivo nuevo |
| **Nueva ubicación** | Acceso desde IP o ciudad diferente |
| **Múltiples intentos** | Varios intentos de contraseña incorrecta |
| **Cambio de contraseña** | Confirmación de cambio de contraseña |
| **Sesión cerrada** | Su sesión fue cerrada en otro dispositivo |

---

## 8.6 Resumen de Iconos

| Ícono | Significado |
|-------|-------------|
| 🔔 | Centro de notificaciones |
| 💬 | Mensajes |
| ● | No leído |
| ○ | Leído |
| ✓ | Éxito/Completado |
| ⚠️ | Advertencia |
| ❌ | Error |
| ℹ️ | Información |
| ⭐ | Importante/Favorito |

---

*Continúe con la siguiente sección para aprender sobre las funciones de Administración.*
