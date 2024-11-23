import ChatInterface from './components/ChatInterface'
import { ThemeProvider } from './components/theme-provider'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="chat-theme">
      <div className="min-h-screen bg-background">
        <ChatInterface />
      </div>
    </ThemeProvider>
  )
}

export default App