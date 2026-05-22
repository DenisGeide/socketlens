const githubStarsDisplay = import.meta.env.VITE_SOCKETLENS_GITHUB_STARS_DISPLAY?.trim() ?? "";

export const appMetadata = {
  github: {
    repositoryUrl: "https://github.com/DenisGeide/socketlens",
    // Optional display-only count. Keep empty unless it is populated from a trusted source
    // or an explicit local/demo env value such as VITE_SOCKETLENS_GITHUB_STARS_DISPLAY.
    starsDisplay: githubStarsDisplay,
  },
  name: "SocketLens",
  version: "0.1.0-alpha",
} as const;
