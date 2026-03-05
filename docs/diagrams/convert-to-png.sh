#!/bin/bash

# Script para convertir diagramas Mermaid a PNG
# Usa la API de mermaid.live

echo "🔄 Generando PNGs de diagramas Mermaid..."
echo "Esto puede tomar un momento..."

# Crear directorio de salida
mkdir -p /home/andres/server_archivo/docs/diagrams/png

# Array con los diagramas
declare -a diagrams=(
    "01-arquitectura-capas"
    "02-relaciones-paginas"
    "03-flujo-datos"
    "04-componentes-arbol"
    "05-stores"
    "06-modulos-api"
    "07-flujo-descargar"
    "08-flujo-crear-carpeta"
    "09-relaciones-modales"
    "10-pagina-admin"
    "11-custom-hooks"
    "12-flujo-autenticacion"
    "15-ciclo-vida"
)

# Crear un script Python para la conversión
cat > /tmp/mermaid_to_png.py << 'PYTHON_SCRIPT'
#!/usr/bin/env python3
import base64
import requests
import sys
from pathlib import Path

def mermaid_to_png(mmd_file, output_file):
    """Convert Mermaid diagram to PNG using mermaid.live API"""
    try:
        # Leer archivo Mermaid
        with open(mmd_file, 'r') as f:
            mmd_content = f.read()
        
        # Preparar para enviar (base64 encoded)
        encoded = base64.b64encode(mmd_content.encode()).decode()
        
        # URL de mermaid.live con diagrama encoded
        url = f"https://mermaid.live/png/pako:{encoded}"
        
        print(f"📊 Generando: {Path(mmd_file).name}")
        
        # Descargar PNG
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            with open(output_file, 'wb') as f:
                f.write(response.content)
            print(f"✅ Guardado: {output_file}")
            return True
        else:
            print(f"❌ Error {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python3 script.py <input.mmd> <output.png>")
        sys.exit(1)
    
    mmd_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if mermaid_to_png(mmd_file, output_file):
        sys.exit(0)
    else:
        sys.exit(1)
PYTHON_SCRIPT

echo "⚠️  Nota: Se requiere conexión a internet para usar mermaid.live API"
echo "📋 Instrucciones alternativas:"
echo ""
echo "Opción 1: Usar mermaid.live en línea"
echo "  1. Ve a https://mermaid.live"
echo "  2. Copia el contenido del archivo .mmd"
echo "  3. Pega en el editor"
echo "  4. Click en 'Download PNG'"
echo ""
echo "Opción 2: Instalar localmente con Node"
echo "  npm install -g @mermaid-js/mermaid-cli"
echo "  mmdc -i diagram.mmd -o diagram.png"
echo ""
echo "Opción 3: Usar Docker"
echo "  docker run -v /path/to/diagrams:/data minlag/mermaid-cli:latest"
echo ""

