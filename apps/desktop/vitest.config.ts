import { mergeConfig, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      clearMocks: true,
      environment: "node",
      include: ["src/**/*.test.ts"],
      restoreMocks: true,
    },
  }),
);
