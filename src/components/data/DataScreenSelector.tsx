import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type Screen = {
  id: string;
  name: string;
  screen_group: string;
  screen_type: 'pendiente' | 'acabado';
};

type DataScreenSelectorProps = {
  screens: Screen[];
  onSelectScreen: (screenId: string) => void;
};

export const DataScreenSelector = ({ screens, onSelectScreen }: DataScreenSelectorProps) => {
  // Agrupamos las pantallas por su 'screen_group'
  const groupedScreens = screens.reduce((acc, screen) => {
    const group = screen.screen_group || 'General';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(screen);
    return acc;
  }, {} as Record<string, Screen[]>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Seleccionar Tabla de Datos</h2>
        <p className="text-muted-foreground">Elige el grupo de trabajo que quieres gestionar.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupedScreens).map(([groupName, screenList]) => (
          <Card key={groupName}>
            <CardHeader>
              <CardTitle>{groupName}</CardTitle>
              <CardDescription>Tablas de datos disponibles para este grupo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {screenList.map(screen => (
                <Button 
                  key={screen.id} 
                  variant="outline" 
                  className="w-full justify-between"
                  onClick={() => onSelectScreen(screen.id)}
                >
                  {screen.name}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
