import InstallButton from '../components/InstallButton';

export const metadata = {
  title: 'Jai Bharat – Government Jobs',
  description: 'Discover, filter, and apply to thousands of Indian government jobs.',
};

const APP_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL || '/downloads/jai-bharat.apk';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1a237e" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/images/jaibharat.logo.png" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f5f5' }}>
        <header style={{ background: '#1a237e', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/jaibharat.logo.png" alt="Jai Bharat logo" width={36} height={36} style={{ borderRadius: 4 }} />
            <span style={{ fontWeight: 700, fontSize: 20 }}>Jai Bharat</span>
          </a>
          <nav style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href="/jobs" style={{ color: '#fff', textDecoration: 'none' }}>Jobs</a>
            <a href="/jobs/near-me" style={{ color: '#fff', textDecoration: 'none' }}>Near Me</a>
            <InstallButton apkUrl={APP_DOWNLOAD_URL} />
          </nav>
        </header>
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>
          {children}
        </main>
        <footer style={{ textAlign: 'center', padding: 16, color: '#666', fontSize: 13 }}>
          © {new Date().getFullYear()} Jai Bharat ·{' '}
          <a href="/api-status" style={{ color: '#1a237e' }}>API Status</a>
        </footer>
      </body>
    </html>
  );
}
