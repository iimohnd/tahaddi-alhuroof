export const metadata = {
  title: 'تحدي الحروف',
  description: 'لعبة اسم، بلاد، حيوان، نبات، جماد',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
