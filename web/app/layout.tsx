import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  JetBrains_Mono,
  Schibsted_Grotesk,
} from "next/font/google";
import "./globals.css";

// Bricolage Grotesque variable con los ejes de tamaño óptico (opsz) y ancho (wdth).
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
  display: "swap",
});

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
});

// Solo para bloques de código y rutas de la API.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Indicadores CR",
  description:
    "Tipo de cambio, inflación y tasas de interés de Costa Rica, con datos del Banco Central.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${schibsted.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen bg-papel font-texto text-tinta antialiased">
        {children}
      </body>
    </html>
  );
}
