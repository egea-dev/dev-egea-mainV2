import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CheckinPage() {
  const { token } = useParams<{ token: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      if (!token) return;
      const { data, error } = await supabase
        .from('screen_data')
        .select('*, screens!inner(name, next_screen_id)')
        .eq('checkin_token', token)
        .single();
      if (error || !data) toast.error("Tarea no encontrada.");
      else setTask(data);
      setLoading(false);
    };
    fetchTask();
  }, [token]);

  const handleCheckin = async () => {
    setLoading(true);
    const updateData: Partial<Task> = { status: 'acabado' };
    
    // L├ôGICA DE MOVIMIENTO AUTOM├üTICO
    if (task.screens.next_screen_id) {
      updateData.screen_id = task.screens.next_screen_id;
    }
    
    const { error } = await supabase.from('screen_data').update(updateData).eq('id', task.id);
    
    if (error) {
      toast.error("Error al marcar la tarea como completada.");
    } else {
      toast.success("┬íTarea completada! Gracias.");
      setIsCompleted(true);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-20">Cargando...</div>;

  if (!task) return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-lg text-center"><CardHeader><CardTitle className="text-2xl text-destructive">Error</CardTitle></CardHeader><CardContent><p>La tarea no pudo ser encontrada o el enlace no es v├ílido.</p></CardContent></Card>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Detalles de la Tarea</CardTitle>
          <CardDescription>Pantalla: {task.screens?.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(task.data).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-4">
              <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span>
              <span className="col-span-2">{String(value)}</span>
            </div>
          ))}
          {isCompleted || task.status === 'acabado' ? (
            <div className="text-center p-4 bg-green-100 text-green-800 rounded-md">Tarea completada.</div>
          ) : (
            <Button onClick={handleCheckin} disabled={loading} className="w-full mt-4">
              {loading ? "Actualizando..." : "Marcar como Completada"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
