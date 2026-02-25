import { useState } from 'react'
import './index.css'

function App() {
  const [activePane, setActivePane] = useState<'both' | 'pdf' | 'notes'>('both');

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">

      {/* Header / Navbar */}
      <header className="h-14 border-b bg-white dark:bg-slate-950 px-6 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
            S
          </div>
          <h1 className="font-semibold text-lg tracking-tight">ScholarStack</h1>
        </div>

        {/* View Toggles */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-1 shadow-inner">
          <button
            onClick={() => setActivePane('pdf')}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${activePane === 'pdf' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            PDF Only
          </button>
          <button
            onClick={() => setActivePane('both')}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${activePane === 'both' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Split View
          </button>
          <button
            onClick={() => setActivePane('notes')}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${activePane === 'notes' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Notes Only
          </button>
        </div>

        {/* Project Context / Actions */}
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <span>Project Data</span>
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-border">
            AJ
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 flex overflow-hidden">

        {/* Left Pane: PDF Viewer Component */}
        {(activePane === 'both' || activePane === 'pdf') && (
          <section className={`h-full flex flex-col bg-slate-100 dark:bg-slate-900/50 border-r border-border transition-all duration-500 ease-in-out ${activePane === 'both' ? 'w-1/2' : 'w-full'}`}>
            <div className="px-4 py-2 border-b bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm flex justify-between items-center shrink-0">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-500">Document Viewer</h2>
              <button className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded transition-colors">Upload PDF</button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {/* Placeholder for react-pdf */}
              <div className="w-full max-w-2xl bg-white dark:bg-slate-800 shadow-xl rounded-lg p-12 min-h-[800px] border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center group transition-all hover:border-primary/50">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4 text-slate-400 group-hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">Upload a Document</h3>
                <p className="text-sm text-slate-500 max-w-xs">Drag and drop a PDF file here or click to browse your computer to start researching.</p>
              </div>
            </div>
          </section>
        )}

        {/* Right Pane: Notebook Component */}
        {(activePane === 'both' || activePane === 'notes') && (
          <section className={`h-full flex flex-col bg-white dark:bg-slate-950 transition-all duration-500 ease-in-out ${activePane === 'both' ? 'w-1/2' : 'w-full'}`}>
            <div className="px-4 py-2 border-b bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm shadow-sm flex justify-between items-center shrink-0">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-500">Project Notebook</h2>
              <div className="flex gap-2">
                <button className="text-xs text-slate-500 hover:text-foreground px-2 py-1 rounded transition-colors">History</button>
                <button className="text-xs bg-slate-100 dark:bg-slate-800 text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded transition-colors">Share</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-8 relative">

              {/* Embedded AI Query Input Placeholder */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border shadow-lg rounded-full py-2 px-4 flex items-center gap-3 z-20 transition-all focus-within:ring-2 ring-primary/20">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                    <path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 001.075.676L10 15.082l5.925 2.844A.75.75 0 0017 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Ask Scholar AI (e.g., 'Summarize the methodology...')"
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder:text-slate-400"
                />
              </div>


              <div className="max-w-3xl mx-auto pb-32">
                <h1 className="text-4xl font-extrabold tracking-tight mb-6 mt-4 outline-none empty:before:content-['Untitled_Project'] empty:before:text-slate-300 dark:empty:before:text-slate-700 cursor-text" contentEditable suppressContentEditableWarning>Dragon's Den Pitch Prep</h1>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400 mb-6">
                    This notebook contains the synthesized findings for the CW2 Entrepreneurship project...
                  </p>

                  <div className="my-8 p-4 bg-primary/5 dark:bg-primary/10 border-l-4 border-primary rounded-r-lg group relative">
                    <span className="absolute -left-3 -top-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Captured Quote</span>
                    <p className="italic text-slate-700 dark:text-slate-300">
                      "The Minimum Viable Product must solve the core problem of context switching during synthesis."
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="text-xs font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-500 border">#evidence</span>
                        <span className="text-xs font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-500 border">#mvp</span>
                      </div>
                      <a href="#" className="text-xs text-primary hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        View in Source
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
                        </svg>

                      </a>
                    </div>
                  </div>

                  <p className="leading-7">
                    Based on the extracted quote above, our architecture should prioritize the split-pane viewer.
                  </p>
                  {/* Fake cursor for dynamic feel */}
                  <span className="inline-block w-0.5 h-5 bg-primary animate-pulse ml-0.5 align-middle"></span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
