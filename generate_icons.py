from PIL import Image, ImageDraw, ImageFont
import os

def create_app_icon(size: int, output_path: str):
    # Fundo com cantos arredondados e cor da marca (#0f766e - ocean-700)
    img = Image.new('RGBA', (size, size), (15, 118, 110, 255))
    draw = ImageDraw.Draw(img)
    
    # Detalhes visuais no ícone
    # Círculo central com tom suave
    center = size // 2
    r = int(size * 0.40)
    draw.ellipse([center - r, center - r, center + r, center + r], fill=(19, 78, 74, 255), outline=(94, 234, 212, 255), width=int(size * 0.03))

    # Tenta usar fonte padrão do sistema ou desenha formas
    try:
        # No Windows, Arial ou Segoe UI costumam existir
        font_size = int(size * 0.38)
        font = ImageFont.truetype("arial.ttf", font_size)
        text = "LA"
        # Bounding box para centralizar
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = (size - w) // 2
        y = (size - h) // 2 - int(size * 0.03)
        draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    except Exception:
        # Fallback geométrico se não carregar a fonte
        draw.rectangle([center - int(size * 0.2), center - int(size * 0.2), center + int(size * 0.2), center + int(size * 0.2)], fill=(255, 255, 255, 255))

    # Pequena folha/broto verde no canto inferior direito
    leaf_r = int(size * 0.12)
    leaf_cx = int(size * 0.75)
    leaf_cy = int(size * 0.75)
    draw.ellipse([leaf_cx - leaf_r, leaf_cy - leaf_r, leaf_cx + leaf_r, leaf_cy + leaf_r], fill=(34, 197, 94, 255), outline=(255, 255, 255, 255), width=int(size * 0.02))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, 'PNG')
    print(f"Salvo: {output_path} ({size}x{size})")

create_app_icon(192, 'frontend/public/icon-192.png')
create_app_icon(512, 'frontend/public/icon-512.png')
create_app_icon(180, 'frontend/public/apple-touch-icon.png')
create_app_icon(64, 'frontend/public/favicon.png')
