/**
 * Credenciales FICTICIAS para entrar con el formulario de login mientras no hay usuarios reales.
 * Solo diseño/pruebas: se validan en el navegador y se retirarán al conectar Supabase Auth.
 */
export const DEMO_CREDENTIALS = [
  { email: "costumer@cosave.com", password: "password123", userId: "usr-002" },
  { email: "admin@cosave.com", password: "password123", userId: "usr-001" },
] as const;

export const findDemoCredential = (email: string, password: string) =>
  DEMO_CREDENTIALS.find((c) => c.email === email.trim().toLowerCase() && c.password === password);
