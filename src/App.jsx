import { Canvas } from '@react-three/fiber'
import Experience from './components/Experience'
import './index.css'

function App() {
  return (
    <div className="app">
      <Canvas
        shadows
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Experience />
      </Canvas>
      
    </div>
  )
}

export default App