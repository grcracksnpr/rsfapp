import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// DNA Helix particle system
function DNAHelix() {
  const groupRef = useRef<THREE.Group>(null);
  const particlesCount = 80;
  
  const particles = useMemo(() => {
    const items = [];
    const turns = 3;
    const height = 8;
    const radius = 1.2;
    
    for (let i = 0; i < particlesCount; i++) {
      const t = i / particlesCount;
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * height;
      
      // Two strands
      items.push({
        position: [
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ] as [number, number, number],
        scale: 0.06 + Math.random() * 0.03,
        strand: 0
      });
      
      items.push({
        position: [
          Math.cos(angle + Math.PI) * radius,
          y,
          Math.sin(angle + Math.PI) * radius
        ] as [number, number, number],
        scale: 0.06 + Math.random() * 0.03,
        strand: 1
      });
    }
    return items;
  }, []);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });
  
  return (
    <group ref={groupRef} position={[3.5, 0, -2]}>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position}>
          <sphereGeometry args={[particle.scale, 8, 8]} />
          <meshStandardMaterial
            color={particle.strand === 0 ? "#4a4a4a" : "#787878"}
            roughness={0.4}
            metalness={0.3}
          />
        </mesh>
      ))}
      {/* Connecting bars */}
      {Array.from({ length: 20 }).map((_, i) => {
        const t = i / 20;
        const angle = t * Math.PI * 2 * 3;
        const y = (t - 0.5) * 8;
        return (
          <mesh key={`bar-${i}`} position={[0, y, 0]} rotation={[0, angle, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 2.4, 8]} />
            <meshStandardMaterial color="#a0a0a0" roughness={0.6} transparent opacity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

// Floating abstract shapes
function FloatingShapes() {
  const shapes = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        -3 - Math.random() * 4
      ] as [number, number, number],
      scale: 0.3 + Math.random() * 0.4,
      speed: 0.5 + Math.random() * 0.5,
      rotationSpeed: 0.002 + Math.random() * 0.003
    }));
  }, []);
  
  return (
    <>
      {shapes.map((shape, i) => (
        <Float
          key={i}
          speed={shape.speed}
          rotationIntensity={0.5}
          floatIntensity={0.8}
          position={shape.position}
        >
          <Sphere args={[shape.scale, 32, 32]}>
            <MeshDistortMaterial
              color="#e8e8e8"
              roughness={0.2}
              metalness={0.1}
              distort={0.3}
              speed={1}
              transparent
              opacity={0.4}
            />
          </Sphere>
        </Float>
      ))}
    </>
  );
}

// Grid plane for depth
function GridPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[30, 30, 30, 30]} />
      <meshBasicMaterial
        color="#d0d0d0"
        wireframe
        transparent
        opacity={0.1}
      />
    </mesh>
  );
}

// Inner scene content
function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} color="#e0e0e0" />
      
      <DNAHelix />
      <FloatingShapes />
      <GridPlane />
      
      {/* Subtle fog */}
      <fog attach="fog" args={['#f7f7f7', 8, 25]} />
    </>
  );
}

// Loading fallback
function LoadingFallback() {
  return null;
}

// Error boundary for 3D
class Scene3DErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('3D Scene Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback to gradient background
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted to-background opacity-50" />
      );
    }
    return this.props.children;
  }
}

// Main exported component with delayed mounting
export function Scene3D() {
  const [mounted, setMounted] = useState(false);
  
  // Delay mount to avoid reconciliation conflicts
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  if (!mounted) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/50 to-background" />
    );
  }
  
  return (
    <Scene3DErrorBoundary>
      <div className="absolute inset-0 pointer-events-none">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            camera={{ position: [0, 0, 8], fov: 45 }}
            dpr={[1, 1.5]}
            gl={{ 
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance'
            }}
            style={{ background: 'transparent' }}
          >
            <SceneContent />
          </Canvas>
        </Suspense>
      </div>
    </Scene3DErrorBoundary>
  );
}

export default Scene3D;
