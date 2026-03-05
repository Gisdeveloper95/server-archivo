# Guía de Despliegue - Server Archivo

## 📋 Descripción

Sistema de gestión de archivos corporativos con Django + React + PostgreSQL + Redis + Nginx.

**Arquitectura**: Aplicación multi-contenedor desplegada con Docker Compose.

---

## 🚀 Pasos para Desplegar

### 1. Prerrequisitos

- **Docker** y **Docker Compose** instalados
- Acceso a la red corporativa (VPN si es necesario)
- Montaje del repositorio corporativo NAS/NetApp configurado

### 2. Configurar el Repositorio NAS (CIFS/SMB)

El sistema requiere acceso al repositorio corporativo montado en el sistema de archivos.

#### 2.1 Crear archivo de credenciales

```bash
sudo bash -c "cat > /etc/cifs.credentials << 'EOF'
username=andres.osorio@igac.gov.co
password=TU_PASSWORD_AQUI
domain=IGAC
EOF"
```

```bash
sudo chmod 600 /etc/cifs.credentials
```

#### 2.2 Crear punto de montaje

```bash
sudo mkdir -p /mnt/repositorio
sudo chown $(whoami):$(whoami) /mnt/repositorio
```

#### 2.3 Agregar a /etc/fstab para montaje automático

```bash
sudo bash -c "echo '//172.21.54.24/DirGesCat /mnt/repositorio cifs credentials=/etc/cifs.credentials,dir_mode=0777,file_mode=0777,uid=1000,gid=1000,sec=ntlmssp,_netdev,x-systemd.automount 0 0' >> /etc/fstab"
```

#### 2.4 Montar el repositorio

```bash
sudo mount -a
```

#### 2.5 Verificar el montaje

```bash
ls -la /mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy
```

### 3. Configurar Variables de Entorno

**IMPORTANTE**: Toda la configuración del sistema se maneja desde el archivo `.env` en la raíz del proyecto.

#### 3.1 Copiar el archivo de ejemplo (si no existe)

El archivo `.env` ya debe existir con valores por defecto. Si no existe:

```bash
cp .env.example .env
```

#### 3.2 Editar el archivo .env

Abrir el archivo `.env` y modificar los siguientes valores según tu entorno:

```bash
nano .env
```

**Variables CRÍTICAS a configurar**:

##### Red y Dominio
```bash
DOMAIN=gestionarchivo.duckdns.org  # O tu dominio/IP
LOCAL_IP=172.29.48.1               # IP local del servidor
HTTP_PORT=80
HTTPS_PORT=443
PROTOCOL=http                       # Cambiar a 'https' si tienes SSL
```

##### Base de Datos (CAMBIAR CONTRASEÑA EN PRODUCCIÓN)
```bash
POSTGRES_DB=gestion_archivo_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO_AQUI  # ⚠️ CAMBIAR
```

##### Django (CAMBIAR SECRETS EN PRODUCCIÓN)
```bash
DJANGO_SECRET_KEY=TU_DJANGO_SECRET_KEY_ALEATORIO_AQUI  # ⚠️ CAMBIAR
DEBUG=False  # ⚠️ DESACTIVAR EN PRODUCCIÓN
ALLOWED_HOSTS=localhost,127.0.0.1,TU_DOMINIO_O_IP_AQUI
```

##### JWT (CAMBIAR EN PRODUCCIÓN)
```bash
JWT_SECRET_KEY=TU_JWT_SECRET_KEY_ALEATORIO_AQUI  # ⚠️ CAMBIAR
```

##### Repositorio NAS
```bash
NETAPP_BASE_PATH=/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy
SMB_SERVER=172.21.54.24
SMB_SHARE=DirGesCat
```

##### CORS (agregar todos los dominios desde donde se accederá)
```bash
CORS_ALLOWED_ORIGINS=http://localhost,http://TU_DOMINIO,https://TU_DOMINIO
```

##### SSL/TLS (si usas HTTPS)
```bash
SSL_ENABLED=true
SSL_CERTIFICATE_PATH=/etc/nginx/ssl/certificate.crt
SSL_CERTIFICATE_KEY_PATH=/etc/nginx/ssl/private.key
SSL_CA_BUNDLE_PATH=/etc/nginx/ssl/ca_bundle.crt
```

### 4. Colocar Certificados SSL (solo si usas HTTPS)

Si `SSL_ENABLED=true` en el `.env`, colocar los certificados:

```bash
mkdir -p nginx/ssl
cp /ruta/a/certificate.crt nginx/ssl/
cp /ruta/a/private.key nginx/ssl/
cp /ruta/a/ca_bundle.crt nginx/ssl/
chmod 600 nginx/ssl/private.key
```

### 5. Verificar la Configuración

Antes de levantar los contenedores, verificar que todas las variables se lean correctamente:

```bash
docker compose config
```

Este comando mostrará la configuración final con todas las variables sustituidas. Revisar que:
- Las contraseñas se hayan cargado correctamente
- Las rutas del NAS sean correctas
- Los puertos estén bien configurados
- Los dominios en ALLOWED_HOSTS y CORS_ALLOWED_ORIGINS sean correctos

### 6. Levantar los Servicios

```bash
docker compose up -d
```

### 7. Verificar el Estado de los Contenedores

```bash
docker compose ps
```

Todos los contenedores deben estar en estado `running (healthy)`.

### 8. Ver los Logs

Para ver los logs en tiempo real:

```bash
docker compose logs -f
```

Para ver logs de un servicio específico:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
```

### 9. Acceder a la Aplicación

Abrir en el navegador:

```
http://TU_DOMINIO_O_IP
```

O si usas HTTPS:

```
https://TU_DOMINIO_O_IP
```

---

## 🔧 Comandos Útiles

### Detener los servicios
```bash
docker compose down
```

### Reiniciar un servicio específico
```bash
docker compose restart backend
docker compose restart frontend
docker compose restart nginx
```

### Reconstruir contenedores (después de cambios en código)
```bash
docker compose up -d --build
```

### Ejecutar migraciones de base de datos
```bash
docker compose exec backend python manage.py migrate
```

### Crear superusuario de Django
```bash
docker compose exec backend python manage.py createsuperuser
```

### Ver logs de un contenedor
```bash
docker compose logs -f backend
```

### Acceder a la shell de un contenedor
```bash
docker compose exec backend bash
docker compose exec frontend sh
```

### Ver uso de recursos
```bash
docker stats
```

---

## 🔐 Checklist de Seguridad para Producción

Antes de desplegar en producción, verificar:

- [ ] `DEBUG=False` en `.env`
- [ ] `DJANGO_SECRET_KEY` cambiado a valor aleatorio
- [ ] `JWT_SECRET_KEY` cambiado a valor aleatorio
- [ ] `POSTGRES_PASSWORD` cambiado a contraseña segura
- [ ] `EMAIL_HOST_PASSWORD` configurado con credenciales reales
- [ ] `ALLOWED_HOSTS` incluye solo dominios/IPs autorizados
- [ ] `CORS_ALLOWED_ORIGINS` incluye solo orígenes autorizados
- [ ] Certificados SSL válidos colocados en `nginx/ssl/`
- [ ] `SSL_ENABLED=true` y `PROTOCOL=https` si usas HTTPS
- [ ] Firewall configurado para permitir solo puertos 80/443
- [ ] Backup automático de `/postgres_data` configurado

---

## 📊 Monitoreo

### Verificar salud de los servicios

```bash
# PostgreSQL
docker compose exec postgres pg_isready -U postgres

# Redis
docker compose exec redis redis-cli ping

# Backend (Django)
curl http://localhost:8000/api/health

# Frontend
curl http://localhost:4545
```

### Espacio en disco

```bash
df -h
du -sh postgres_data redis_data
```

---

## 🐛 Solución de Problemas

### Los contenedores no inician

1. Verificar logs: `docker compose logs`
2. Verificar que el puerto no esté ocupado: `sudo netstat -tlnp | grep :80`
3. Verificar permisos del montaje NAS: `ls -la /mnt/repositorio`

### Error de conexión a la base de datos

1. Verificar que postgres esté healthy: `docker compose ps`
2. Verificar credenciales en `.env`
3. Ver logs de postgres: `docker compose logs postgres`

### No se puede acceder desde red externa

1. Verificar `ALLOWED_HOSTS` en `.env` incluye el dominio/IP
2. Verificar `CORS_ALLOWED_ORIGINS` en `.env`
3. Verificar firewall: `sudo ufw status`
4. Verificar que nginx esté escuchando: `docker compose exec nginx netstat -tlnp`

### Problemas con el repositorio NAS

1. Verificar montaje: `mount | grep repositorio`
2. Verificar permisos: `ls -la /mnt/repositorio`
3. Verificar credenciales: `cat /etc/cifs.credentials`
4. Intentar remontar: `sudo umount /mnt/repositorio && sudo mount -a`

---

## 📝 Notas Adicionales

### Backup de la Base de Datos

```bash
# Crear backup
docker compose exec postgres pg_dump -U postgres gestion_archivo_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_20231201.sql | docker compose exec -T postgres psql -U postgres gestion_archivo_db
```

### Actualización del Sistema

1. Hacer backup de la base de datos
2. Detener servicios: `docker compose down`
3. Actualizar código (git pull o copiar archivos)
4. Reconstruir: `docker compose up -d --build`
5. Verificar logs: `docker compose logs -f`

### Variables de Entorno Importantes

Todas las variables están documentadas en el archivo `.env`. Las secciones incluyen:

- **Red y Dominio**: DOMAIN, LOCAL_IP, HTTP_PORT, HTTPS_PORT, PROTOCOL
- **Base de Datos**: POSTGRES_*
- **Redis**: REDIS_HOST, REDIS_PORT
- **Django**: DJANGO_SECRET_KEY, DEBUG, ALLOWED_HOSTS
- **Frontend**: VITE_API_URL
- **JWT**: JWT_SECRET_KEY, JWT_ACCESS_TOKEN_LIFETIME_MINUTES
- **Email**: EMAIL_HOST, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD
- **GROQ AI**: GROQ_API_KEYS, GROQ_MODEL
- **NAS**: NETAPP_BASE_PATH, SMB_SERVER
- **SSL**: SSL_ENABLED, SSL_CERTIFICATE_PATH
- **CORS**: CORS_ALLOWED_ORIGINS

---

## 📞 Soporte

Para reportar problemas o solicitar ayuda, contactar al equipo de desarrollo.

---

**Última actualización**: 2025-12-30
