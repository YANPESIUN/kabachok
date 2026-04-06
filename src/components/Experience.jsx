import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, ContactShadows, Environment, Html } from '@react-three/drei'
import { WiggleBone } from 'wiggle'
import * as THREE from 'three'

export default function Experience() {
  const group = useRef()
  const { viewport } = useThree()
  const [loaded, setLoaded] = useState(false)
  
  const { scene } = useGLTF(import.meta.env.BASE_URL + 'models/zucchini.glb')
  
  const rootBone = useRef(null)
  const wiggleBones = useRef([])

  const targetPos = useRef(new THREE.Vector3())
  const currentPos = useRef(new THREE.Vector3())
  const rootOffset = useRef(new THREE.Vector3())

  const prevPos = useRef(new THREE.Vector3())

  // 🐍 trail
  const trail = useRef([])
  const trailLength = 12

  // 📱 drag
  const isDragging = useRef(false)

  useEffect(() => {
    if (!scene) return
    
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    scene.position.sub(center)
    
    const maxDim = Math.max(
      box.max.x - box.min.x,
      box.max.y - box.min.y,
      box.max.z - box.min.z
    )
    scene.scale.setScalar(3 / maxDim)
    
    scene.rotation.set(0, 0, -Math.PI / 2)
    
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
      
      if (child.isBone) {
        if (child.name === 'Root') {
          rootBone.current = child
          rootOffset.current.copy(child.position)
        } else if (['Body1', 'Body2', 'Body3', 'Tail'].includes(child.name)) {
          const wiggle = new WiggleBone(child, {
            velocity: 0.3,
            damping: 0.8
          })
          wiggleBones.current.push(wiggle)
        }
      }
    })
    
    setLoaded(true)
  }, [scene])

  // 🖱️ мышь (как было)
  useEffect(() => {
    const onMouseMove = (e) => {
      if (isDragging.current) return

      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      
      targetPos.current.x = x * viewport.width / 1
      targetPos.current.y = y * viewport.height / 1
    }

    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [viewport])

  // 📱 pointer (добавка, не ломает мышь)
  useEffect(() => {
    const onPointerDown = (e) => {
      isDragging.current = true
    }

    const onPointerUp = () => {
      isDragging.current = false
    }

    const onPointerMove = (e) => {
      if (!isDragging.current) return

      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      
      targetPos.current.x = x * viewport.width / 1
      targetPos.current.y = y * viewport.height / 1
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointermove', onPointerMove)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [viewport])

  const lastAngle = useRef(0) // хранит предыдущий угол вокруг центра
  const totalRotation = useRef(0) // накопленный поворот

  useFrame((state, delta) => {
    if (!rootBone.current || !group.current) return

    prevPos.current.copy(currentPos.current)
    const smoothSpeed = 15 * delta
    currentPos.current.lerp(targetPos.current, smoothSpeed)

    const rootWorldPos = new THREE.Vector3()
    rootBone.current.getWorldPosition(rootWorldPos)
    
    // просто позиция по x и y
    const deltaX = currentPos.current.x - rootWorldPos.x
    const deltaY = currentPos.current.y - rootWorldPos.y

    group.current.position.x += deltaX
    group.current.position.y += deltaY

    // вычисляем угол относительно центра
    const angle = Math.atan2(currentPos.current.y, currentPos.current.x)

    // разница углов
    let dAngle = angle - lastAngle.current

    // нормализуем разницу (-PI, PI)
    if (dAngle > Math.PI) dAngle -= 2 * Math.PI
    if (dAngle < -Math.PI) dAngle += 2 * Math.PI

    totalRotation.current += dAngle
    lastAngle.current = angle

    // если курсор прошёл более чем 180° от последнего поворота
    if (Math.abs(totalRotation.current) > Math.PI) {
      // модель начинает следовать за курсором
      group.current.rotation.z = THREE.MathUtils.lerp(
        group.current.rotation.z,
        angle - Math.PI / 2, // поворот "змейкой"
        6 * delta
      )
      totalRotation.current = 2 // сброс
    }

    // wiggle
    wiggleBones.current.forEach((wiggleBone) => wiggleBone.update(delta))
  })

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
      <pointLight position={[-3, 2, 3]} intensity={0.5} color="#e8f5e9" />
      <Environment preset="city" />
      <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2} far={4} />
      
      {!loaded && <Html center><div style={{color:'white'}}>Загрузка...</div></Html>}
      
      <group ref={group}>
        {scene && <primitive object={scene} />}
      </group>
    </>
  )
}