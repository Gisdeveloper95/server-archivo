#!/usr/bin/env python3
"""
Script para generar el manual técnico consolidado en formato Word
"""
import os
import subprocess
from datetime import datetime

# Directorio base
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Orden de los archivos
FILES_ORDER = [
    '01_portada_introduccion.md',
    '02_infraestructura.md',
    '03_backend_django.md',
    '04_frontend_react.md',
    '05_modulo_explorador_archivos.md',
    '06_modulos_complementarios.md',
    '07_smart_naming_ia.md',
    '08_administracion_auditoria.md',
]

def consolidate_markdown():
    """Consolida todos los archivos MD en uno solo"""
    consolidated = []

    for filename in FILES_ORDER:
        filepath = os.path.join(BASE_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                consolidated.append(content)
                # Agregar salto de página entre secciones
                consolidated.append('\n\n---\n\n')

    # Guardar consolidado
    output_path = os.path.join(BASE_DIR, 'MANUAL_TECNICO_COMPLETO.md')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(consolidated))

    print(f"✓ Consolidado: {output_path}")
    return output_path

def convert_to_word(md_path):
    """Convierte el archivo MD a Word usando pandoc"""
    output_path = os.path.join(BASE_DIR, 'MANUAL_TECNICO_IGAC.docx')

    # Opciones de pandoc para mejor formato
    cmd = [
        'pandoc',
        md_path,
        '-o', output_path,
        '--from=markdown',
        '--to=docx',
        '--toc',                    # Tabla de contenido
        '--toc-depth=3',            # Profundidad de TOC
        '--reference-doc=/usr/share/pandoc/data/templates/reference.docx' if os.path.exists('/usr/share/pandoc/data/templates/reference.docx') else '',
        '--metadata', f'title=Manual Técnico - Sistema de Gestión de Archivos IGAC',
        '--metadata', f'author=Dirección de Gestión Catastral',
        '--metadata', f'date={datetime.now().strftime("%Y-%m-%d")}',
    ]

    # Filtrar argumentos vacíos
    cmd = [c for c in cmd if c]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Word generado: {output_path}")
            return output_path
        else:
            print(f"✗ Error en pandoc: {result.stderr}")
            return None
    except FileNotFoundError:
        print("✗ pandoc no encontrado. Instalando...")
        return None

def create_html_version(md_path):
    """Crea versión HTML del manual"""
    output_path = os.path.join(BASE_DIR, 'MANUAL_TECNICO_IGAC.html')

    # HTML con estilos incorporados
    html_template = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manual Técnico - Sistema de Gestión de Archivos IGAC</title>
    <style>
        :root {
            --primary: #0284c7;
            --secondary: #64748b;
            --bg: #ffffff;
            --text: #1e293b;
            --border: #e2e8f0;
            --code-bg: #f1f5f9;
        }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            color: var(--text);
            background: var(--bg);
        }
        h1, h2, h3, h4 {
            color: var(--primary);
            margin-top: 2rem;
        }
        h1 { border-bottom: 3px solid var(--primary); padding-bottom: 0.5rem; }
        h2 { border-bottom: 2px solid var(--border); padding-bottom: 0.3rem; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        th, td {
            border: 1px solid var(--border);
            padding: 0.75rem;
            text-align: left;
        }
        th {
            background: var(--primary);
            color: white;
        }
        tr:nth-child(even) {
            background: var(--code-bg);
        }
        code {
            background: var(--code-bg);
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Cascadia Code', 'Fira Code', monospace;
        }
        pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
        }
        pre code {
            background: none;
            color: inherit;
        }
        blockquote {
            border-left: 4px solid var(--primary);
            padding-left: 1rem;
            margin-left: 0;
            color: var(--secondary);
        }
        hr {
            border: none;
            border-top: 1px solid var(--border);
            margin: 2rem 0;
        }
        .toc {
            background: var(--code-bg);
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }
        .toc h2 {
            margin-top: 0;
        }
        @media print {
            body {
                max-width: none;
                padding: 1cm;
            }
            pre {
                white-space: pre-wrap;
            }
        }
    </style>
</head>
<body>
{content}
</body>
</html>
"""

    # Leer markdown
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Convertir a HTML usando pandoc
    cmd = ['pandoc', '--from=markdown', '--to=html', '--toc']
    try:
        result = subprocess.run(cmd, input=md_content, capture_output=True, text=True)
        if result.returncode == 0:
            html_content = html_template.replace('{content}', result.stdout)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"✓ HTML generado: {output_path}")
            return output_path
    except Exception as e:
        print(f"✗ Error creando HTML: {e}")

    return None

def main():
    print("=" * 60)
    print("  GENERADOR DE MANUAL TÉCNICO IGAC")
    print("=" * 60)
    print()

    # 1. Consolidar markdown
    md_path = consolidate_markdown()

    # 2. Generar Word
    word_path = convert_to_word(md_path)

    # 3. Generar HTML
    html_path = create_html_version(md_path)

    print()
    print("=" * 60)
    print("  ARCHIVOS GENERADOS:")
    print("=" * 60)
    print(f"  • Markdown: {md_path}")
    if word_path:
        print(f"  • Word:     {word_path}")
    if html_path:
        print(f"  • HTML:     {html_path}")
    print()

if __name__ == '__main__':
    main()
