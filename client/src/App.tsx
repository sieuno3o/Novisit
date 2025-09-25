import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="App">
        <header>
          <h1>Novisit</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<div>Welcome to Novisit!</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
