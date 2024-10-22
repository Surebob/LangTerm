// src/app/layout.js

import localFont from "next/font/local";
import "./globals.css";
import { TerminalProvider } from '../context/TerminalContext';
import GridBackground from '../components/GridBackground';
import Toolbar from '../components/Toolbar';
import TerminalWindow from '../components/TerminalWindow';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Quantum Terminal",
  description: "A modern terminal interface",
};

export default function RootLayout({ children }) {
  return (
    <TerminalProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
        >
          {/* Grid Background */}
          <GridBackground />

          {/* Toolbar */}
          <Toolbar />

          {/* Terminal Windows */}
          <TerminalWindow />

          {/* Main Content */}
          {children}
        </body>
      </html>
    </TerminalProvider>
  );
}
