#!/usr/bin/env python3
"""
Script para exportar la documentacion a formatos amigables.
Genera HTML con estilos para abrir en navegador o importar a Word.
Genera imagenes PNG de los diagramas Mermaid usando kroki.io
"""

import os
import re
import base64
import urllib.request
import urllib.error
import json
import zlib
from pathlib import Path

# Directorio base
BASE_DIR = Path(__file__).parent
EXPORT_DIR = BASE_DIR / "exportados"
IMAGES_DIR = EXPORT_DIR / "imagenes"

# Crear directorios
EXPORT_DIR.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(exist_ok=True)

# Estilos CSS para el HTML
CSS_STYLES = """
<style>
    * {
        box-sizing: border-box;
    }
    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px;
        background: #f5f5f5;
        color: #333;
        line-height: 1.6;
    }
    .container {
        background: white;
        padding: 40px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
        color: #2c3e50;
        border-bottom: 3px solid #3498db;
        padding-bottom: 15px;
        margin-top: 0;
    }
    h2 {
        color: #34495e;
        border-bottom: 2px solid #ecf0f1;
        padding-bottom: 10px;
        margin-top: 40px;
    }
    h3 {
        color: #7f8c8d;
        margin-top: 30px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        font-size: 14px;
    }
    th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
    }
    th {
        background: #3498db;
        color: white;
        font-weight: 600;
    }
    tr:nth-child(even) {
        background: #f9f9f9;
    }
    tr:hover {
        background: #f1f1f1;
    }
    code {
        background: #f4f4f4;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 13px;
    }
    pre {
        background: #2c3e50;
        color: #ecf0f1;
        padding: 20px;
        border-radius: 5px;
        overflow-x: auto;
        font-size: 13px;
    }
    pre code {
        background: transparent;
        color: inherit;
        padding: 0;
    }
    .diagram-container {
        text-align: center;
        margin: 30px 0;
        padding: 20px;
        background: #fafafa;
        border-radius: 8px;
        border: 1px solid #eee;
    }
    .diagram-container img {
        max-width: 100%;
        height: auto;
    }
    .diagram-title {
        font-weight: bold;
        color: #666;
        margin-bottom: 15px;
        font-size: 14px;
    }
    .mermaid-code {
        display: none;
    }
    .note {
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 15px;
        margin: 20px 0;
        border-radius: 0 5px 5px 0;
    }
    .info {
        background: #d1ecf1;
        border-left: 4px solid #17a2b8;
        padding: 15px;
        margin: 20px 0;
        border-radius: 0 5px 5px 0;
    }
    ul, ol {
        margin: 15px 0;
        padding-left: 30px;
    }
    li {
        margin: 8px 0;
    }
    hr {
        border: none;
        border-top: 2px solid #ecf0f1;
        margin: 40px 0;
    }
    .header-info {
        background: #3498db;
        color: white;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
    }
    .header-info h1 {
        color: white;
        border-bottom-color: rgba(255,255,255,0.3);
        margin: 0;
    }
    .toc {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
    }
    .toc h3 {
        margin-top: 0;
    }
    .toc ul {
        list-style-type: none;
        padding-left: 0;
    }
    .toc li {
        margin: 10px 0;
    }
    .toc a {
        color: #3498db;
        text-decoration: none;
    }
    .toc a:hover {
        text-decoration: underline;
    }
    @media print {
        body {
            background: white;
            padding: 0;
        }
        .container {
            box-shadow: none;
            padding: 20px;
        }
        .diagram-container {
            page-break-inside: avoid;
        }
    }
</style>
"""


def encode_mermaid_for_kroki(mermaid_code: str) -> str:
    """Codifica el codigo Mermaid para la API de Kroki."""
    # Comprimir con zlib
    compressed = zlib.compress(mermaid_code.encode('utf-8'), 9)
    # Codificar en base64 URL-safe
    encoded = base64.urlsafe_b64encode(compressed).decode('ascii')
    return encoded


def get_mermaid_image_url(mermaid_code: str, format: str = "png") -> str:
    """Genera la URL para obtener la imagen del diagrama."""
    encoded = encode_mermaid_for_kroki(mermaid_code)
    return f"https://kroki.io/mermaid/{format}/{encoded}"


def download_mermaid_image(mermaid_code: str, output_path: Path, diagram_name: str) -> bool:
    """Descarga la imagen del diagrama desde Kroki."""
    try:
        url = get_mermaid_image_url(mermaid_code, "png")

        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0')

        with urllib.request.urlopen(req, timeout=30) as response:
            image_data = response.read()

        with open(output_path, 'wb') as f:
            f.write(image_data)

        print(f"  [OK] {diagram_name}")
        return True

    except Exception as e:
        print(f"  [ERROR] {diagram_name}: {str(e)[:50]}")
        return False


def extract_mermaid_blocks(markdown_content: str) -> list:
    """Extrae todos los bloques de codigo Mermaid del markdown."""
    pattern = r'```mermaid\n(.*?)```'
    matches = re.findall(pattern, markdown_content, re.DOTALL)
    return matches


def process_markdown_to_html(md_content: str, doc_name: str) -> str:
    """Convierte Markdown a HTML con imagenes de diagramas."""

    # Encontrar bloques mermaid y reemplazarlos con imagenes
    diagram_count = 0

    def replace_mermaid(match):
        nonlocal diagram_count
        diagram_count += 1
        mermaid_code = match.group(1).strip()

        # Generar nombre de imagen
        img_name = f"{doc_name}_diagrama_{diagram_count:02d}.png"
        img_path = IMAGES_DIR / img_name

        # Descargar imagen
        download_mermaid_image(mermaid_code, img_path, img_name)

        # Retornar HTML con imagen
        return f'''
<div class="diagram-container">
    <div class="diagram-title">Diagrama {diagram_count}</div>
    <img src="imagenes/{img_name}" alt="Diagrama {diagram_count}">
</div>
'''

    # Reemplazar bloques mermaid
    content = re.sub(r'```mermaid\n(.*?)```', replace_mermaid, md_content, flags=re.DOTALL)

    # Convertir markdown basico a HTML
    # Headers
    content = re.sub(r'^### (.+)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
    content = re.sub(r'^## (.+)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
    content = re.sub(r'^# (.+)$', r'<h1>\1</h1>', content, flags=re.MULTILINE)

    # Horizontal rules
    content = re.sub(r'^---+$', '<hr>', content, flags=re.MULTILINE)

    # Bold
    content = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', content)

    # Italic
    content = re.sub(r'\*(.+?)\*', r'<em>\1</em>', content)

    # Inline code
    content = re.sub(r'`([^`]+)`', r'<code>\1</code>', content)

    # Code blocks (non-mermaid)
    def format_code_block(match):
        lang = match.group(1) or ''
        code = match.group(2)
        return f'<pre><code class="{lang}">{code}</code></pre>'

    content = re.sub(r'```(\w*)\n(.*?)```', format_code_block, content, flags=re.DOTALL)

    # Tables
    def convert_table(match):
        table_text = match.group(0)
        lines = [l.strip() for l in table_text.strip().split('\n') if l.strip()]

        if len(lines) < 2:
            return table_text

        html = '<table>\n<thead>\n<tr>\n'

        # Header
        headers = [h.strip() for h in lines[0].split('|') if h.strip()]
        for h in headers:
            html += f'<th>{h}</th>\n'
        html += '</tr>\n</thead>\n<tbody>\n'

        # Rows (skip separator line)
        for line in lines[2:]:
            if '|' in line and not re.match(r'^[\s|:-]+$', line):
                html += '<tr>\n'
                cells = [c.strip() for c in line.split('|') if c.strip()]
                for cell in cells:
                    html += f'<td>{cell}</td>\n'
                html += '</tr>\n'

        html += '</tbody>\n</table>'
        return html

    # Find tables (lines with | that have a separator line)
    content = re.sub(
        r'(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)+)',
        convert_table,
        content
    )

    # Lists - basic conversion
    lines = content.split('\n')
    in_list = False
    new_lines = []

    for line in lines:
        if re.match(r'^\s*[-*]\s+', line):
            if not in_list:
                new_lines.append('<ul>')
                in_list = True
            item = re.sub(r'^\s*[-*]\s+', '', line)
            new_lines.append(f'<li>{item}</li>')
        elif re.match(r'^\s*\d+\.\s+', line):
            if not in_list:
                new_lines.append('<ol>')
                in_list = True
            item = re.sub(r'^\s*\d+\.\s+', '', line)
            new_lines.append(f'<li>{item}</li>')
        else:
            if in_list and line.strip():
                new_lines.append('</ul>' if '</li>' in new_lines[-1] else '</ol>')
                in_list = False
            new_lines.append(line)

    if in_list:
        new_lines.append('</ul>')

    content = '\n'.join(new_lines)

    # Paragraphs
    content = re.sub(r'\n\n+', '</p>\n<p>', content)
    content = f'<p>{content}</p>'

    # Clean up empty paragraphs
    content = re.sub(r'<p>\s*</p>', '', content)
    content = re.sub(r'<p>\s*(<h[123]>)', r'\1', content)
    content = re.sub(r'(</h[123]>)\s*</p>', r'\1', content)
    content = re.sub(r'<p>\s*(<table>)', r'\1', content)
    content = re.sub(r'(</table>)\s*</p>', r'\1', content)
    content = re.sub(r'<p>\s*(<ul>)', r'\1', content)
    content = re.sub(r'(</ul>)\s*</p>', r'\1', content)
    content = re.sub(r'<p>\s*(<ol>)', r'\1', content)
    content = re.sub(r'(</ol>)\s*</p>', r'\1', content)
    content = re.sub(r'<p>\s*(<div)', r'\1', content)
    content = re.sub(r'(</div>)\s*</p>', r'\1', content)
    content = re.sub(r'<p>\s*(<pre>)', r'\1', content)
    content = re.sub(r'(</pre>)\s*</p>', r'\1', content)
    content = re.sub(r'<p>\s*(<hr>)', r'\1', content)
    content = re.sub(r'(<hr>)\s*</p>', r'\1', content)

    return content


def create_html_document(title: str, content: str) -> str:
    """Crea un documento HTML completo."""
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    {CSS_STYLES}
</head>
<body>
    <div class="container">
        {content}
    </div>
</body>
</html>
'''


def process_document(md_file: Path):
    """Procesa un documento markdown y genera HTML."""
    print(f"\nProcesando: {md_file.name}")

    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extraer titulo
    title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else md_file.stem

    # Nombre base para imagenes
    doc_name = md_file.stem

    # Convertir a HTML
    html_content = process_markdown_to_html(content, doc_name)

    # Crear documento HTML completo
    html_doc = create_html_document(title, html_content)

    # Guardar HTML
    html_file = EXPORT_DIR / f"{doc_name}.html"
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_doc)

    print(f"  -> {html_file.name}")


def main():
    print("=" * 60)
    print("EXPORTADOR DE DOCUMENTACION TECNICA")
    print("Sistema de Gestion de Archivos IGAC")
    print("=" * 60)

    # Encontrar todos los archivos MD
    md_files = sorted(BASE_DIR.glob("*.md"))

    # Filtrar el script y otros no-documentos
    md_files = [f for f in md_files if not f.name.startswith('exportar')]

    print(f"\nEncontrados {len(md_files)} documentos para procesar")
    print(f"Directorio de salida: {EXPORT_DIR}")

    for md_file in md_files:
        process_document(md_file)

    print("\n" + "=" * 60)
    print("EXPORTACION COMPLETADA")
    print("=" * 60)
    print(f"\nArchivos generados en: {EXPORT_DIR}")
    print("\nPuedes abrir los archivos HTML en:")
    print("  - Cualquier navegador web")
    print("  - Microsoft Word (Archivo -> Abrir -> seleccionar HTML)")
    print("  - Google Docs (subir el HTML)")
    print("\nPara imprimir a PDF: Abrir en navegador -> Ctrl+P -> Guardar como PDF")


if __name__ == "__main__":
    main()
