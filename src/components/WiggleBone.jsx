import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'

export const WiggleBone = forwardRef(function WiggleBone({ 
  scene, 
  animations, 
  stiffness = 300, 
  damping = 20, 
  mass = 1 
}, ref) {
  const bones = useRef([])
  const physics = useRef([])
  
  useEffect(() => {
    if (!scene) return
    
    // Ищем кости в модели (если есть риг)
    // Или создаем виртуальные "кости" для мешей
    const foundBones = []
    
    scene.traverse((child) => {
      if (child.isBone) {
        foundBones.push(child)
      } else if (child.isMesh && child.name.includes('tail') || child.name.includes('end')) {
        // Если нет костей, но есть меш "попки" — добавляем как wiggle объект
        foundBones.push(child)
      }
    })
    
    // Если костей нет — создаем физику для всей модели
    if (foundBones.length === 0) {
      // Создаем виртуальную "попку" — нижняя часть модели
      foundBones.push(scene)
    }
    
    bones.current = foundBones
    
    // Инициализируем физику для каждой кости
    physics.current = foundBones.map(() => ({
      velocity: new THREE.Vector3(0, 0, 0),
      position: new THREE.Vector3(0, 0, 0),
      targetPosition: new THREE.Vector3(0, 0, 0)
    }))
  }, [scene])
  
  // Экспортируем метод update
  useImperativeHandle(ref, () => ({
    update: (delta) => {
      const dt = Math.min(delta, 0.1) // Ограничиваем delta
      
      bones.current.forEach((bone, i) => {
        const phys = physics.current[i]
        if (!phys) return
        
        // Пружинная физика
        const force = new THREE.Vector3()
          .subVectors(phys.targetPosition, phys.position)
          .multiplyScalar(stiffness)
        
        const dampingForce = phys.velocity.clone().multiplyScalar(-damping)
        
        // Ускорение = сила / масса
        const acceleration = force.add(dampingForce).divideScalar(mass)
        
        // Обновляем скорость
        phys.velocity.add(acceleration.multiplyScalar(dt))
        
        // Обновляем позицию
        phys.position.add(phys.velocity.clone().multiplyScalar(dt))
        
        // Применяем к кости/мешу
        if (bone.isBone) {
          bone.rotation.x = phys.position.x
          bone.rotation.z = phys.position.z
        } else {
          // Для меша — добавляем небольшой поворот
          bone.rotation.x += phys.velocity.y * dt * 0.1
          bone.rotation.z += phys.velocity.x * dt * 0.1
        }
      })
    },
    
    // Добавляем импульс от движения
    addImpulse: (force) => {
      physics.current.forEach((phys) => {
        phys.velocity.add(force)
      })
    }
  }))
  
  return null
})