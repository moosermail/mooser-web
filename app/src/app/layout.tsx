import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Moosermail",
  description: "The missing inbox for Resend.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head />
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var t = localStorage.getItem('theme');
                if (t) document.documentElement.setAttribute('data-theme', t);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
