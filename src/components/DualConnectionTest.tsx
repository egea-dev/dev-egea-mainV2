// Componente de prueba para verificar conexión dual Supabase
import { useEffect, useState } from 'react';
import { supabaseMain, supabaseProductivity } from '@/integrations/supabase';

export const DualConnectionTest = () => {
    const [mainStatus, setMainStatus] = useState<'testing' | 'success' | 'error'>('testing');
    const [productivityStatus, setProductivityStatus] = useState<'testing' | 'success' | 'error'>('testing');
    const [mainError, setMainError] = useState<string>('');
    const [productivityError, setProductivityError] = useState<string>('');

    useEffect(() => {
        const testConnections = async () => {
            // Test DB MAIN
            try {
                const { data, error } = await supabaseMain
                    .from('profiles')
                    .select('count')
                    .limit(1);

                if (error) throw error;
                setMainStatus('success');
            } catch (error: any) {
                setMainStatus('error');
                setMainError(error.message || 'Error desconocido');
            }

            // Test DB PRODUCTIVITY
            try {
                // Usar .schema('comercial') para acceder al esquema correcto
                const { error } = await supabaseProductivity
                    .schema('comercial')
                    .from('orders')
                    .select('count')
                    .limit(1);

                // Si la tabla no existe, es normal (aún no hemos creado el esquema)
                if (error && error.message.includes('does not exist')) {
                    setProductivityStatus('success');
                    setProductivityError('Conectado (esquema pendiente de crear)');
                } else if (error) {
                    throw error;
                } else {
                    setProductivityStatus('success');
                }
            } catch (error: any) {
                setProductivityStatus('error');
                setProductivityError(error.message || 'Error desconocido');
            }
        };

        testConnections();
    }, []);

    const getStatusIcon = (status: string) => {
        if (status === 'testing') return '🔄';
        if (status === 'success') return '✅';
        return '❌';
    };

    const getStatusColor = (status: string) => {
        if (status === 'testing') return 'text-yellow-500';
        if (status === 'success') return 'text-green-500';
        return 'text-red-500';
    };

    return (
        <div className="fixed bottom-4 right-4 bg-bg-elevated border border-border-primary rounded-xl p-4 shadow-xl z-50">
            <h3 className="text-sm font-bold text-text-white mb-3">
                🔌 Test de Conexión Dual
            </h3>

            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{getStatusIcon(mainStatus)}</span>
                    <div>
                        <div className={`font-medium ${getStatusColor(mainStatus)}`}>
                            DB MAIN (MainEgea V2)
                        </div>
                        {mainError && (
                            <div className="text-xs text-text-muted">{mainError}</div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-2xl">{getStatusIcon(productivityStatus)}</span>
                    <div>
                        <div className={`font-medium ${getStatusColor(productivityStatus)}`}>
                            DB PRODUCTIVITY
                        </div>
                        {productivityError && (
                            <div className="text-xs text-text-muted">{productivityError}</div>
                        )}
                    </div>
                </div>
            </div>

            {mainStatus === 'success' && productivityStatus === 'success' && (
                <div className="mt-3 pt-3 border-t border-border-primary">
                    <div className="text-xs text-green-500 font-medium">
                        ✨ Cliente dual configurado correctamente
                    </div>
                </div>
            )}
        </div>
    );
};
