import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'C.A.S.H. Method AI Growth Analyzer',
  description: 'Analyze any webpage for growth potential using the C.A.S.H. framework: Content, Authority, Systems, Hypergrowth',
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

