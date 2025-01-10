import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-red-100 flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-5xl font-bold mb-4">Face Distance Detector</h1>
      <p className="text-xl mb-8 max-w-2xl">
        Real-Time Distance Detection: Get the distance between you and the camera instantly!
      </p>
      <Link href="/detect">
        <Button size="lg" className="bg-red-500 hover:bg-red-600 text-white">
          Start Detection
        </Button>
      </Link>
      <div className="absolute bottom-0 left-0 w-full p-4 bg-white bg-opacity-50">
        <Footer />
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="text-sm text-gray-600">
      <nav className="flex justify-center space-x-4">
        <Link href="/docs" className="hover:underline">Documentation</Link>
        <Link href="/about" className="hover:underline">About</Link>
        <Link href="/contact" className="hover:underline">Contact</Link>
      </nav>
    </footer>
  )
}

