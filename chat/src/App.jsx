import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ChatProvider } from "./context/ChatContext";
import Chat from "./components/chat/Chat";

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" className="error-fallback">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <ChatProvider>
        <div className="App">
          <header className="app-header">
            <h1>Real-Time Chat</h1>
          </header>
          <main className="app-main">
            <Chat />
          </main>
        </div>
      </ChatProvider>
    </ErrorBoundary>
  );
}

export default App;
