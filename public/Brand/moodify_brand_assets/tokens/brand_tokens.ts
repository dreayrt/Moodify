export const MoodifyTheme = {
  colors: {
    primary: '#7A5CFF',
    accent: '#F557B6',
    soft: '#EED9FF',
    dark: '#0D1224',
    surface: '#161B2E',
    light: '#F6F7FB',
    gray: '#A7AABC',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #7A5CFF 0%, #F557B6 100%)',
    darkSurface: 'linear-gradient(180deg, #161B2E 0%, #0D1224 100%)',
  },
  fonts: {
    main: "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
} as const;

export type MoodifyThemeType = typeof MoodifyTheme;
