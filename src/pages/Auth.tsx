import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthRedirect = async (session: any) => {
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      const role = profile?.role?.toLowerCase() || 'operario';

      // Redirección basada en rol (nombres en español)
      switch (role) {
        case 'admin':
        case 'manager':
          navigate("/admin");
          break;
        case 'produccion':
          navigate("/admin/produccion");
          break;
        case 'envios':
          navigate("/admin/envios");
          break;
        case 'almacen':
          navigate("/admin/almacen");
          break;
        case 'comercial':
          navigate("/admin/comercial");
          break;
        case 'responsable':
          navigate("/admin/installations");
          break;
        case 'operario':
        default:
          // Operarios van a su vista de jornada (fuera de /admin)
          navigate("/user/workday");
          break;
      }
    };

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        handleAuthRedirect(session);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        handleAuthRedirect(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src="/logo-placeholder.png"
              alt="EGEA Main Control"
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-semibold text-primary uppercase tracking-wide">
            Main Control
          </CardTitle>
          <p className="text-sm text-muted-foreground tracking-wide text-balance">
            Sistema de gestión de recursos y planificación de producción
          </p>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    inputText: 'hsl(var(--foreground))',
                    inputBackground: 'hsl(var(--background))',
                    inputBorder: 'hsl(var(--border))',
                    inputPlaceholder: 'hsl(var(--muted-foreground))',
                  }
                }
              }
            }}
            providers={[]}
            redirectTo={`${window.location.origin}/admin`}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Correo electrónico',
                  password_label: 'Contraseña',
                  email_input_placeholder: 'Tu correo electrónico',
                  password_input_placeholder: 'Tu contraseña',
                  button_label: 'Iniciar sesión',
                  loading_button_label: 'Iniciando sesión ...',
                  social_provider_text: 'Iniciar sesión con {{provider}}',
                  link_text: '¿Ya tienes una cuenta? Inicia sesión',
                },
                sign_up: {
                  email_label: 'Correo electrónico',
                  password_label: 'Contraseña',
                  email_input_placeholder: 'Tu correo electrónico',
                  password_input_placeholder: 'Tu contraseña',
                  button_label: 'Registrarse',
                  loading_button_label: 'Registrando ...',
                  social_provider_text: 'Registrarse con {{provider}}',
                  link_text: '¿No tienes cuenta? Regístrate',
                },
                forgotten_password: {
                  email_label: 'Correo electrónico',
                  password_label: 'Contraseña',
                  email_input_placeholder: 'Tu correo electrónico',
                  button_label: 'Enviar instrucciones de recuperación',
                  loading_button_label: 'Enviando instrucciones ...',
                  link_text: '¿Olvidaste tu contraseña?',
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
