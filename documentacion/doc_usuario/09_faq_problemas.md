# 10. Preguntas Frecuentes (FAQ)

## 10.1 Acceso y Cuenta

### ¿Cómo obtengo acceso al sistema?

Solicite una cuenta a través de su jefe inmediato, quien enviará la solicitud al administrador del sistema (sistemas@igac.gov.co). Recibirá un correo con sus credenciales.

### ¿Olvidé mi contraseña, qué hago?

1. En la pantalla de inicio de sesión, haga clic en **"¿Olvidó su contraseña?"**
2. Ingrese su correo institucional
3. Recibirá un enlace para restablecerla

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📧 Se ha enviado un correo a j***@igac.gov.co                  │
│                                                                  │
│  Revise su bandeja de entrada y siga las instrucciones.         │
│  El enlace expira en 24 horas.                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ¿Por qué me sale "acceso denegado" a una carpeta?

Su cuenta puede no tener permisos para esa carpeta. Contacte a su administrador para solicitar acceso.

### ¿Puedo acceder desde mi celular?

Sí, el sistema es compatible con navegadores móviles. Sin embargo, recomendamos usar un computador para una mejor experiencia.

---

## 10.2 Archivos y Carpetas

### ¿Cuál es el tamaño máximo de archivo que puedo subir?

El límite es de **100 MB por archivo**. Para archivos más grandes, comprima en partes o contacte al administrador.

### ¿Qué tipos de archivo puedo subir?

Se permiten la mayoría de formatos comunes:
- Documentos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Imágenes: PNG, JPG, GIF, TIFF
- Comprimidos: ZIP, RAR, 7Z
- Datos: CSV, JSON, XML
- Geográficos: SHP, GDB, GPKG

### ¿Por qué mi archivo se renombró automáticamente?

El sistema aplica las **normas de nomenclatura IGAC** automáticamente. Esto asegura:
- Fecha al inicio (YYYYMMDD)
- Sin espacios ni caracteres especiales
- Todo en minúsculas

### ¿Puedo recuperar un archivo que eliminé?

Sí, los archivos eliminados van a la **Papelera** donde permanecen 30 días. Después de ese tiempo, se eliminan permanentemente.

### ¿Cómo busco un archivo específico?

Use la **búsqueda global** (🔍 en el menú lateral) para buscar en todo el sistema, o la búsqueda rápida en la barra superior para buscar en la carpeta actual.

---

## 10.3 Compartir Archivos

### ¿Cómo comparto un archivo con alguien externo?

1. Haga clic derecho en el archivo
2. Seleccione **🔗 Compartir**
3. Configure la expiración y contraseña (opcional)
4. Copie el enlace generado y envíelo

### ¿El destinatario necesita cuenta para descargar?

No, cualquier persona con el enlace puede descargar el archivo (a menos que esté protegido con contraseña).

### ¿Puedo ver quién descargó mi archivo compartido?

Sí, en **Perfil > Mis enlaces compartidos** puede ver las estadísticas de descargas.

### ¿Cómo elimino un enlace compartido?

Vaya a **Perfil > Mis enlaces compartidos**, seleccione el enlace y haga clic en **🗑️ Eliminar**.

---

## 10.4 Renombramiento Inteligente

### ¿Puedo desactivar el renombramiento automático?

Sí, en **Perfil > Configuración > Renombramiento Inteligente** puede configurarlo para que siempre pregunte antes de renombrar.

### ¿Por qué la fecha que agrega no es la correcta?

Por defecto, el sistema usa la fecha actual. Si desea usar la fecha de creación del archivo, cambie la configuración en su perfil.

### ¿Qué significan los códigos de error en el renombramiento?

| Código | Significado |
|--------|-------------|
| E01 | Contiene espacios |
| E02 | Caracteres especiales no permitidos |
| E03 | Sin fecha al inicio |
| E04 | Formato de fecha incorrecto |
| E05 | Letras consecutivas repetidas |
| E06 | Muy largo (máximo 100 caracteres) |

---

## 10.5 Rendimiento y Técnicos

### ¿Por qué la carga es lenta?

Posibles causas:
- Archivos muy grandes
- Conexión a internet lenta
- Muchos archivos simultáneos

**Solución**: Suba archivos de uno en uno o comprima varios archivos pequeños en un ZIP.

### ¿Por qué no puedo ver la previsualización de un archivo?

No todos los formatos son compatibles con previsualización. Los formatos soportados son: PDF, imágenes (PNG, JPG), documentos Office y texto.

### ¿Cuánto espacio tengo disponible?

Consulte con su administrador. El espacio se asigna por dependencia, no por usuario individual.

---

# 11. Solución de Problemas

## 11.1 Problemas de Acceso

### "Usuario o contraseña incorrectos"

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ❌ Usuario o contraseña incorrectos                             │
│                                                                  │
│  Verifique:                                                      │
│  • ¿Está usando su correo institucional completo?              │
│  • ¿Las mayúsculas/minúsculas son correctas?                   │
│  • ¿No tiene activado Bloq Mayús?                              │
│                                                                  │
│  Si el problema persiste:                                        │
│  → Use "¿Olvidó su contraseña?" para restablecerla             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "Su cuenta ha sido desactivada"

Contacte al administrador del sistema. Su cuenta puede haber sido desactivada por:
- Inactividad prolongada
- Cambio de dependencia
- Solicitud administrativa

### "Sesión expirada"

Su sesión se cierra automáticamente después de un período de inactividad (generalmente 30 minutos). Simplemente inicie sesión nuevamente.

---

## 11.2 Problemas con Archivos

### "Error al subir archivo"

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  POSIBLES CAUSAS Y SOLUCIONES                                    │
│  ────────────────────────────                                    │
│                                                                  │
│  1. Archivo muy grande (> 100 MB)                               │
│     → Comprima el archivo o divídalo en partes                  │
│                                                                  │
│  2. Tipo de archivo no permitido                                │
│     → Verifique que la extensión esté permitida                 │
│                                                                  │
│  3. Nombre de archivo con caracteres especiales                 │
│     → Renombre el archivo antes de subirlo                      │
│                                                                  │
│  4. Conexión interrumpida                                       │
│     → Verifique su conexión e intente nuevamente               │
│                                                                  │
│  5. Sin espacio disponible                                      │
│     → Contacte al administrador                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "No tiene permisos para esta operación"

Usted no tiene los permisos necesarios para realizar esa acción en esa carpeta. Opciones:
- Solicite permisos adicionales a su administrador
- Trabaje en una carpeta donde sí tenga permisos

### "El archivo ya existe"

Ya hay un archivo con ese nombre en la carpeta. Opciones:
- Renombre su archivo antes de subirlo
- Seleccione "Reemplazar" si desea sobrescribir
- Seleccione "Agregar número" para crear una copia

---

## 11.3 Problemas de Visualización

### "La página no carga correctamente"

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  PASOS PARA SOLUCIONAR                                           │
│  ─────────────────────                                           │
│                                                                  │
│  1. Presione Ctrl + F5 para recargar completamente              │
│                                                                  │
│  2. Borre la caché del navegador:                               │
│     Chrome: Ctrl + Shift + Delete                               │
│     Firefox: Ctrl + Shift + Delete                              │
│     Edge: Ctrl + Shift + Delete                                 │
│                                                                  │
│  3. Intente con otro navegador                                  │
│                                                                  │
│  4. Verifique su conexión a internet                            │
│                                                                  │
│  5. Si persiste, contacte a soporte                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "Los iconos o imágenes no aparecen"

Esto puede deberse a:
- Conexión lenta: Espere a que cargue completamente
- Caché corrupta: Borre la caché del navegador
- Navegador desactualizado: Actualice su navegador

### "El sistema se ve diferente / desordenado"

Verifique:
- Que su navegador esté actualizado
- Que no tenga zoom activado (Ctrl + 0 para restablecer)
- Que la resolución de pantalla sea al menos 1280x720

---

## 11.4 Problemas de Descarga

### "La descarga no inicia"

1. Verifique que su navegador no esté bloqueando descargas
2. Desactive temporalmente el bloqueador de ventanas emergentes
3. Intente con clic derecho > "Guardar enlace como..."

### "El archivo descargado está corrupto"

- La descarga pudo haberse interrumpido
- Intente descargar nuevamente
- Si el problema persiste, el archivo puede estar dañado en el servidor

### "El ZIP descargado está vacío"

Esto puede ocurrir si:
- Los archivos fueron eliminados antes de completar la descarga
- Hubo un error de conexión durante la generación del ZIP

---

## 11.5 Problemas con Enlaces Compartidos

### "El enlace no funciona"

Posibles causas:
- **Enlace expirado**: El enlace tiene fecha de vencimiento
- **Límite de descargas alcanzado**: Se agotaron las descargas permitidas
- **Enlace eliminado**: El creador eliminó el enlace

### "Pide contraseña pero no la tengo"

Contacte a la persona que le compartió el enlace para obtener la contraseña.

---

## 11.6 Contactar Soporte

Si ninguna de las soluciones anteriores resuelve su problema:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTACTAR SOPORTE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📧 Correo: sistemas@igac.gov.co                                │
│                                                                  │
│  📋 Información a incluir:                                       │
│                                                                  │
│  1. Su nombre y correo institucional                            │
│  2. Descripción detallada del problema                          │
│  3. Pasos para reproducir el error                              │
│  4. Captura de pantalla del error (si es posible)              │
│  5. Navegador y sistema operativo que usa                       │
│  6. Fecha y hora aproximada del problema                        │
│                                                                  │
│  ⏰ Horario de atención: Lunes a Viernes 8:00 - 17:00           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11.7 Códigos de Error Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| **400** | Solicitud incorrecta | Verifique los datos ingresados |
| **401** | No autorizado | Inicie sesión nuevamente |
| **403** | Acceso denegado | No tiene permisos suficientes |
| **404** | No encontrado | El archivo/carpeta no existe |
| **408** | Tiempo agotado | Conexión lenta, reintente |
| **413** | Archivo muy grande | Reduzca el tamaño del archivo |
| **500** | Error del servidor | Reporte a soporte técnico |
| **502** | Servidor no disponible | Intente más tarde |
| **503** | Servicio en mantenimiento | Espere a que finalice |

---

# Glosario

| Término | Definición |
|---------|------------|
| **Breadcrumb** | Ruta de navegación que muestra su ubicación actual |
| **Caché** | Datos temporales guardados en su navegador |
| **Dashboard** | Panel principal con resumen de información |
| **Drag & Drop** | Arrastrar y soltar con el mouse |
| **Favoritos** | Carpetas marcadas para acceso rápido |
| **Papelera** | Ubicación temporal de archivos eliminados |
| **Permisos** | Nivel de acceso a carpetas y archivos |
| **Previsualización** | Vista rápida de un archivo sin descargarlo |
| **Renombramiento inteligente** | Sistema automático de nombres normalizados |
| **ZIP** | Formato de archivo comprimido |

---

**FIN DEL MANUAL**

---

| Campo | Valor |
|-------|-------|
| **Versión** | 1.0.0 |
| **Fecha** | Enero 2025 |
| **Autor** | Dirección de Gestión Catastral - IGAC |
| **Soporte** | sistemas@igac.gov.co |

---

*© 2025 Instituto Geográfico Agustín Codazzi. Todos los derechos reservados.*
