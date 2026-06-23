import { Suspense } from "react"
import type { Metadata, Viewport } from "next"
import { Barlow_Condensed, Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { NavigationProgress } from "@/components/byred/navigation-progress"
import { ThemeProvider } from "@/lib/context/theme-context"
import "./globals.css"

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-barlow-condensed",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-jetbrains-mono",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
}

export const metadata: Metadata = {
  title: "byred_os — By Red, LLC.",
  description: "Internal operations. Execution, not ambition.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "byred_os — By Red, LLC.",
    description: "Internal operations. Execution, not ambition.",
    url: "https://byredlanternos.com",
    siteName: "byred_os",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "By Red, LLC. — RedLantern Studios",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "byred_os — By Red, LLC.",
    description: "Internal operations. Execution, not ambition.",
    images: ["/og-image.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      // "dark" applied by default — ThemeProvider will read localStorage on mount
      // and remove it if the user picked light. The class ensures no FOUC on dark users.
      className={`dark bg-black ${barlowCondensed.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>
          <Suspense>
            <NavigationProgress />
          </Suspense>
          {children}
          <Toaster position="top-right" richColors closeButton />
          {process.env.NODE_ENV === "production" && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
