const viteEnv = import.meta.env ?? {};

export const isProductionMode = viteEnv.VITE_APP_MODE === "production";
export const isDemoMode = !isProductionMode;
