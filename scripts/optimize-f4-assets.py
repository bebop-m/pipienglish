#!/usr/bin/env python
"""F4 生产素材瘦身(F4-CHG-035):母版 PNG → 按显示尺寸 2× 缩放的 WebP。

背景:2026-09-10 商店上线后离线包 68 文件 / 58 MB,每张 1254² PNG 只显示 82–330pt,
iPad 首次打开要拉几十 MB,商店一开要解码上百 MB 位图。

用法:
    python scripts/optimize-f4-assets.py            # 从母版目录生成 public/assets/f4/**.webp 并重写 asset-manifest.json
    python scripts/optimize-f4-assets.py --check    # 只校验 manifest 哈希与文件是否一致

母版目录 design-samples/assets/f4-production-masters/ 与 public/assets/f4 同构,只读不改。
运行时 assetId 仍写 `.png`,由 src/features/farm-f4/assetUrl.ts 统一映射到 `.webp`。
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import date
from pathlib import Path

from PIL import Image

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')  # Windows 控制台默认 GBK,打印 ✓ 会炸

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / 'design-samples' / 'assets' / 'f4-production-masters'
OUTPUT = ROOT / 'public' / 'assets' / 'f4'
MANIFEST = OUTPUT / 'asset-manifest.json'
QUALITY = 82  # 2026-08 试验:q82 目检与原图无差别

# 最长边上限(像素)= 显示框(pt)× 2(Retina)再留余量;None = 保持原尺寸
MAX_EDGE_BY_PREFIX: list[tuple[str, int | None]] = [
    ('scenes/scene-2/orchard-background', None),  # 全屏背景,cover 到 2360px 宽,保持原尺寸
    ('farm-background-f3', None),
    ('scenes/scene-2/apple-juice-station', 800),  # 336pt 宽
    ('scenes/scene-2/decorations/', 680),  # 地标 330pt
    ('scenes/scene-2/cosmetics/', 640),  # 小皮 252×274pt
    ('scenes/scene-2/xiaopi', 640),
    ('scenes/scene-2/mother', 640),
    ('scenes/scene-2/travel-sign', 400),  # 170pt
    ('scenes/scene-1/hatchery/', 512),  # 177pt
    ('scenes/scene-2/hatchery/', 512),
    ('chicks/', 400),  # 116–141pt
    ('chick-f3', 400),
    ('xiaopi-f3', 640),
    ('mother-f3', 640),
    ('mother-thumbsup-f4-v1', 640),
    ('kitchen-f4', 700),  # 厨房面板 ~330pt
    ('hatchery-empty-f4', 512),
    ('rescue-basket-f4', 400),
    ('egg-f4-v2', 300),
    ('fried-egg-f4', 300),
]


def max_edge_for(relative: str) -> int | None:
    for prefix, edge in MAX_EDGE_BY_PREFIX:
        if relative.startswith(prefix):
            return edge
    raise SystemExit(f'未登记的素材,请先在 MAX_EDGE_BY_PREFIX 里给出尺寸规则:{relative}')


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convert(master: Path, relative: str) -> Path:
    target = OUTPUT / relative.replace('.png', '.webp')
    target.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(master)
    image = image.convert('RGBA') if image.mode in ('P', 'LA') or (image.mode == 'RGB' and 'transparency' in image.info) else image
    edge = max_edge_for(relative)
    if edge is not None and max(image.size) > edge:
        scale = edge / max(image.size)
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    image.save(target, 'WEBP', quality=QUALITY, method=6)
    return target


def build_manifest(entries: list[dict]) -> dict:
    return {
        'schemaVersion': 2,
        'updatedOn': date.today().isoformat(),
        'sourceRoot': 'design-samples/assets/f4-production-masters (只读母版,与本目录同构)',
        'rule': 'Each production file is a WebP derived from its master PNG by scripts/optimize-f4-assets.py; '
                'masterSha256 identifies the approved bytes, sha256 identifies the served bytes. '
                'Runtime asset ids keep the .png name and assetUrl.ts maps them to .webp.',
        'quality': QUALITY,
        'assets': entries,
    }


def main(check_only: bool) -> int:
    masters = sorted(p for p in MASTERS.rglob('*.png'))
    if not masters:
        print(f'母版目录为空:{MASTERS}')
        return 1
    entries = []
    total_master = 0
    total_output = 0
    for master in masters:
        relative = master.relative_to(MASTERS).as_posix()
        target = OUTPUT / relative.replace('.png', '.webp')
        if not check_only:
            target = convert(master, relative)
        if not target.exists():
            print(f'缺少产物:{target}')
            return 1
        with Image.open(target) as produced:
            size = produced.size
        entries.append({
            'file': relative.replace('.png', '.webp'),
            'assetId': relative,
            'pixels': f'{size[0]}x{size[1]}',
            'sha256': sha256_of(target),
            'masterFile': relative,
            'masterSha256': sha256_of(master),
        })
        total_master += master.stat().st_size
        total_output += target.stat().st_size

    audio = OUTPUT / 'audio'
    for track in sorted(audio.glob('*.mp3')) if audio.exists() else []:
        entries.append({'file': f'audio/{track.name}', 'assetId': f'audio/{track.name}', 'sha256': sha256_of(track)})

    if check_only:
        current = json.loads(MANIFEST.read_text(encoding='utf-8'))
        expected = {item['file']: item['sha256'] for item in current['assets']}
        actual = {item['file']: item['sha256'] for item in entries}
        mismatched = sorted(name for name in set(expected) | set(actual) if expected.get(name) != actual.get(name))
        if mismatched:
            print('manifest 与产物不一致:')
            for name in mismatched:
                print(f'  - {name}')
            return 1
        print(f'✓ manifest 与 {len(entries)} 个产物一致')
        return 0

    MANIFEST.write_text(json.dumps(build_manifest(entries), ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'✓ {len(masters)} 张母版 → WebP:{total_master / 1048576:.1f} MB → {total_output / 1048576:.1f} MB')
    return 0


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv))
