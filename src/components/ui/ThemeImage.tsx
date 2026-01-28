import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface ThemeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    lightSrc: string;
    darkSrc: string;
    egeaSrc?: string;
    className?: string;
}

/**
 * Componente que muestra una imagen diferente según el tema activo.
 * Útil para logos y otros assets que requieren contraste específico.
 */
export function ThemeImage({
    lightSrc,
    darkSrc,
    egeaSrc,
    className,
    alt = "",
    ...props
}: ThemeImageProps) {
    const { theme } = useTheme();

    // Determinar la fuente según el tema actual
    // Si no hay egeaSrc, usamos darkSrc para el tema egea (que también es oscuro)
    let src = lightSrc;
    if (theme === "dark" || theme === "egea") {
        src = (theme === "egea" && egeaSrc) ? egeaSrc : darkSrc;
    }

    // Si el tema es 'system', necesitamos detectar el esquema de color del sistema
    if (theme === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        src = isDark ? darkSrc : lightSrc;
    }

    return (
        <img
            src={src}
            alt={alt}
            className={cn("transition-opacity duration-300", className)}
            {...props}
        />
    );
}
