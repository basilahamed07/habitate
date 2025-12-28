import "../styles/globals.css";
import { Cormorant_Garamond, Manrope } from "next/font/google";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-display"
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body"
});

export default function App({ Component, pageProps }) {
  return (
    <div className={`${displayFont.variable} ${bodyFont.variable}`}>
      <Component {...pageProps} />
    </div>
  );
}
