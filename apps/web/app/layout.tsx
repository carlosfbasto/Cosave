import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HideOnAdmin } from "@/components/hide-on-admin";
import { PendingActionRunner } from "@/components/pending-action-runner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ToastHost } from "@/components/toast-host";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base para las URLs absolutas de las vistas previas al compartir (imagen, enlace).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:5300"),
  title: "COSAVE",
  description: "Búsqueda y coincidencia de propiedades",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <HideOnAdmin><SiteHeader /></HideOnAdmin>
        {children}
        <HideOnAdmin><SiteFooter /></HideOnAdmin>
        <ToastHost />
        <PendingActionRunner />
      </body>
    </html>
  );
}
