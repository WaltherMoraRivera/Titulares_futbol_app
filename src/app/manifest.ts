import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TITULARES",
    short_name: "TITULARES",
    description: "Arma la alineación del equipo en menos de un minuto",
    start_url: "/",
    display: "standalone",
    background_color: "#17140f",
    theme_color: "#c1902e",
    icons: [
      {
        src: "/icon.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
