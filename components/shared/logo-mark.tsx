export type LogoVariant =
  | "gradient"
  | "white"
  | "icon"
  | "horizontal"
  | "horizontal-dark"
  | "horizontal-light"
  | "horizontal-white";

export interface LogoMarkProps {
  className?: string;
  variant?: LogoVariant;
  alt?: string;
  priority?: boolean;
}

const ASSET_PATHS: Record<LogoVariant, { webp: string; png: string; defaultAlt: string }> = {
  gradient: {
    webp: "/Brand/moodify_brand_assets/logos/symbol_only/symbol_gradient.webp",
    png: "/Brand/moodify_brand_assets/logos/symbol_only/symbol_gradient.png",
    defaultAlt: "Moodify Symbol",
  },
  white: {
    webp: "/Brand/moodify_brand_assets/logos/symbol_only/symbol_white.webp",
    png: "/Brand/moodify_brand_assets/logos/symbol_only/symbol_white.png",
    defaultAlt: "Moodify Symbol White",
  },
  icon: {
    webp: "/Brand/moodify_brand_assets/app_icons/icon_dark_glow_1024.webp",
    png: "/Brand/moodify_brand_assets/app_icons/icon_dark_glow_1024.png",
    defaultAlt: "Moodify App Icon",
  },
  horizontal: {
    webp: "/Brand/moodify_brand_assets/logos/primary/logo_primary_dark.webp",
    png: "/Brand/moodify_brand_assets/logos/primary/logo_primary_dark.png",
    defaultAlt: "Moodify Logo",
  },
  "horizontal-dark": {
    webp: "/Brand/moodify_brand_assets/logos/primary/logo_primary_dark.webp",
    png: "/Brand/moodify_brand_assets/logos/primary/logo_primary_dark.png",
    defaultAlt: "Moodify Logo",
  },
  "horizontal-light": {
    webp: "/Brand/moodify_brand_assets/logos/primary/logo_primary_horizontal.webp",
    png: "/Brand/moodify_brand_assets/logos/primary/logo_primary_horizontal.png",
    defaultAlt: "Moodify Logo Light",
  },
  "horizontal-white": {
    webp: "/Brand/moodify_brand_assets/logos/monochrome_white/logo_white_horizontal.webp",
    png: "/Brand/moodify_brand_assets/logos/monochrome_white/logo_white_horizontal.png",
    defaultAlt: "Moodify Logo White",
  },
};

export function LogoMark({
  className = "h-7 w-auto",
  variant = "gradient",
  alt,
  priority = false,
}: LogoMarkProps) {
  const asset = ASSET_PATHS[variant] ?? ASSET_PATHS.gradient;
  const imageAlt = alt ?? asset.defaultAlt;

  return (
    <picture className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
      <source srcSet={asset.webp} type="image/webp" />
      <img
        src={asset.png}
        alt={imageAlt}
        className="h-full w-full object-contain select-none pointer-events-none"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
}

export function BrandLogo({
  className = "h-8 w-auto",
  variant = "horizontal",
  alt = "Moodify",
  priority = false,
}: {
  className?: string;
  variant?: "horizontal" | "horizontal-dark" | "horizontal-light" | "horizontal-white";
  alt?: string;
  priority?: boolean;
}) {
  return (
    <LogoMark
      className={className}
      variant={variant}
      alt={alt}
      priority={priority}
    />
  );
}

