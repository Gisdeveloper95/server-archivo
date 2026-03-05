#!/usr/bin/env python3
"""
Script para generar el manual de usuario consolidado en formato Word
Sistema de Gestión de Archivos IGAC
"""
import os
import subprocess
from datetime import datetime

# Directorio base
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Orden de los archivos del manual de usuario
FILES_ORDER = [
    '01_introduccion.md',
    '02_acceso_navegacion.md',
    '03_explorador_archivos.md',
    '04_operaciones_archivos.md',
    '05_renombramiento_inteligente.md',
    '06_favoritos_papelera_compartir.md',
    '07_notificaciones_mensajes.md',
    '08_administracion.md',
    '09_faq_problemas.md',
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
        else:
            print(f"⚠️ Archivo no encontrado: {filename}")

    # Guardar consolidado
    output_path = os.path.join(BASE_DIR, 'MANUAL_USUARIO_COMPLETO.md')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(consolidated))

    print(f"✓ Consolidado: {output_path}")
    return output_path

def convert_to_word(md_path):
    """Convierte el archivo MD a Word usando pandoc"""
    output_path = os.path.join(BASE_DIR, 'MANUAL_USUARIO_IGAC.docx')

    # Opciones de pandoc para mejor formato
    cmd = [
        'pandoc',
        md_path,
        '-o', output_path,
        '--from=markdown',
        '--to=docx',
        '--toc',                    # Tabla de contenido
        '--toc-depth=3',            # Profundidad de TOC
        '--metadata', 'title=Manual de Usuario - Sistema de Gestión de Archivos IGAC',
        '--metadata', 'author=Instituto Geográfico Agustín Codazzi',
        '--metadata', f'date={datetime.now().strftime("%Y-%m-%d")}',
    ]

    # Verificar si existe plantilla de referencia
    ref_doc = '/usr/share/pandoc/data/templates/reference.docx'
    if os.path.exists(ref_doc):
        cmd.extend(['--reference-doc', ref_doc])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Word generado: {output_path}")
            return output_path
        else:
            print(f"✗ Error en pandoc: {result.stderr}")
            return None
    except FileNotFoundError:
        print("✗ pandoc no encontrado. Instale con: sudo apt-get install pandoc")
        return None

def create_html_version(md_path):
    """Crea versión HTML del manual con estilos modernos"""
    output_path = os.path.join(BASE_DIR, 'MANUAL_USUARIO_IGAC.html')

    # HTML con estilos incorporados - tema claro y profesional
    html_template = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manual de Usuario - Sistema de Gestión de Archivos IGAC</title>
    <style>
        :root {
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --secondary: #64748b;
            --success: #22c55e;
            --warning: #f59e0b;
            --error: #ef4444;
            --bg: #ffffff;
            --bg-alt: #f8fafc;
            --text: #1e293b;
            --text-light: #64748b;
            --border: #e2e8f0;
            --code-bg: #f1f5f9;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.7;
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
            color: var(--text);
            background: var(--bg);
        }

        h1, h2, h3, h4 {
            color: var(--primary);
            margin-top: 2.5rem;
            margin-bottom: 1rem;
        }

        h1 {
            font-size: 2.25rem;
            border-bottom: 3px solid var(--primary);
            padding-bottom: 0.75rem;
        }

        h2 {
            font-size: 1.75rem;
            border-bottom: 2px solid var(--border);
            padding-bottom: 0.5rem;
        }

        h3 {
            font-size: 1.35rem;
            color: var(--primary-dark);
        }

        h4 {
            font-size: 1.1rem;
            color: var(--secondary);
        }

        p {
            margin: 1rem 0;
        }

        a {
            color: var(--primary);
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
            font-size: 0.95rem;
        }

        th, td {
            border: 1px solid var(--border);
            padding: 0.75rem 1rem;
            text-align: left;
        }

        th {
            background: var(--primary);
            color: white;
            font-weight: 600;
        }

        tr:nth-child(even) {
            background: var(--bg-alt);
        }

        tr:hover {
            background: #e0f2fe;
        }

        code {
            background: var(--code-bg);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
            font-size: 0.9em;
        }

        pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 1.25rem;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.85rem;
            line-height: 1.5;
            margin: 1.5rem 0;
        }

        pre code {
            background: none;
            color: inherit;
            padding: 0;
        }

        blockquote {
            border-left: 4px solid var(--primary);
            padding: 1rem 1.5rem;
            margin: 1.5rem 0;
            background: var(--bg-alt);
            border-radius: 0 8px 8px 0;
        }

        blockquote p {
            margin: 0;
        }

        hr {
            border: none;
            border-top: 2px solid var(--border);
            margin: 3rem 0;
        }

        ul, ol {
            padding-left: 1.5rem;
            margin: 1rem 0;
        }

        li {
            margin: 0.5rem 0;
        }

        /* Tabla de contenido */
        .toc {
            background: var(--bg-alt);
            padding: 1.5rem 2rem;
            border-radius: 12px;
            margin: 2rem 0;
            border: 1px solid var(--border);
        }

        .toc h2 {
            margin-top: 0;
            color: var(--text);
            border: none;
        }

        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }

        .toc li {
            padding: 0.3rem 0;
        }

        .toc a {
            color: var(--text);
        }

        .toc a:hover {
            color: var(--primary);
        }

        /* Header y footer */
        header {
            text-align: center;
            padding: 2rem 0;
            border-bottom: 3px solid var(--primary);
            margin-bottom: 2rem;
        }

        header h1 {
            border: none;
            margin: 0;
        }

        footer {
            text-align: center;
            padding: 2rem 0;
            margin-top: 3rem;
            border-top: 1px solid var(--border);
            color: var(--text-light);
            font-size: 0.9rem;
        }

        /* Alertas y notas */
        .note, .warning, .tip {
            padding: 1rem 1.5rem;
            border-radius: 8px;
            margin: 1.5rem 0;
        }

        .note {
            background: #dbeafe;
            border-left: 4px solid var(--primary);
        }

        .warning {
            background: #fef3c7;
            border-left: 4px solid var(--warning);
        }

        .tip {
            background: #dcfce7;
            border-left: 4px solid var(--success);
        }

        /* Impresión */
        @media print {
            body {
                max-width: none;
                padding: 1cm;
            }

            pre {
                white-space: pre-wrap;
                background: #f0f0f0;
                color: #333;
            }

            h1, h2, h3 {
                page-break-after: avoid;
            }

            table, pre, blockquote {
                page-break-inside: avoid;
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            body {
                padding: 1rem;
            }

            h1 {
                font-size: 1.75rem;
            }

            h2 {
                font-size: 1.4rem;
            }

            table {
                font-size: 0.85rem;
            }

            th, td {
                padding: 0.5rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>📁 Manual de Usuario</h1>
        <p>Sistema de Gestión de Archivos IGAC</p>
        <p><small>Instituto Geográfico Agustín Codazzi - Enero 2025</small></p>
    </header>

    <main>
{content}
    </main>

    <footer>
        <p>© 2025 Instituto Geográfico Agustín Codazzi. Todos los derechos reservados.</p>
        <p>Soporte: sistemas@igac.gov.co</p>
    </footer>
</body>
</html>
"""

    # Leer markdown
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Convertir a HTML usando pandoc
    cmd = ['pandoc', '--from=markdown', '--to=html', '--toc', '--toc-depth=3']
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

def get_file_size(filepath):
    """Obtiene el tamaño del archivo en formato legible"""
    size = os.path.getsize(filepath)
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"

def main():
    print("=" * 60)
    print("  GENERADOR DE MANUAL DE USUARIO IGAC")
    print("  Sistema de Gestión de Archivos")
    print("=" * 60)
    print()

    # 1. Consolidar markdown
    print("📝 Consolidando archivos markdown...")
    md_path = consolidate_markdown()

    # 2. Generar Word
    print("\n📄 Generando documento Word...")
    word_path = convert_to_word(md_path)

    # 3. Generar HTML
    print("\n🌐 Generando versión HTML...")
    html_path = create_html_version(md_path)

    print()
    print("=" * 60)
    print("  ARCHIVOS GENERADOS:")
    print("=" * 60)

    if os.path.exists(md_path):
        print(f"  • Markdown: {os.path.basename(md_path)} ({get_file_size(md_path)})")
    if word_path and os.path.exists(word_path):
        print(f"  • Word:     {os.path.basename(word_path)} ({get_file_size(word_path)})")
    if html_path and os.path.exists(html_path):
        print(f"  • HTML:     {os.path.basename(html_path)} ({get_file_size(html_path)})")

    print()
    print("  📁 Ubicación: " + BASE_DIR)
    print()

if __name__ == '__main__':
    main()
