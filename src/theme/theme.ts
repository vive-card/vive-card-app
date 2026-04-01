export const theme = {
  colors: {
    bg: "#06080d",
    bgSoft: "#0b0f17",
    panel: "#10141f",
    panelSoft: "#151b28",
    panelLight: "#1b2232",

    text: "#ffffff",
    textDark: "#101318",
    textMuted: "#98a2b3",
    textSoft: "#8f98a8",

    border: "rgba(255,255,255,0.08)",
    borderSoft: "rgba(255,255,255,0.06)",
    borderStrong: "rgba(255,255,255,0.12)",

    primary: "#e10600",
    primaryDark: "#c80000",
    primarySoft: "rgba(225,6,0,0.14)",

    danger: "#ff6b6b",
    dangerSoft: "rgba(255,107,107,0.08)",
    dangerBorder: "rgba(255,107,107,0.25)",

    success: "#24c26a",
    successSoft: "rgba(36,194,106,0.10)",

    warning: "#ffb020",
    warningSoft: "rgba(255,176,32,0.12)",

    info: "#3da5ff",
    white: "#ffffff",
    black: "#000000",

    webBg: "#f4f6f8",
    webPanel: "#ffffff",
    webLine: "#e7ebf0",
    webMuted: "#5b6472",
    webBlue: "#1f6feb",
    webChip: "#f0f3f7",
    webDanger: "#b01818",
    webWarn: "#d39b22",
    webOk: "#1e8a4a",
  },

  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
  },

  radius: {
    sm: 10,
    md: 12,
    lg: 14,
    xl: 16,
    xxl: 22,
    round: 999,
  },

  fontSize: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 15,
    xl: 16,
    xxl: 18,
    title: 22,
    hero: 28,
    heroLarge: 34,
  },

  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
    black: "900" as const,
  },

  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    soft: {
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  },
} as const;

export type AppTheme = typeof theme;
