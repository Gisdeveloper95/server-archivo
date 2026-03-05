#!/usr/bin/env python3
"""
Genera el diagrama ERD en formato SVG grande para imprimir en pliego/poster.
Usa kroki.io para renderizar Mermaid a SVG vectorial.
"""

import os
import re
import base64
import urllib.request
import zlib
from pathlib import Path

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "exportados" / "diagramas_grandes"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def encode_mermaid_for_kroki(mermaid_code: str) -> str:
    """Codifica el codigo Mermaid para la API de Kroki."""
    compressed = zlib.compress(mermaid_code.encode('utf-8'), 9)
    encoded = base64.urlsafe_b64encode(compressed).decode('ascii')
    return encoded


def download_diagram(mermaid_code: str, output_path: Path, format: str = "svg") -> bool:
    """Descarga el diagrama desde Kroki en el formato especificado."""
    try:
        encoded = encode_mermaid_for_kroki(mermaid_code)
        url = f"https://kroki.io/mermaid/{format}/{encoded}"

        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0')

        with urllib.request.urlopen(req, timeout=60) as response:
            data = response.read()

        with open(output_path, 'wb') as f:
            f.write(data)

        print(f"[OK] Generado: {output_path.name}")
        return True

    except Exception as e:
        print(f"[ERROR] {output_path.name}: {str(e)}")
        return False


def extract_mermaid_from_file(md_file: Path) -> list:
    """Extrae bloques mermaid de un archivo markdown."""
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r'```mermaid\n(.*?)```'
    matches = re.findall(pattern, content, re.DOTALL)
    return matches


def create_html_viewer(svg_path: Path, title: str) -> Path:
    """Crea un visor HTML para el SVG con zoom y pan."""
    html_path = svg_path.with_suffix('.html')

    html_content = f'''<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f0f0f0;
            overflow: hidden;
        }}
        .toolbar {{
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #2c3e50;
            color: white;
            padding: 15px 20px;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }}
        .toolbar h1 {{
            font-size: 18px;
            font-weight: 500;
        }}
        .toolbar-buttons {{
            display: flex;
            gap: 10px;
        }}
        .toolbar button {{
            background: #3498db;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }}
        .toolbar button:hover {{
            background: #2980b9;
        }}
        .zoom-info {{
            font-size: 14px;
            background: rgba(255,255,255,0.1);
            padding: 5px 10px;
            border-radius: 4px;
        }}
        .container {{
            margin-top: 60px;
            width: 100vw;
            height: calc(100vh - 60px);
            overflow: auto;
            cursor: grab;
            background:
                linear-gradient(90deg, #e0e0e0 1px, transparent 1px),
                linear-gradient(#e0e0e0 1px, transparent 1px);
            background-size: 20px 20px;
        }}
        .container:active {{
            cursor: grabbing;
        }}
        .svg-wrapper {{
            display: inline-block;
            padding: 50px;
            min-width: 100%;
            min-height: 100%;
        }}
        .svg-wrapper img {{
            display: block;
            max-width: none;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border-radius: 8px;
        }}
        .instructions {{
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(44, 62, 80, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 12px;
            line-height: 1.6;
        }}
        .instructions strong {{
            display: block;
            margin-bottom: 8px;
            font-size: 13px;
        }}
    </style>
</head>
<body>
    <div class="toolbar">
        <h1>{title}</h1>
        <div class="toolbar-buttons">
            <button onclick="zoomIn()">+ Zoom</button>
            <button onclick="zoomOut()">- Zoom</button>
            <button onclick="resetZoom()">100%</button>
            <button onclick="fitToScreen()">Ajustar</button>
            <span class="zoom-info" id="zoomLevel">100%</span>
            <button onclick="printDiagram()">Imprimir / PDF</button>
        </div>
    </div>

    <div class="container" id="container">
        <div class="svg-wrapper">
            <img id="diagram" src="{svg_path.name}" alt="{title}">
        </div>
    </div>

    <div class="instructions">
        <strong>Controles:</strong>
        Rueda del mouse = Zoom<br>
        Arrastrar = Mover<br>
        Doble clic = Zoom in
    </div>

    <script>
        let zoom = 1;
        const img = document.getElementById('diagram');
        const container = document.getElementById('container');
        const zoomDisplay = document.getElementById('zoomLevel');

        function updateZoom() {{
            img.style.transform = `scale(${{zoom}})`;
            img.style.transformOrigin = 'top left';
            zoomDisplay.textContent = Math.round(zoom * 100) + '%';
        }}

        function zoomIn() {{
            zoom = Math.min(zoom * 1.25, 5);
            updateZoom();
        }}

        function zoomOut() {{
            zoom = Math.max(zoom / 1.25, 0.1);
            updateZoom();
        }}

        function resetZoom() {{
            zoom = 1;
            updateZoom();
        }}

        function fitToScreen() {{
            const containerRect = container.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();
            const scaleX = (containerRect.width - 100) / (img.naturalWidth || imgRect.width);
            const scaleY = (containerRect.height - 100) / (img.naturalHeight || imgRect.height);
            zoom = Math.min(scaleX, scaleY, 1);
            updateZoom();
        }}

        function printDiagram() {{
            window.print();
        }}

        // Mouse wheel zoom
        container.addEventListener('wheel', (e) => {{
            e.preventDefault();
            if (e.deltaY < 0) {{
                zoomIn();
            }} else {{
                zoomOut();
            }}
        }});

        // Double click to zoom in
        img.addEventListener('dblclick', () => {{
            zoomIn();
        }});

        // Drag to pan
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        container.addEventListener('mousedown', (e) => {{
            isDragging = true;
            startX = e.pageX - container.offsetLeft;
            startY = e.pageY - container.offsetTop;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
        }});

        container.addEventListener('mouseleave', () => {{
            isDragging = false;
        }});

        container.addEventListener('mouseup', () => {{
            isDragging = false;
        }});

        container.addEventListener('mousemove', (e) => {{
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const y = e.pageY - container.offsetTop;
            const walkX = (x - startX) * 1.5;
            const walkY = (y - startY) * 1.5;
            container.scrollLeft = scrollLeft - walkX;
            container.scrollTop = scrollTop - walkY;
        }});
    </script>
</body>
</html>
'''

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"[OK] Visor: {html_path.name}")
    return html_path


def main():
    print("=" * 60)
    print("GENERADOR DE DIAGRAMAS GRANDES (SVG/PDF)")
    print("Sistema de Gestion de Archivos IGAC")
    print("=" * 60)

    # ERD completo
    erd_file = BASE_DIR / "01_ERD_modelo_datos.md"
    if erd_file.exists():
        print("\n[1] Procesando ERD completo...")
        mermaid_blocks = extract_mermaid_from_file(erd_file)

        if mermaid_blocks:
            erd_code = mermaid_blocks[0]

            # Generar SVG (vectorial, escalable)
            svg_path = OUTPUT_DIR / "ERD_completo_IGAC.svg"
            if download_diagram(erd_code, svg_path, "svg"):
                create_html_viewer(svg_path, "ERD Completo - Sistema IGAC")

            # Generar PNG grande tambien
            png_path = OUTPUT_DIR / "ERD_completo_IGAC.png"
            download_diagram(erd_code, png_path, "png")

    # Arquitectura de infraestructura
    infra_file = BASE_DIR / "02_arquitectura_infraestructura.md"
    if infra_file.exists():
        print("\n[2] Procesando Arquitectura de Infraestructura...")
        mermaid_blocks = extract_mermaid_from_file(infra_file)

        for i, block in enumerate(mermaid_blocks[:2], 1):  # Solo los 2 primeros
            svg_path = OUTPUT_DIR / f"Arquitectura_{i:02d}_IGAC.svg"
            if download_diagram(block, svg_path, "svg"):
                create_html_viewer(svg_path, f"Arquitectura {i} - Sistema IGAC")

    # Flujos de usuario principales
    flujos_file = BASE_DIR / "04_flujos_usuario.md"
    if flujos_file.exists():
        print("\n[3] Procesando Flujos de Usuario principales...")
        mermaid_blocks = extract_mermaid_from_file(flujos_file)

        # Solo algunos flujos importantes
        important_flows = [0, 2, 4, 10]  # Login, Upload, Navegacion, Smart Rename
        for idx, block_idx in enumerate(important_flows):
            if block_idx < len(mermaid_blocks):
                svg_path = OUTPUT_DIR / f"Flujo_{idx+1:02d}_IGAC.svg"
                download_diagram(mermaid_blocks[block_idx], svg_path, "svg")

    print("\n" + "=" * 60)
    print("GENERACION COMPLETADA")
    print("=" * 60)
    print(f"\nArchivos en: {OUTPUT_DIR}")
    print("\nPara imprimir en pliego/poster:")
    print("  1. Abrir el archivo .html en el navegador")
    print("  2. Usar los controles de zoom para ajustar")
    print("  3. Click en 'Imprimir / PDF'")
    print("  4. En 'Mas opciones' seleccionar tamano personalizado")
    print("  5. Guardar como PDF o imprimir directamente")
    print("\nO abrir el SVG en Inkscape/Illustrator para editar")


if __name__ == "__main__":
    main()
