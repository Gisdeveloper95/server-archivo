# Instrucciones para Generar y Configurar Certificados SSL

**Fecha**: 30 de Diciembre de 2025
**Proyecto**: Server Archivo

---

## 📋 Resumen

Este documento te guía paso a paso para obtener certificados SSL firmados por una CA externa y configurarlos en el servidor.

---

## 🎯 Opción 1: Certbot (Let's Encrypt) - RECOMENDADO

### Requisitos Previos

1. ✅ Dominio público accesible (ej: `gestionarchivo.duckdns.org`)
2. ✅ Acceso a internet SIN firewall corporativo
3. ✅ Puerto 80 o 443 abierto y accesible desde internet

### ⚠️ IMPORTANTE

**El firewall del IGAC bloquea DuckDNS**, por lo que necesitas:
- Ejecutar desde **fuera de la red del IGAC** (casa, móvil, etc.)
- O usar una red que NO tenga firewall corporativo

---

## 📝 Pasos Detallados

### Paso 1: Ejecutar el Script en Windows

1. **Descarga el archivo** desde WSL a Windows:
   ```bash
   # Desde WSL
   cp /home/andres/server_archivo/documentacion/generar_certificados_ssl.bat /mnt/c/Users/TuUsuario/Desktop/
   ```

2. **Ejecuta como Administrador**:
   - Click derecho en `generar_certificados_ssl.bat`
   - "Ejecutar como administrador"

3. **Sigue las instrucciones** del script:
   - Ingresa tu dominio: `gestionarchivo.duckdns.org`
   - Ingresa tu email: `andres.osorio@igac.gov.co`

### Paso 2: Certbot Generará los Certificados

El script ejecutará:

```cmd
certbot certonly --standalone --preferred-challenges http -d gestionarchivo.duckdns.org --email andres.osorio@igac.gov.co --agree-tos --no-eff-email
```

**Certbot creará**:
- `fullchain.pem` → Certificado público completo
- `privkey.pem` → Clave privada
- `chain.pem` → Cadena de certificación

### Paso 3: Certificados se Copiarán Automáticamente

El script copiará los certificados a:

```
C:\Users\TuUsuario\Desktop\certificados_ssl\
├── certificate.crt    (certificado público)
├── private.key        (clave privada)
└── ca_bundle.crt      (cadena CA)
```

### Paso 4: Transferir Certificados a WSL

**Opción A - Desde Windows Explorer**:

1. Abre el explorador de archivos
2. En la barra de direcciones escribe: `\\wsl$\Ubuntu\home\andres\server_archivo\`
3. Arrastra la carpeta `certificados_ssl` allí

**Opción B - Desde WSL**:

```bash
# Copiar desde Windows a WSL
cp -r /mnt/c/Users/TuUsuario/Desktop/certificados_ssl /home/andres/server_archivo/nginx/ssl
```

---

## 🌐 Opción 2: Alternativas Web (Si Certbot Falla)

Si Certbot no funciona por el firewall, usa servicios web:

### 2A. ZeroSSL (Recomendado)

**URL**: https://zerossl.com/

**Pasos**:
1. Crea cuenta gratis
2. Click en "New Certificate"
3. Ingresa dominio: `gestionarchivo.duckdns.org`
4. Selecciona validación: **DNS** (más fácil con DuckDNS)
5. ZeroSSL te dará un registro TXT para agregar
6. Ve a DuckDNS y agrega el registro TXT
7. Espera validación (5-10 minutos)
8. Descarga certificados

**Archivos descargados**:
- `certificate.crt`
- `private.key`
- `ca_bundle.crt`

### 2B. SSLForFree.com

**URL**: https://www.sslforfree.com/

Similar a ZeroSSL pero interfaz más simple.

### 2C. SSL.com

**URL**: https://www.ssl.com/

Certificados de 90 días gratis con validación por email.

---

## 📂 Estructura Final de Archivos

Después de copiar, deberías tener:

```
/home/andres/server_archivo/
├── nginx/
│   └── ssl/                          ← CREAR SI NO EXISTE
│       ├── certificate.crt           ← Certificado público
│       ├── private.key               ← Clave privada (600 permisos)
│       └── ca_bundle.crt             ← Cadena CA (opcional)
└── documentacion/
    ├── generar_certificados_ssl.bat
    └── INSTRUCCIONES_SSL.md
```

---

## 🔧 Configuración Automática en Nginx

Una vez tengas los certificados en `/home/andres/server_archivo/nginx/ssl/`, avísame y yo:

1. ✅ Actualizaré `nginx/conf.d/default.conf` con configuración HTTPS
2. ✅ Agregaré redirección HTTP → HTTPS
3. ✅ Montaré los certificados en docker-compose
4. ✅ Actualizaré las URLs del frontend (.env)
5. ✅ Reiniciaré los servicios

---

## 🛠️ Verificación de Certificados

Antes de configurar, verifica que los archivos sean correctos:

```bash
# Ver información del certificado
openssl x509 -in nginx/ssl/certificate.crt -text -noout

# Verificar que la clave privada coincide con el certificado
openssl x509 -noout -modulus -in nginx/ssl/certificate.crt | openssl md5
openssl rsa -noout -modulus -in nginx/ssl/private.key | openssl md5
# Los hashes MD5 deben ser IGUALES

# Ver fechas de validez
openssl x509 -in nginx/ssl/certificate.crt -noout -dates
```

---

## ⏰ Renovación de Certificados

Let's Encrypt certificados vencen en **90 días**.

### Renovación Manual

```cmd
REM Ejecutar en Windows como Administrador
certbot renew

REM Copiar certificados renovados
copy "C:\Certbot\live\gestionarchivo.duckdns.org\fullchain.pem" "certificados_ssl\certificate.crt"
copy "C:\Certbot\live\gestionarchivo.duckdns.org\privkey.pem" "certificados_ssl\private.key"
```

Luego copiar nuevamente a WSL y reiniciar nginx.

### Renovación Automática

Crear tarea programada en Windows que ejecute:

```cmd
certbot renew --quiet
```

Cada 60 días.

---

## 🚨 Troubleshooting

### Error: Puerto 80 en uso

**Solución**: Detén servicios que usen puerto 80 temporalmente:

```bash
# En WSL, detener nginx
docker compose stop nginx

# Ejecutar certbot
# ...

# Reiniciar nginx
docker compose start nginx
```

### Error: Firewall bloqueando

**Solución**: Ejecuta desde fuera de la red del IGAC (tethering móvil, casa, etc.)

### Error: Dominio no resuelve

**Solución**: Verifica que el dominio apunte a tu IP pública actual:

```cmd
# Ver tu IP pública
curl https://api.ipify.org

# Actualizar DuckDNS
curl "https://www.duckdns.org/update?domains=gestionarchivo&token=3fbbdfef-c2f7-4194-915e-930d6123a5dd&ip=TU_IP_PUBLICA"
```

### Certificado inválido

**Solución**: Verifica la cadena completa en `certificate.crt`:

```bash
# Debe contener:
# 1. Tu certificado
# 2. Certificado intermedio
# 3. Certificado raíz (opcional)

cat nginx/ssl/certificate.crt nginx/ssl/ca_bundle.crt > nginx/ssl/fullchain.crt
```

---

## 📞 Checklist Final

Antes de avisarme que tienes los certificados:

- [ ] Archivos en `/home/andres/server_archivo/nginx/ssl/`
- [ ] `certificate.crt` existe y es válido
- [ ] `private.key` existe con permisos 600
- [ ] `ca_bundle.crt` existe (opcional)
- [ ] Verificaste que certificado y clave coinciden (MD5)
- [ ] Certificado NO ha expirado (verificaste fechas)

---

## 📧 Siguiente Paso

**Cuando tengas los certificados listos**, avísame con:

> "Certificados listos en nginx/ssl/"

Y yo me encargaré de:
1. Configurar nginx para HTTPS
2. Actualizar docker-compose
3. Modificar frontend para usar HTTPS
4. Reiniciar servicios
5. Probar que funcione correctamente

---

## 📚 Referencias

- **Certbot**: https://certbot.eff.org/
- **Let's Encrypt**: https://letsencrypt.org/
- **ZeroSSL**: https://zerossl.com/
- **DuckDNS**: https://www.duckdns.org/

---

**FIN DEL DOCUMENTO**
