import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { format, startOfMonth, endOfMonth, isSameMonth, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface Installation {
  id: string
  title: string
  date: string
  status: string
  operator_name: string
}

interface SharedPlanData {
  plan_id: string
  month: string
  installations: Installation[]
}

export default function SharedPlanPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [planData, setPlanData] = useState<SharedPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSharedPlan = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .rpc('get_shared_plan_data', { p_token: token })

        if (error) {
          setError('No se pudo cargar el plan compartido')
          return
        }

        if (!data) {
          setError('Plan no encontrado o expirado')
          return
        }

        setPlanData(data)
      } catch (err) {
        console.error('Error fetching shared plan:', err)
        setError('Error al cargar el plan')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchSharedPlan()
    }
  }, [token])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'en fabricacion':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'terminado':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'terminado':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pendiente':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando plan compartido...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!planData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Plan de Instalaciones
          </h1>
          <p className="text-lg text-gray-600">
            {format(new Date(planData.month), 'MMMM yyyy', { locale: es })}
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900">
                {planData.installations.length}
              </div>
              <p className="text-xs text-gray-500">instalaciones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completadas</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-green-600">
                {planData.installations.filter(i => i.status === 'terminado').length}
              </div>
              <p className="text-xs text-gray-500">instalaciones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pendientes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-yellow-600">
                {planData.installations.filter(i => i.status === 'pendiente').length}
              </div>
              <p className="text-xs text-gray-500">instalaciones</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de instalaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Instalaciones del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {planData.installations.map((installation) => (
                <div
                  key={installation.id}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(installation.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {installation.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(installation.date), 'dd/MM/yyyy', { locale: es })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{installation.operator_name || 'Sin asignar'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {installation.status}
                      </Badge>
                      {getStatusIcon(installation.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Plan compartido vía Egea MainControl</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/')}
            className="mt-2"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}