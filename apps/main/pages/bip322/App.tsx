import { ThemeProvider } from '@/components/theme-provider'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="text-center m-6">
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          BIP322
        </h2>
        <a
          className="text-black/60 hover:text-black/80"
          href="https://github.com/bitcoin/bips/blob/master/bip322.mediawiki"
          target="_blank"
        >
          github.com/bitcoin/bip322
        </a>
        <blockquote className="border-l-2 p-6 italic">
          A standard for interoperable signed messages based on the Bitcoin
          Script format, either for proving fund availability, or committing to
          a message as the intended recipient of funds sent to the invoice
          address.
        </blockquote>
      </div>
    </ThemeProvider>
  )
}

export default App
