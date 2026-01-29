import { useState } from 'react'
import FileUpload from './components/FileUpload'
import Dashboard from './components/Dashboard'

function App() {
  const [currentVideoId, setCurrentVideoId] = useState(null)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-600 mb-2">
            BrandTracker
          </h1>
          <p className="text-gray-400 text-lg">Sports Sponsor Analysis & Metrics</p>
        </header>

        <main className="space-y-12">
          {!currentVideoId ? (
            <FileUpload onUploadSuccess={setCurrentVideoId} />
          ) : (
            <Dashboard videoId={currentVideoId} onReset={() => setCurrentVideoId(null)} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
