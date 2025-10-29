import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, MessageCircle, Calendar, MapPin, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { StatusBadge } from '@/components/badges';

export default function PublicProfilePage() {
  const { urlId } = useParams<{ urlId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!urlId) {
        setError('URL de perfil no válida');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('public_url', `/u/${urlId}`)
          .single();

        if (error) {
          setError('Perfil no encontrado');
          console.error('Error fetching profile:', error);
        } else if (data) {
          setProfile(data);
        }
      } catch (err) {
        setError('Error al cargar el perfil');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [urlId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Perfil No Encontrado</h2>
            <p className="text-muted-foreground mb-4">{error || 'El perfil que buscas no existe o no está disponible.'}</p>
            <Button onClick={() => navigate('/')}>
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center pb-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl mb-2">{profile.full_name}</CardTitle>
                <div className="flex items-center justify-center gap-2">
                  <StatusBadge status={profile.status || 'activo'} size="sm" />
                  <Badge variant="outline" className="capitalize">
                    {profile.role}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información de Contacto
                </h3>
                
                {profile.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${profile.email}`} className="text-blue-600 hover:underline">
                      {profile.email}
                    </a>
                  </div>
                )}
                
                {profile.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${profile.phone}`} className="text-blue-600 hover:underline">
                      {profile.phone}
                    </a>
                  </div>
                )}
                
                {profile.whatsapp && (
                  <div className="flex items-center gap-3 text-sm">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`https://wa.me/${profile.whatsapp.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline"
                    >
                      {profile.whatsapp}
                    </a>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Información Laboral
                </h3>
                
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Rol:</span>
                  <Badge variant="secondary" className="capitalize">
                    {profile.role}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Estado:</span>
                  <StatusBadge status={profile.status || 'activo'} size="sm" />
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Miembro desde:</span>
                  <span>{new Date(profile.created_at).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Perfil público generado automáticamente
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/')}
                >
                  Volver al Inicio
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
