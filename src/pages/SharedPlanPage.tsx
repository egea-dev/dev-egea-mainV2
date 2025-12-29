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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f1115] text-slate-400">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-6"></div>
        <p className="animate-pulse font-medium">Cargando plan compartido...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1115] p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-900/50">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Error de Acceso</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
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
    <div className="min-h-screen bg-[#0f1115] text-slate-200 font-sans selection:bg-blue-500/30 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="text-center border-b border-slate-800 pb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4 border border-blue-500/20">
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Plan de Instalaciones
          </h1>
          <p className="text-lg text-slate-400 font-medium capitalize">
            {format(new Date(planData.month), 'MMMM yyyy', { locale: es })}
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-widest">Total</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-4xl font-bold text-white mb-1">
                {planData.installations.length}
              </div>
              <p className="text-xs text-slate-500 font-mono">instalaciones programadas</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-500/70 uppercase tracking-widest">Completadas</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-4xl font-bold text-emerald-400 mb-1">
                {planData.installations.filter(i => i.status === 'terminado').length}
              </div>
              <p className="text-xs text-slate-500 font-mono">instalaciones finalizadas</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-500/70 uppercase tracking-widest">Pendientes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-4xl font-bold text-amber-400 mb-1">
                {planData.installations.filter(i => i.status === 'pendiente').length}
              </div>
              <p className="text-xs text-slate-500 font-mono">por realizar</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de instalaciones */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-slate-800/50">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-slate-800 rounded-lg">
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              Detalle del Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {planData.installations.map((installation) => (
                <div
                  key={installation.id}
                  className={`group p-4 rounded-xl border transition-all hover:bg-slate-800/30 ${installation.status === 'terminado' ? 'border-emerald-900/30 bg-emerald-950/10' :
                      installation.status === 'pendiente' ? 'border-amber-900/30 bg-amber-950/10' :
                        'border-slate-800 bg-slate-900/20'
                    }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between sm:justify-start gap-4">
                        <h3 className="font-bold text-slate-200 text-lg group-hover:text-white transition-colors">
                          {installation.title}
                        </h3>
                        <div className="sm:hidden">
                          {getStatusIcon(installation.status)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950/30 border border-slate-800/50">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span className="font-mono text-slate-300">{format(new Date(installation.date), 'dd/MM/yyyy', { locale: es })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-500" />
                          <span className={installation.operator_name ? "text-slate-300" : "text-slate-600 italic"}>
                            {installation.operator_name || 'Sin asignar'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-slate-800/50 pt-3 sm:border-0 sm:pt-0">
                      <Badge variant="outline" className={`capitalize border ${installation.status === 'terminado' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                          installation.status === 'pendiente' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                            'text-slate-400 border-slate-700 bg-slate-800'
                        }`}>
                        {installation.status}
                      </Badge>
                      <div className="hidden sm:block">
                        {getStatusIcon(installation.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pt-8 text-sm text-slate-600 space-y-4">
          <p>Plan compartido vía Egea MainControl</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-white hover:bg-slate-800"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}
