/**
 * Pie de página simple con información de marca.
 */

export default function Footer() {
  return (
    <footer className="w-full border-t mt-10">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex items-center justify-between flex-wrap gap-2">
        <span>© {new Date().getFullYear()} Pal Taxi · Todos los derechos reservados</span>
        <span className="hidden sm:block">Hecho con ❤️ para movilidad segura</span>
      </div>
    </footer>
  )
}
