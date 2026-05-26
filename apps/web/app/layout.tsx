import type { ReactNode } from "react";
import "./styles.css";

export const metadata = {
  title: "SmartPay Japan Trip Decision Flow",
  description: "Consumption authorization, decision, and mock execution demo."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
