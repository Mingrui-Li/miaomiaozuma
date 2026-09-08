from pathlib import Path

from PIL import Image

from process_generated_art import remove_green_screen, square_sprite


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    "/Users/limingrui/.codex/generated_images/01a06a27-6817-7031-a2ff-546d0976cc8a/"
    "exec-e07d6326-8468-4b8a-97d7-f6c52bad2eed.png"
)
NAMES = ["fish", "settings", "map", "collection", "cosmetic", "wand", "catnip", "rainbow"]


def main() -> None:
    strip = Image.open(SOURCE).convert("RGB")
    transparent = remove_green_screen(strip)
    output = ROOT / "art" / "final" / "icons"
    output.mkdir(parents=True, exist_ok=True)
    cell_width = strip.width / 4
    cell_height = strip.height / 2
    atlas = Image.new("RGBA", (4 * 256, 2 * 256), (0, 0, 0, 0))
    for index, name in enumerate(NAMES):
        column = index % 4
        row = index // 4
        crop = transparent.crop(
            (
                round(column * cell_width),
                round(row * cell_height),
                round((column + 1) * cell_width),
                round((row + 1) * cell_height),
            )
        )
        sprite = square_sprite(crop, 256, 16)
        sprite.save(output / f"icon_{name}.png", optimize=True)
        atlas.alpha_composite(sprite, (column * 256, row * 256))
    atlas.save(output / "icon_atlas.png", optimize=True)
    print(f"Created {len(NAMES)} transparent Figma icon assets in {output}")


if __name__ == "__main__":
    main()
