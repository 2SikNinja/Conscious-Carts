import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Conscious Carts",
    short_name: "Conscious Carts",
    description:
      "Search, scan, and compare grocery products with AI nutrition analysis tailored to your diet.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfaf0",
    theme_color: "#6b7f2a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
