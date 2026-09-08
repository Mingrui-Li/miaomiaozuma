from __future__ import annotations

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GENERATED = Path("/Users/limingrui/.codex/generated_images/01a06a27-6817-7031-a2ff-546d0976cc8a")

SOURCES = {
    "gameplay_master": GENERATED / "exec-5755d709-28d3-4d38-965f-b78bba870cc5.png",
    "gameplay_background": GENERATED / "exec-a85d6dc6-ba44-4bd9-90cc-136841ddb1f7.png",
    "character_expressions": GENERATED / "exec-ac43c041-2d04-4193-8db5-e42f50e6422b.png",
    "home_master": GENERATED / "exec-c1322282-4252-4d24-993a-e9d042c544ab.png",
    "result_master": GENERATED / "exec-d9136cab-4c04-4e41-b8f3-a2ce55d82f5b.png",
    "cat_green_strip": GENERATED / "exec-234a3111-368b-4dd8-b616-7b423a58e619.png",
    "home_background": GENERATED / "exec-9bc23c40-93ee-4d81-ae1a-e68f257c60ee.png",
}

CAT_NAMES = ["orange", "ragdoll", "blue", "calico", "black"]


def cover_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    source_ratio = image.width / image.height
    target_ratio = size[0] / size[1]
    if source_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        x = (image.width - crop_width) // 2
        image = image.crop((x, 0, x + crop_width, image.height))
    elif source_ratio < target_ratio:
        crop_height = round(image.width / target_ratio)
        y = (image.height - crop_height) // 2
        image = image.crop((0, y, image.width, y + crop_height))
    return image.resize(size, Image.Resampling.LANCZOS)


def remove_green_screen(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    output = Image.new("RGBA", rgba.size)
    result: list[tuple[int, int, int, int]] = []
    for r, g, b, _ in rgba.getdata():
        green_excess = max(0, g - max(r, b))
        raw_alpha = max(0.0, min(1.0, 1.0 - green_excess / 255.0))
        # ImageGen's nominally flat green contains faint texture. Remove that
        # texture decisively, then remap the real anti-aliased subject edge.
        alpha = max(0.0, min(1.0, (raw_alpha - 0.30) / 0.70))
        if alpha < 0.035:
            result.append((0, 0, 0, 0))
            continue
        out_r = round(r / alpha)
        out_b = round(b / alpha)
        out_g = round((g - (1.0 - alpha) * 255.0) / alpha)
        result.append((min(255, out_r), min(255, max(0, out_g)), min(255, out_b), round(alpha * 255)))
    output.putdata(result)
    return output


def square_sprite(image: Image.Image, size: int = 256, padding: int = 10) -> Image.Image:
    bbox = image.getbbox()
    if not bbox:
        raise ValueError("Sprite became fully transparent")
    subject = image.crop(bbox)
    available = size - padding * 2
    scale = min(available / subject.width, available / subject.height)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((size - subject.width) // 2, (size - subject.height) // 2))
    return canvas


def main() -> None:
    for source in SOURCES.values():
        if not source.exists():
            raise FileNotFoundError(source)

    masters = ROOT / "art" / "final"
    runtime = ROOT / "assets" / "resources" / "game"
    cats_dir = runtime / "cats"
    masters.mkdir(parents=True, exist_ok=True)
    cats_dir.mkdir(parents=True, exist_ok=True)

    for name in ("gameplay_master", "home_master", "result_master", "character_expressions"):
        Image.open(SOURCES[name]).save(masters / f"{name}.png", optimize=True)

    background = cover_resize(Image.open(SOURCES["gameplay_background"]).convert("RGB"), (750, 1334))
    background.save(runtime / "gameplay_background.jpg", quality=88, optimize=True, progressive=True)
    background.save(masters / "gameplay_background.png", optimize=True)

    home_background = cover_resize(Image.open(SOURCES["home_background"]).convert("RGB"), (750, 1334))
    home_background.save(runtime / "home_background.jpg", quality=88, optimize=True, progressive=True)
    home_background.save(masters / "home_background.png", optimize=True)

    strip = Image.open(SOURCES["cat_green_strip"]).convert("RGB")
    transparent = remove_green_screen(strip)
    atlas = Image.new("RGBA", (256 * len(CAT_NAMES), 256), (0, 0, 0, 0))
    for index, name in enumerate(CAT_NAMES):
        left = round(index * strip.width / len(CAT_NAMES))
        right = round((index + 1) * strip.width / len(CAT_NAMES))
        sprite = square_sprite(transparent.crop((left, 0, right, strip.height)))
        sprite.save(cats_dir / f"cat_{name}.png", optimize=True)
        atlas.alpha_composite(sprite, (index * 256, 0))
    atlas.save(cats_dir / "cat_atlas.png", optimize=True)

    print(f"Processed {len(SOURCES)} generated sources")
    print(f"Runtime background: {runtime / 'gameplay_background.jpg'}")
    print(f"Cat sprites: {cats_dir}")


if __name__ == "__main__":
    main()
