-- Tabla de unión para asignar múltiples operarios a una tarea
CREATE TABLE IF NOT EXISTS public.task_profiles (
  task_id UUID REFERENCES public.screen_data(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, profile_id)
);

-- Habilitar RLS y políticas para la nueva tabla
ALTER TABLE public.task_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios autenticados pueden ver las asignaciones de operarios"
  ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Los administradores pueden gestionar las asignaciones de operarios"
  ON public.task_profiles FOR (INSERT, UPDATE, DELETE)
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND team = 'admin'));
