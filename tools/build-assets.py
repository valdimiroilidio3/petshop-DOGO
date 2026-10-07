#!/usr/bin/env python3
"""Gera todos os assets derivados do site DOGO.

Entrada:  assets/img/raw/*.png  (originais, fora do Git)
Saída:    assets/img/*.webp     (derivadas otimizadas, versionadas)
          assets/img/src/*.jpg  (mestres JPEG para futuras re-exportações)
          favicon.ico, *.png, og-cover.jpg

Uso:  python3 tools/build-assets.py
Requer: pillow  (pip install pillow)
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets" / "img" / "raw"
IMG = ROOT / "assets" / "img"
MASTERS = IMG / "src"

WEBP_QUALITY = 80
MASTER_QUALITY = 90
MASTER_MAX_W = 1400

# nome do original -> (larguras a exportar, proporção alvo ou None)
JOBS: dict[str, tuple[list[int], float | None]] = {
    "hero": ([1400, 960, 640], None),
    "servico-banho": ([800, 480], 4 / 3),
    "servico-tosa": ([800, 480], 4 / 3),
    "servico-vet": ([800, 480], 4 / 3),
    "loja": ([1200, 720], None),
    "prod-racao": ([800, 400], None),
    "prod-brinquedo": ([800, 400], None),
    "prod-cama": ([800, 400], None),
    "prod-coleira": ([800, 400], None),
    "prod-higiene": ([800, 400], None),
    "prod-snack": ([800, 400], None),
    "prod-comedouro": ([800, 400], None),
}

# cores da marca (iguais às de assets/css/styles.css)
ORANGE = (255, 122, 47)
WHITE = (255, 255, 255)


def center_crop_to_ratio(im: Image.Image, ratio: float) -> Image.Image:
    """Corta ao centro mantendo a proporção (largura/altura) pedida."""
    w, h = im.size
    current = w / h
    if current > ratio:  # demasiado largo -> cortar laterais
        new_w = int(round(h * ratio))
        left = (w - new_w) // 2
        return im.crop((left, 0, left + new_w, h))
    new_h = int(round(w / ratio))
    top = (h - new_h) // 2
    return im.crop((0, top, w, top + new_h))


def export_photo(name: str, widths: list[int], ratio: float | None) -> None:
    src = next((p for p in (RAW / f"{name}.png", MASTERS / f"{name}.jpg") if p.exists()), None)
    if src is None:
        print(f"  ! {name}: original não encontrado, ignorado")
        return

    im = Image.open(src).convert("RGB")
    if ratio:
        im = center_crop_to_ratio(im, ratio)

    # mestre JPEG (para futuras re-exportações sem perder os originais)
    MASTERS.mkdir(parents=True, exist_ok=True)
    master = im.copy()
    if master.width > MASTER_MAX_W:
        h = int(round(master.height * MASTER_MAX_W / master.width))
        master = master.resize((MASTER_MAX_W, h), Image.LANCZOS)
    master.save(MASTERS / f"{name}.jpg", "JPEG", quality=MASTER_QUALITY, optimize=True, progressive=True)

    for width in widths:
        h = int(round(im.height * width / im.width))
        out = im.resize((width, h), Image.LANCZOS)
        path = IMG / f"{name}-{width}.webp"
        out.save(path, "WEBP", quality=WEBP_QUALITY, method=6)
        print(f"  · {path.relative_to(ROOT)}  {out.width}x{out.height}  {path.stat().st_size / 1024:.0f} KB")


def paw_layer(size: int, scale: float = 1.0) -> Image.Image:
    """Desenha uma pata branca (RGBA) centrada numa tela quadrada."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = size * scale
    cx = cy = size / 2
    # dedos
    toes = [(-0.30, -0.20, 0.125, 0.155), (-0.10, -0.30, 0.125, 0.16),
            (0.10, -0.30, 0.125, 0.16), (0.30, -0.20, 0.125, 0.155)]
    for tx, ty, rx, ry in toes:
        x, y = cx + tx * s, cy + ty * s
        d.ellipse((x - rx * s, y - ry * s, x + rx * s, y + ry * s), fill=WHITE)
    # almofada
    px, py, pr = cx, cy + 0.14 * s, 0.235 * s
    d.ellipse((px - pr, py - pr * 0.85, px + pr, py + pr * 0.85), fill=WHITE)
    d.polygon(
        [(px - pr * 0.95, py + pr * 0.1), (px + pr * 0.95, py + pr * 0.1),
         (px + pr * 0.62, py + pr * 0.92), (px - pr * 0.62, py + pr * 0.92)],
        fill=WHITE,
    )
    r = pr * 0.5
    for sx in (-0.62, 0.62):
        bx, by = px + sx * pr, py + pr * 0.92
        d.ellipse((bx - r, by - r, bx + r, by + r), fill=WHITE)
    return layer


def icon(size: int, radius_ratio: float | None, paw_scale: float) -> Image.Image:
    """Ícone quadrado laranja com pata branca. radius_ratio=None -> sem cantos redondos."""
    ss = 4  # supersampling para arestas suaves
    big = Image.new("RGBA", (size * ss, size * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    if radius_ratio:
        d.rounded_rectangle((0, 0, size * ss - 1, size * ss - 1), radius=int(size * ss * radius_ratio), fill=ORANGE)
    else:
        d.rectangle((0, 0, size * ss - 1, size * ss - 1), fill=ORANGE)
    big.alpha_composite(paw_layer(size * ss, paw_scale))
    return big.resize((size, size), Image.LANCZOS)


def build_icons() -> None:
    # versão de cantos redondos (favicon/png) e versão full-bleed (maskable/apple)
    rounded = {sz: icon(sz, 0.22, 1.0) for sz in (512, 192, 180, 48, 32, 16)}
    rounded[512].save(IMG / "icon-512.png", optimize=True)
    rounded[192].save(IMG / "icon-192.png", optimize=True)
    rounded[48].resize((180, 180), Image.LANCZOS).save(IMG / "apple-touch-icon.png", optimize=True)
    rounded[32].save(IMG / "favicon-32.png", optimize=True)
    rounded[16].save(IMG / "favicon-16.png", optimize=True)
    rounded[48].save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    # maskable: pata mais pequena (zona segura)
    icon(512, None, 0.74).save(IMG / "icon-maskable-512.png", optimize=True)
    print("  · favicon.ico, assets/img/icon-*.png, apple-touch-icon.png")


def build_og() -> None:
    src = next((p for p in (RAW / "hero.png", MASTERS / "hero.jpg") if p.exists()), None)
    if not src:
        return
    im = Image.open(src).convert("RGB")
    im = center_crop_to_ratio(im, 1200 / 630)
    im = im.resize((1200, 630), Image.LANCZOS)
    path = IMG / "og-cover.jpg"
    im.save(path, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"  · {path.relative_to(ROOT)}  {path.stat().st_size / 1024:.0f} KB")


def main() -> None:
    print("Fotografias:")
    for name, (widths, ratio) in JOBS.items():
        export_photo(name, widths, ratio)
    print("Ícones:")
    build_icons()
    print("Open Graph:")
    build_og()
    if RAW.exists():
        shutil.rmtree(RAW)
        print(f"  · originais removidos ({RAW.relative_to(ROOT)}/)")


if __name__ == "__main__":
    main()
