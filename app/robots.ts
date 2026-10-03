import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Hand-off redirects, the admin, APIs and private reservation pages.
      disallow: ["/go/", "/admin", "/api/", "/r/", "/book/"],
    },
  };
}
