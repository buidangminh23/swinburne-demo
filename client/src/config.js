export const isProductionMode = import.meta.env.VITE_APP_MODE === "production";
export const isDemoMode = !isProductionMode;
