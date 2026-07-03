import { apiMock } from "./apiMock";
import { apiHttp } from "./apiHttp";

const useRealApi = import.meta.env.VITE_USE_REAL_API === "true";

export const api = useRealApi ? apiHttp : apiMock;
