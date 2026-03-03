export function readApiConfig() {
  return {
    port: Number(process.env.API_PORT ?? 8787),
    allowedOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
  };
}
