'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'


const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss:// ddbe-34-31-78-163.ngrok-free.app/ws'  

export default function DetectPage() {
  const [isDetecting, setIsDetecting] = useState(false)
  const [distance, setDistance] = useState(0)
  const [unit, setUnit] = useState<'m' | 'cm'>('m')
  const [history, setHistory] = useState<{ time: string, distance: number }[]>([])
  const [detectionInfo, setDetectionInfo] = useState<{ distance: number, image: string | null }>({ distance: 0, image: null })
  const socketRef = useRef<WebSocket | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream | null
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }
        videoRef.current.srcObject = null
      }
    }
  }, [])

  const setupWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close()
    }

    socketRef.current = new WebSocket(WS_URL)
    
    socketRef.current.onopen = () => {
      console.log('WebSocket Connected')
      setError(null)
    }

    socketRef.current.onclose = () => {
      console.log('WebSocket Disconnected')
      setError('Connection lost. Please try again.')
      setIsDetecting(false)
    }

    socketRef.current.onerror = (error) => {
      console.error('WebSocket Error:', error)
      setError('Failed to connect to server')
      setIsDetecting(false)
    }

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.error) {
          console.error(data.error)
          setError(data.error)
          setIsDetecting(false)
        } else if (data.distance !== undefined) {
          setError(null)
          if (data.distance >= 0) {
            setDistance(data.distance)
            setHistory(prev => [...prev, { 
              time: new Date().toLocaleTimeString(), 
              distance: data.distance 
            }].slice(-10))
          }
          if (data.image) {
            setDetectionInfo({
              distance: data.distance,
              image: data.image
            })
          }
        }
      } catch (err) {
        console.error('Error parsing message:', err)
      }
    }
  }

  const toggleDetection = async () => {
    try {
      if (isDetecting) {
        if (socketRef.current) {
          socketRef.current.close()
          socketRef.current = null
        }
        if (videoRef.current) {
          const stream = videoRef.current.srcObject as MediaStream | null
          if (stream) {
            stream.getTracks().forEach(track => track.stop())
          }
          videoRef.current.srcObject = null
        }
        setIsDetecting(false)
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        })
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setupWebSocket()
          setIsDetecting(true)
        }
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to access camera')
      setIsDetecting(false)
    }
  }

  const toggleUnit = () => setUnit(unit === 'm' ? 'cm' : 'm')

  const displayDistance = unit === 'm' ? distance.toFixed(2) : (distance * 100).toFixed(0)

  const sendFrameToBackend = () => {
    if (!videoRef.current || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
        socketRef.current.send(JSON.stringify({ image: base64Image }))
      }
    } catch (err) {
      console.error('Error sending frame:', err)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined

    if (isDetecting) {
      interval = setInterval(sendFrameToBackend, 100)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isDetecting])

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-semibold text-gray-900 text-center mb-12">Face Distance Detector</h1>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <Card className="bg-white rounded-lg shadow-md p-6">
          <CardHeader className="bg-gray-50 text-gray-900 py-4 px-6 rounded-t-lg">
            <CardTitle>Live Camera Feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                playsInline 
                muted 
              />
              {isDetecting && detectionInfo.image && (
                <div className="absolute inset-0">
                  <img 
                    src={`data:image/jpeg;base64,${detectionInfo.image}`} 
                    alt="Detected Face" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-4">
              <div className="flex justify-center space-x-6">
                <Button 
                  onClick={toggleDetection} 
                  variant="destructive"
                  className="px-8 py-3">
                  {isDetecting ? 'Stop Detection' : 'Start Detection'}
                </Button>
                <Button 
                  onClick={toggleUnit} 
                  variant="destructive"
                  className="px-8 py-3">
                  Toggle Unit ({unit})
                </Button>
              </div>
              <div className="text-center text-2xl font-bold">
                Distance: {displayDistance} {unit}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg shadow-md p-6">
          <CardHeader className="bg-gray-50 text-gray-900 py-4 px-6 rounded-t-lg">
            <CardTitle>Detection History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="chart">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
              <TabsContent value="chart">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="distance" stroke="#E63946" />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="table">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto text-sm text-gray-700">
                    <thead className="bg-gray-50 text-gray-800">
                      <tr>
                        <th className="px-4 py-2">Time</th>
                        <th className="px-4 py-2">Distance ({unit})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-100">
                          <td className="border px-4 py-2">{entry.time}</td>
                          <td className="border px-4 py-2">
                            {unit === 'm' ? entry.distance.toFixed(2) : (entry.distance * 100).toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}