const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;

export const API_BASE = (configuredBackendUrl || "https://api.thewipmeetup.com").replace(/\/$/, "");
