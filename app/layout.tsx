import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'C.A.S.H. Method AI Growth Analyzer',
  description: 'Analyze your content using the C.A.S.H. Method (Clarity, Authority, Structure, Headlines)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

