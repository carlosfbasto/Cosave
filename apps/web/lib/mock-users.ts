import type { UserRole } from "@cosave/shared";

/** Usuarios FICTICIOS para diseñar. Los reales vendrán de Supabase Auth + tabla Profile (api). */

export const ROLE_LABEL: Record<UserRole, string> = {
  buyer: "Comprador",
  seller: "Propietario",
  agent: "Asesor de ventas",
  admin: "Administrador",
};

export const ROLE_DESCRIPTION: Record<UserRole, string> = {
  buyer: "Busca, compara y guarda propiedades; recibe alertas de coincidencias.",
  seller: "Publica y administra sus propiedades y atiende solicitudes de contacto.",
  agent: "Gestiona clientes, propiedades asignadas y oportunidades de venta.",
  admin: "Supervisa usuarios, publicaciones y la operación de la plataforma.",
};

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  city: string;
  joinedAt: string;
  lastAccess: string;
  verified: boolean;
  bio: string;
  /** Códigos de propiedades relacionadas (favoritas, publicadas o asignadas según el rol). */
  propertyCodes: string[];
  buyer?: { savedSearches: string[]; alerts: number };
  seller?: { requests: number; views: number };
  agent?: { company: string; license: string; rating: number; clients: number; closedDeals: number };
  admin?: { permissions: string[]; pendingReviews: number };
}

export const mockUsers: MockUser[] = [
  {
    id: "usr-001", fullName: "Admin COSAVE", email: "admin@cosave.com", phone: "(999) 000-0001", role: "admin",
    avatar: "/avatars/u7.jpg", city: "Mérida", joinedAt: "2025-08-01", lastAccess: "2026-10-07", verified: true,
    bio: "Administración general de la plataforma COSAVE.",
    propertyCodes: [],
    admin: { permissions: ["Gestionar usuarios", "Moderar publicaciones", "Ver reportes", "Configuración general"], pendingReviews: 6 },
  },
  {
    id: "usr-002", fullName: "Cliente COSAVE", email: "costumer@cosave.com", phone: "(986) 555-0142", role: "buyer",
    avatar: "/avatars/u2.jpg", city: "Valladolid", joinedAt: "2026-06-02", lastAccess: "2026-10-04", verified: true,
    bio: "Busco una casa o departamento en Yucatán.",
    propertyCodes: ["COS-000002", "COS-000011"],
    buyer: { savedSearches: ["Departamento en Tizimín en renta", "Casa en Mérida hasta $5,000,000"], alerts: 1 },
  },
  {
    id: "usr-003", fullName: "Roberto Chan Pat", email: "roberto.chan@cosave.com", phone: "(999) 555-0173", role: "seller",
    avatar: "/avatars/u2.jpg", city: "Mérida", joinedAt: "2026-01-15", lastAccess: "2026-10-06", verified: true,
    bio: "Propietario de casas y terrenos en Yucatán.",
    propertyCodes: ["COS-000001", "COS-000004", "COS-000007", "COS-000008", "COS-000012", "COS-000014"],
    seller: { requests: 18, views: 2340 },
  },
  {
    id: "usr-004", fullName: "Laura Pech Canul", email: "laura.pech@cosave.com", phone: "(985) 555-0128", role: "agent",
    avatar: "/avatars/u2.jpg", city: "Valladolid", joinedAt: "2025-11-20", lastAccess: "2026-10-08", verified: true,
    bio: "Asesora inmobiliaria en el oriente de Yucatán.",
    propertyCodes: ["COS-000002", "COS-000003", "COS-000005", "COS-000006", "COS-000009", "COS-000010", "COS-000011", "COS-000013"],
    agent: { company: "Pech Bienes Raíces", license: "YUC-AI-04821", rating: 4.8, clients: 12, closedDeals: 37 },
  },
];

export const getMockUser = (id: string) => mockUsers.find((u) => u.id === id);

/** Anunciante (propietario o asesor) de una propiedad; undefined si la publica la propia plataforma. */
export const advertiserOf = (code: string) =>
  mockUsers.find((u) => (u.role === "seller" || u.role === "agent") && u.propertyCodes.includes(code));

export const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
