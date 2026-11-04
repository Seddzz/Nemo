import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import appCss from "../styles.css?url";

const APP_NAME = "Anonymization";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#0c0c0a" },
      {
        name: "description",
        content: "A local anonymization layer between you and your AI model.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <Shell>
          <Outlet />
        </Shell>
        <Scripts />
      </body>
    </html>
  ),
});
