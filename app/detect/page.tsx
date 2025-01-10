'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function DetectPage() {
  const [isDetecting, setIsDetecting] = useState(false)
  const [distance, setDistance] = useState(0)
  const [unit, setUnit] = useState<'m' | 'cm'>('m')
  const [history, setHistory] = useState<{ time: string, distance: number }[]>([])
  const [image, setImage] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  const toggleDetection = () => {
    if (isDetecting) {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    } else {
      socketRef.current = new WebSocket('ws://localhost:8000/ws')
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.message) {
          console.log(data.message)
        } else if (data.error) {
          console.error(data.error)
          setIsDetecting(false)
        } else if (data.distance !== undefined) {
          if (data.distance >= 0) {
            setDistance(data.distance)
            setHistory(prev => [...prev, { time: new Date().toLocaleTimeString(), distance: data.distance }].slice(-10))
          }
          if (data.image) {
            setImage(`data:image/jpeg;base64,${data.image}`)
          }
        }
      }
    }
    setIsDetecting(!isDetecting)
  }

  const toggleUnit = () => {
    setUnit(unit === 'm' ? 'cm' : 'm')
  }

  const displayDistance = unit === 'm' ? distance.toFixed(2) : (distance * 100).toFixed(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-red-100 p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">Face Distance Detector</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Live Camera Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {image && <img src={image} alt="Live feed" className="w-full h-full object-cover" />}
              {isDetecting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* <div className="border-4 border-green-500 w-1/2 h-1/2 flex items-center justify-center text-white text-2xl font-bold">
                    {displayDistance} {unit}
                  </div> */}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-center space-x-4">
              <Button onClick={toggleDetection}>
                {isDetecting ? 'Stop Detection' : 'Start Detection'}
              </Button>
              <Button onClick={toggleUnit}>
                Toggle Unit ({unit})
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Detection History</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <Line type="monotone" dataKey="distance" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="table">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Distance ({unit})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, index) => (
                      <tr key={index}>
                        <td>{entry.time}</td>
                        <td>{unit === 'm' ? entry.distance.toFixed(2) : (entry.distance * 100).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

