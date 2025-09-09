import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mi Aplicación',
  description: 'Creado con Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
