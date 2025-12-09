import './global.css';

export const metadata = {
  title: 'JTT Platform Console',
  description: 'User management and service activation dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
