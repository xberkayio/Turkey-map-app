import { useState } from 'react'
import './App.css'
import TurkeyMap from './components/TurkeyMap'

function App() {
  return (
    <div className="App">
      <header className="bg-dark text-white p-3 mb-4">
        <div className="container">
          <h1 className="h4 m-0">Türkiye'deki Rus Kurumları Haritası</h1>
        </div>
      </header>
      <main>
        <TurkeyMap />
      </main>
    </div>
  )
}

export default App