import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Translate",
  description:
    "A local, privacy-first translation app — inference runs entirely in your browser on WebGPU.",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="zh-TW" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
