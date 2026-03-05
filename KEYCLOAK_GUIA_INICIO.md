# 🔐 Guía de Keycloak - Configuración Inicial

## ✅ Estado: Keycloak instalado en modo PRUEBAS

Keycloak está corriendo en modo desarrollo local para que puedas probarlo y familiarizarte con él antes de la integración con Azure AD.

---

## 🌐 Acceso a Keycloak Admin Console

### **URL de acceso:**
```
http://localhost:8085
```

### **Credenciales de administrador:**
```
Usuario: admin
Password: AdminKeycloak2025!
```

**Nota:** Estas credenciales están en `/home/andres/server_archivo/.env` (variables `KEYCLOAK_ADMIN` y `KEYCLOAK_ADMIN_PASSWORD`)

---

## 📋 Primeros Pasos

### **1. Acceder a la consola de administración**
1. Abre tu navegador en Windows
2. Ve a: `http://172.30.51.53:8085` (IP de WSL)
3. Haz clic en "Administration Console"
4. Login con `admin` / `AdminKeycloak2025!`

### **2. Crear tu primer Realm (Espacio de trabajo)**

Un **Realm** es un espacio aislado para gestionar usuarios, aplicaciones y configuraciones.

**Pasos:**
1. En el menú superior izquierdo, haz clic en "Master" (dropdown)
2. Click en "Create Realm"
3. **Name:** `IGAC` (nombre de tu organización)
4. **Enabled:** ON (activado)
5. Click "Create"

### **3. Crear un Client (Aplicación)**

Un **Client** representa cada aplicación que usará Keycloak para autenticación.

**Para server_archivo_frontend:**
1. En el menú lateral → **Clients** → **Create client**
2. **Client ID:** `server_archivo_frontend`
3. **Client type:** `OpenID Connect`
4. Click "Next"
5. **Client authentication:** OFF (porque es un frontend público)
6. **Authorization:** OFF
7. **Authentication flow:**
   - ✅ Standard flow (login web)
   - ✅ Direct access grants (API calls)
8. Click "Next"
9. **Root URL:** `http://172.30.51.53`
10. **Valid redirect URIs:** `http://172.30.51.53/*`
11. **Web origins:** `http://172.30.51.53`
12. Click "Save"

**Para server_archivo_backend:**
1. **Client ID:** `server_archivo_backend`
2. **Client authentication:** ON (porque es un backend confidencial)
3. Guarda el **Client Secret** que se genera (lo necesitarás después)

### **4. Crear usuarios de prueba**

**Pasos:**
1. Menú lateral → **Users** → **Add user**
2. **Username:** `usuario.prueba`
3. **Email:** `usuario.prueba@test.com`
4. **First name:** `Usuario`
5. **Last name:** `Prueba`
6. **Email verified:** ON
7. Click "Create"
8. Ve a la pestaña **Credentials**
9. Click "Set password"
10. **Password:** `Prueba123!`
11. **Temporary:** OFF (para que no pida cambiar contraseña)
12. Click "Save"

### **5. Crear roles**

**Pasos:**
1. Menú lateral → **Realm roles** → **Create role**
2. **Role name:** `admin`
3. **Description:** `Administrador del sistema`
4. Click "Save"

Repite para crear roles:
- `usuario_basico`
- `gestor_archivos`
- `solo_lectura`

### **6. Asignar roles a usuarios**

1. Ve a **Users** → Click en tu usuario de prueba
2. Pestaña **Role mapping**
3. Click "Assign role"
4. Selecciona los roles que quieras asignar
5. Click "Assign"

---

## 🧪 Probar autenticación (sin código aún)

### **Probar login web:**
1. Ve a: `http://172.30.51.53:8085/realms/IGAC/account`
2. Click "Sign in"
3. Login con `usuario.prueba` / `Prueba123!`
4. Deberías ver el portal de usuario de Keycloak

### **Ver token JWT:**
1. Instala extensión de Chrome: "ModHeader" o similar
2. Abre DevTools → Network
3. Haz login
4. Busca la petición a `/token`
5. Verás el JWT en la respuesta

---

## 📚 Conceptos Clave

### **Realm**
Espacio de trabajo aislado. Ejemplo: `IGAC`

### **Client**
Cada aplicación que usa Keycloak:
- `server_archivo_frontend` (React/Vue - público)
- `server_archivo_backend` (Django - confidencial)
- `gestion_dato_frontend` (Vue - público)
- `gestion_dato_backend` (Django - confidencial)

### **User**
Personas que pueden autenticarse

### **Role**
Permisos/grupos. Ejemplo: `admin`, `usuario_basico`

### **Token JWT**
Llave digital que contiene:
- Usuario autenticado
- Roles
- Tiempo de expiración
- Firma criptográfica

---

## 🔄 Próximos pasos (cuando tengas Azure AD)

1. **Configurar Identity Provider:**
   - Menú → Identity Providers → Add provider → Microsoft
   - Pegar Tenant ID, Client ID, Client Secret de Azure

2. **Mapear roles de Azure a Keycloak:**
   - Grupos de Azure AD → Roles de Keycloak

3. **Cambiar hostname en .env:**
   ```bash
   KEYCLOAK_HOSTNAME=keycloak.gestionarchivo.duckdns.org
   ```

4. **Cambiar comando de start:**
   - De `start-dev` a `start` (producción)

5. **Configurar Nginx reverse proxy**

---

## 🛠️ Comandos útiles

### Ver logs de Keycloak:
```bash
docker logs -f server_archivo_keycloak
```

### Reiniciar Keycloak:
```bash
cd /home/andres/server_archivo
docker compose restart keycloak
```

### Acceder a la base de datos de Keycloak:
```bash
docker exec -it server_archivo_postgres psql -U postgres -d keycloak_db
```

### Ver todas las tablas de Keycloak:
```sql
\dt
```

---

## 📖 Recursos adicionales

**Documentación oficial:**
- https://www.keycloak.org/documentation
- https://www.keycloak.org/docs/latest/server_admin/

**Tutoriales:**
- [Keycloak Quick Start](https://www.keycloak.org/getting-started/getting-started-docker)
- [Securing Apps with Keycloak](https://www.keycloak.org/docs/latest/securing_apps/)

**Integración con Django:**
- https://github.com/marcospereirampj/python-keycloak

**Integración con React/Vue:**
- https://www.npmjs.com/package/keycloak-js

---

## ⚠️ Importante - Modo Desarrollo

**Actualmente Keycloak está en modo `start-dev`:**
- ✅ Perfecto para probar y aprender
- ✅ No requiere HTTPS
- ✅ No requiere hostname estricto
- ❌ NO usar en producción
- ❌ Menos seguro

**Cuando pases a producción, cambiar a modo `start`**

---

## 🎯 Tu tarea ahora:

1. ✅ Acceder a `http://172.30.51.53:8085`
2. ✅ Crear Realm "IGAC"
3. ✅ Crear Client "server_archivo_frontend"
4. ✅ Crear usuario de prueba
5. ✅ Probar login en `http://172.30.51.53:8085/realms/IGAC/account`

**¡Explora la interfaz! No puedes romper nada, es solo para pruebas.**

---

## 📞 Cuando tengas los datos de Azure AD

Te pedirán:
- **Redirect URI:** `http://172.30.51.53:8085/realms/IGAC/broker/azure/endpoint`
- **Scopes:** `openid, profile, email`
- **Aplicaciones:** Server Archivo, Gestión Dato

Tú necesitas de ellos:
- **Tenant ID**
- **Client ID**
- **Client Secret**
