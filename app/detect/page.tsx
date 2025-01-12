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
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-semibold text-gray-900 text-center mb-12">Face Distance Detector</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <Card className="bg-white rounded-lg shadow-md p-6">
          <CardHeader className="bg-gray-50 text-gray-900 py-4 px-6 rounded-t-lg">
            <CardTitle>Live Camera Feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {image && <img src={image} alt="Live feed" className="w-full h-full object-cover" />}
              {isDetecting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Optional: display distance on the screen */}
                </div>
              )}
            </div>
            <div className="flex justify-center space-x-6">
              <Button 
                onClick={toggleDetection} 
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg shadow-sm transition-colors duration-300">
                {isDetecting ? 'Stop Detection' : 'Start Detection'}
              </Button>
              <Button 
                onClick={toggleUnit} 
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg shadow-sm transition-colors duration-300">
                Toggle Unit ({unit})
              </Button>
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
                <TabsTrigger value="chart" className="text-red-500">Chart</TabsTrigger>
                <TabsTrigger value="table" className="text-red-500">Table</TabsTrigger>
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
                <table className="w-full table-auto text-sm text-gray-700">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th>Time</th>
                      <th>Distance ({unit})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, index) => (
                      <tr key={index} className="hover:bg-gray-100">
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
