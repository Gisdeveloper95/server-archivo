@echo off
REM ============================================================================
REM Script para generar certificados SSL firmados externamente
REM Ejecutar en Windows con privilegios de Administrador
REM ============================================================================

echo.
echo ============================================================================
echo   GENERACION DE CERTIFICADOS SSL PARA SERVIDOR ARCHIVO
echo ============================================================================
echo.
echo Este script te guiara en la generacion de certificados SSL firmados.
echo.
echo REQUISITOS:
echo   1. Tener un dominio publico accesible (ej: gestionarchivo.duckdns.org)
echo   2. Acceso a internet SIN firewall corporativo bloqueando
echo   3. Puerto 80 o 443 accesible desde internet
echo.
echo NOTA: Si el firewall corporativo bloquea esto, NO funcionara.
echo       Necesitas hacerlo desde fuera de la red del IGAC.
echo.
pause

REM ============================================================================
REM OPCION 1: CERTBOT (Let's Encrypt) - GRATIS
REM ============================================================================

echo.
echo ============================================================================
echo   OPCION 1: Certbot (Let's Encrypt) - Certificados GRATIS
echo ============================================================================
echo.
echo Certbot genera certificados SSL gratuitos validos por 90 dias.
echo.
echo PASOS:
echo   1. Instalar Certbot en Windows
echo   2. Ejecutar comando de certificacion
echo   3. Copiar certificados generados
echo.

REM Verificar si certbot esta instalado
where certbot >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Certbot ya esta instalado
    echo.
) else (
    echo [!] Certbot NO esta instalado
    echo.
    echo Descarga Certbot desde:
    echo https://github.com/certbot/certbot/releases
    echo.
    echo O instala con Chocolatey:
    echo   choco install certbot
    echo.
    echo Despues de instalar, ejecuta este script nuevamente.
    echo.
    pause
    exit /b 1
)

REM Solicitar dominio
echo.
set /p DOMAIN="Ingresa tu dominio (ej: gestionarchivo.duckdns.org): "

if "%DOMAIN%"=="" (
    echo [ERROR] Dominio no puede estar vacio
    pause
    exit /b 1
)

echo.
echo Dominio ingresado: %DOMAIN%
echo.

REM Solicitar email
set /p EMAIL="Ingresa tu email para notificaciones: "

if "%EMAIL%"=="" (
    echo [ERROR] Email no puede estar vacio
    pause
    exit /b 1
)

echo.
echo ============================================================================
echo   IMPORTANTE: Metodo de validacion
echo ============================================================================
echo.
echo Certbot necesita validar que controlas el dominio.
echo.
echo Opciones:
echo   1. HTTP (puerto 80) - Requiere que el puerto 80 este abierto
echo   2. DNS - Requiere agregar registro TXT en tu proveedor DNS
echo   3. Standalone - Certbot crea servidor temporal en puerto 80
echo.
echo Para DuckDNS, usa opcion 3 (Standalone)
echo.
pause

REM Crear directorio para certificados
set CERT_DIR=%~dp0certificados_ssl
if not exist "%CERT_DIR%" mkdir "%CERT_DIR%"

echo.
echo ============================================================================
echo   Generando certificados con Certbot...
echo ============================================================================
echo.
echo COMANDO A EJECUTAR:
echo.
echo certbot certonly --standalone ^
echo   --preferred-challenges http ^
echo   -d %DOMAIN% ^
echo   --email %EMAIL% ^
echo   --agree-tos ^
echo   --no-eff-email
echo.
echo IMPORTANTE:
echo   - Asegurate de que el puerto 80 este libre
echo   - El firewall debe permitir conexiones entrantes al puerto 80
echo   - El dominio debe apuntar a tu IP publica actual
echo.
pause

REM Ejecutar certbot
certbot certonly --standalone --preferred-challenges http -d %DOMAIN% --email %EMAIL% --agree-tos --no-eff-email

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Certbot fallo. Posibles causas:
    echo   - Puerto 80 bloqueado
    echo   - Dominio no apunta a tu IP
    echo   - Firewall corporativo bloqueando
    echo.
    echo SOLUCION: Intenta desde fuera de la red del IGAC
    echo.
    pause
    exit /b 1
)

REM Copiar certificados
echo.
echo ============================================================================
echo   Copiando certificados...
echo ============================================================================
echo.

REM Ruta donde Certbot guarda los certificados
set CERTBOT_PATH=C:\Certbot\live\%DOMAIN%

if exist "%CERTBOT_PATH%\fullchain.pem" (
    copy "%CERTBOT_PATH%\fullchain.pem" "%CERT_DIR%\certificate.crt"
    copy "%CERTBOT_PATH%\privkey.pem" "%CERT_DIR%\private.key"
    copy "%CERTBOT_PATH%\chain.pem" "%CERT_DIR%\ca_bundle.crt"

    echo [OK] Certificados copiados a:
    echo      %CERT_DIR%
    echo.
    echo Archivos generados:
    echo   - certificate.crt (certificado publico)
    echo   - private.key (clave privada)
    echo   - ca_bundle.crt (cadena de certificacion)
    echo.
) else (
    echo [!] Certificados no encontrados en %CERTBOT_PATH%
    echo.
    echo Busca manualmente los certificados en:
    echo   C:\Certbot\live\
    echo   C:\ProgramData\Certbot\
    echo.
)

goto :FIN

REM ============================================================================
REM OPCION 2: SSL.COM O SSLFORFREE.COM (Alternativa)
REM ============================================================================

:OPCION_ALTERNATIVA
echo.
echo ============================================================================
echo   OPCION 2: SSL.com o SSLForFree.com
echo ============================================================================
echo.
echo Si Certbot no funciona, puedes usar:
echo.
echo 1. SSL.com (https://www.ssl.com/)
echo    - Certificados gratuitos por 90 dias
echo    - Requiere verificacion por email o DNS
echo.
echo 2. SSLForFree.com (https://www.sslforfree.com/)
echo    - Usa Let's Encrypt pero con interfaz web
echo    - Descarga manual de certificados
echo.
echo 3. ZeroSSL (https://zerossl.com/)
echo    - Certificados gratuitos por 90 dias
echo    - Interfaz web facil de usar
echo.
echo PASOS GENERALES:
echo   1. Registrate en el servicio
echo   2. Ingresa tu dominio: %DOMAIN%
echo   3. Verifica dominio (DNS o HTTP)
echo   4. Descarga certificados
echo   5. Guarda en: %CERT_DIR%
echo.
echo Archivos necesarios:
echo   - certificate.crt (certificado)
echo   - private.key (clave privada)
echo   - ca_bundle.crt (cadena, opcional)
echo.
pause
goto :FIN

REM ============================================================================
REM FIN DEL SCRIPT
REM ============================================================================

:FIN
echo.
echo ============================================================================
echo   SIGUIENTE PASO
echo ============================================================================
echo.
echo Una vez tengas los certificados en:
echo   %CERT_DIR%
echo.
echo INSTRUCCIONES:
echo.
echo 1. Copia la carpeta 'certificados_ssl' completa
echo.
echo 2. Muevela a la carpeta del proyecto en WSL:
echo    Desde Windows, accede a:
echo    \\wsl$\Ubuntu\home\andres\server_archivo\
echo.
echo 3. Pega la carpeta 'certificados_ssl' ahi
echo.
echo 4. Avisa cuando estes listo para configurar nginx
echo.
echo ============================================================================
echo.

REM Abrir explorador con la carpeta
if exist "%CERT_DIR%" (
    explorer "%CERT_DIR%"
)

pause
exit /b 0
