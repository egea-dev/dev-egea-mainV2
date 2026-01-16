export type MaterialLine = {
    material?: string | null;
    fabric?: string | null;
};

const normalize = (value: string) => value.trim().toLowerCase();

export const summarizeMaterials = (
    lines: MaterialLine[] | null | undefined,
    fallback = "N/D"
) => {
    if (!lines || lines.length === 0) return fallback;

    const unique: string[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
        const raw = String(line.material || line.fabric || "").trim();
        if (!raw) continue;
        const key = normalize(raw);
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(raw);
        if (unique.length > 2) return "Varios";
    }

    if (unique.length === 0) return fallback;
    if (unique.length === 2) return `${unique[0]}, ${unique[1]}`;
    return unique[0];
};
