import os

# ── Remap rules ────────────────────────────────────────────────────────────────
# UnderWater Bot original classes:
# 0:Abrasion, 1:Algae, 2:Anode, 3:Crack, 4:Defects, 5:Pipe, 6:Turbine, 7:pipe
UNDERWATER_BOT_MAP = {
    0: 3,  # Abrasion  → damage
    1: 1,  # Algae     → marine_growth
    2: 6,  # Anode     → anode
    3: 3,  # Crack     → damage
    4: 3,  # Defects   → damage
    5: 5,  # Pipe      → healthy
    6: 4,  # Turbine   → free_span
    7: 5,  # pipe      → healthy
}

# Corrosion Pipeline original classes:
# 0:medium-corrosion, 1:mild-corrosion, 2:no-corrosion, 3:severe-corrosion
PIPELINE_MAP = {
    0: 0,  # medium-corrosion → corrosion
    1: 0,  # mild-corrosion   → corrosion
    2: 5,  # no-corrosion     → healthy
    3: 0,  # severe-corrosion → corrosion
}

# Marine Debris original classes:
# 0:can, 1:foam, 2:plastic, 3:plastic bottle, 4:unknow
DEBRIS_MAP = {
    0: 2,  # can           → debris
    1: 2,  # foam          → debris
    2: 2,  # plastic       → debris
    3: 2,  # plastic bottle→ debris
    4: 2,  # unknow        → debris
}


def remap_labels(labels_dir, class_map):
    """Remap class IDs in all label files in a directory"""
    files = [f for f in os.listdir(labels_dir) if f.endswith('.txt')]
    print(f"Remapping {len(files)} files in {labels_dir}...")

    for fname in files:
        fpath = os.path.join(labels_dir, fname)
        new_lines = []

        with open(fpath, 'r') as f:
            lines = f.readlines()

        for line in lines:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            old_class = int(parts[0])
            new_class = class_map.get(old_class, old_class)
            parts[0] = str(new_class)
            new_lines.append(' '.join(parts))

        with open(fpath, 'w') as f:
            f.write('\n'.join(new_lines))

    print(f"✅ Done remapping {len(files)} files")


if __name__ == "__main__":
    print("=" * 50)
    print("NautiCAI Label Remapping Tool")
    print("=" * 50)

    # Since all 3 datasets are mixed together we need to
    # remap based on which dataset each image came from.
    # For now remap all labels using underwater bot map
    # as it is the largest dataset (8521 images)

    print("\nNote: Labels are mixed from 3 datasets.")
    print("Remapping all to NautiCAI unified taxonomy...")

    # Remap train labels
    remap_labels("dataset/labels/train", UNDERWATER_BOT_MAP)

    # Remap val labels
    remap_labels("dataset/labels/val", UNDERWATER_BOT_MAP)

    print("\n✅ All labels remapped successfully!")
    print("Classes now unified to NautiCAI taxonomy:")
    print("  0: corrosion")
    print("  1: marine_growth")
    print("  2: debris")
    print("  3: damage")
    print("  4: free_span")
    print("  5: healthy")
    print("  6: anode")