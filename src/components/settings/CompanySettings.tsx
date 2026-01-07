import { useState, useRef, type ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building2, Upload, Image as ImageIcon } from "lucide-react";
import { useSystemConfig, useUpdateSystemConfig } from "@/hooks/use-system-config";
import { supabase } from "@/integrations/supabase/client";

export default function CompanySettings() {
    const { data: configs = [] } = useSystemConfig();
    const updateConfig = useUpdateSystemConfig();

    // Estados para información de empresa
    const [companyName, setCompanyName] = useState("");
    const [companyTaxId, setCompanyTaxId] = useState("");
    const [companyAddress, setCompanyAddress] = useState("");
    const [companyPhone, setCompanyPhone] = useState("");
    const [companyEmail, setCompanyEmail] = useState("");
    const [companyWebsite, setCompanyWebsite] = useState("");
    const [legalName, setLegalName] = useState("");
    const [registryData, setRegistryData] = useState("");

    // Estados para logos
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState("");
    const [altLogoFile, setAltLogoFile] = useState<File | null>(null);
    const [altLogoPreview, setAltLogoPreview] = useState("");

    const logoInputRef = useRef<HTMLInputElement>(null);
    const altLogoInputRef = useRef<HTMLInputElement>(null);

    const LOGO_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB

    // Cargar configuraciones existentes
    useState(() => {
        const getConfig = (key: string) => configs.find(c => c.key === key)?.value;

        setCompanyName(String(getConfig('company_name') || ''));
        setCompanyTaxId(String(getConfig('company_tax_id') || ''));
        setCompanyAddress(String(getConfig('company_address') || ''));
        setCompanyPhone(String(getConfig('company_phone') || ''));
        setCompanyEmail(String(getConfig('company_email') || ''));
        setCompanyWebsite(String(getConfig('company_website') || ''));
        setLegalName(String(getConfig('company_legal_name') || ''));
        setRegistryData(String(getConfig('company_registry') || ''));
        setLogoPreview(String(getConfig('company_logo') || ''));
        setAltLogoPreview(String(getConfig('company_logo_alt') || ''));
    });

    const handleLogoChange = (event: ChangeEvent<HTMLInputElement>, isAlt: boolean = false) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_LOGO_SIZE) {
            toast.error('El archivo es demasiado grande. Máximo 5MB');
            return;
        }

        if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
            toast.error('Formato no válido. Usa PNG, JPG, SVG o WEBP');
            return;
        }

        if (isAlt) {
            setAltLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAltLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleUploadLogo = async (isAlt: boolean = false) => {
        const file = isAlt ? altLogoFile : logoFile;
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `${isAlt ? 'logo-alt' : 'logo'}-${Date.now()}.${fileExt}`;
            const storagePath = `company/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(storagePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(storagePath);

            await updateConfig.mutateAsync({
                key: isAlt ? 'company_logo_alt' : 'company_logo',
                value: publicUrl,
            });

            if (isAlt) {
                setAltLogoPreview(publicUrl);
                setAltLogoFile(null);
            } else {
                setLogoPreview(publicUrl);
                setLogoFile(null);
            }

            toast.success('Logo actualizado correctamente');
        } catch (error) {
            console.error('Error al subir logo:', error);
            toast.error('Error al subir el logo');
        }
    };

    const handleSaveCompanyInfo = async () => {
        try {
            await Promise.all([
                updateConfig.mutateAsync({ key: 'company_name', value: companyName }),
                updateConfig.mutateAsync({ key: 'company_tax_id', value: companyTaxId }),
                updateConfig.mutateAsync({ key: 'company_address', value: companyAddress }),
                updateConfig.mutateAsync({ key: 'company_phone', value: companyPhone }),
                updateConfig.mutateAsync({ key: 'company_email', value: companyEmail }),
                updateConfig.mutateAsync({ key: 'company_website', value: companyWebsite }),
                updateConfig.mutateAsync({ key: 'company_legal_name', value: legalName }),
                updateConfig.mutateAsync({ key: 'company_registry', value: registryData }),
            ]);

            toast.success('Información de empresa guardada');
        } catch (error) {
            toast.error('Error al guardar información');
        }
    };

    return (
        <div className="space-y-6">
            {/* Información Básica */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Información Básica
                    </CardTitle>
                    <CardDescription>Datos principales de la empresa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Nombre de la Empresa</Label>
                            <Input
                                id="companyName"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="EGEA Control Systems"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companyTaxId">CIF/NIF</Label>
                            <Input
                                id="companyTaxId"
                                value={companyTaxId}
                                onChange={(e) => setCompanyTaxId(e.target.value)}
                                placeholder="B12345678"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="companyAddress">Dirección Fiscal</Label>
                        <Textarea
                            id="companyAddress"
                            value={companyAddress}
                            onChange={(e) => setCompanyAddress(e.target.value)}
                            placeholder="Calle Principal, 123, 28001 Madrid"
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyPhone">Teléfono</Label>
                            <Input
                                id="companyPhone"
                                value={companyPhone}
                                onChange={(e) => setCompanyPhone(e.target.value)}
                                placeholder="+34 900 000 000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companyEmail">Email</Label>
                            <Input
                                id="companyEmail"
                                type="email"
                                value={companyEmail}
                                onChange={(e) => setCompanyEmail(e.target.value)}
                                placeholder="info@empresa.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companyWebsite">Sitio Web</Label>
                            <Input
                                id="companyWebsite"
                                value={companyWebsite}
                                onChange={(e) => setCompanyWebsite(e.target.value)}
                                placeholder="https://www.empresa.com"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logos */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Logos y Branding
                    </CardTitle>
                    <CardDescription>Imágenes corporativas del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Principal */}
                        <div className="space-y-4">
                            <Label>Logo Principal</Label>
                            <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-lg">
                                <div className="w-full h-32 flex items-center justify-center bg-muted rounded">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                    )}
                                </div>
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept={LOGO_ALLOWED_TYPES.join(',')}
                                    className="hidden"
                                    onChange={(e) => handleLogoChange(e, false)}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => logoInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Elegir
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleUploadLogo(false)}
                                        disabled={!logoFile}
                                    >
                                        Subir
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Usado en el header y navegación
                            </p>
                        </div>

                        {/* Logo Alternativo */}
                        <div className="space-y-4">
                            <Label>Logo Alternativo</Label>
                            <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-lg">
                                <div className="w-full h-32 flex items-center justify-center bg-muted rounded">
                                    {altLogoPreview ? (
                                        <img src={altLogoPreview} alt="Logo Alt" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                    )}
                                </div>
                                <input
                                    ref={altLogoInputRef}
                                    type="file"
                                    accept={LOGO_ALLOWED_TYPES.join(',')}
                                    className="hidden"
                                    onChange={(e) => handleLogoChange(e, true)}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => altLogoInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Elegir
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleUploadLogo(true)}
                                        disabled={!altLogoFile}
                                    >
                                        Subir
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Usado en documentos e informes
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Datos Legales */}
            <Card>
                <CardHeader>
                    <CardTitle>Datos Legales</CardTitle>
                    <CardDescription>Información legal y registro mercantil</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="legalName">Razón Social Completa</Label>
                        <Input
                            id="legalName"
                            value={legalName}
                            onChange={(e) => setLegalName(e.target.value)}
                            placeholder="EGEA CONTROL SYSTEMS S.L."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="registryData">Registro Mercantil</Label>
                        <Textarea
                            id="registryData"
                            value={registryData}
                            onChange={(e) => setRegistryData(e.target.value)}
                            placeholder="Inscrita en el Registro Mercantil de Madrid, Tomo 12345, Folio 67, Hoja M-123456"
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            <Separator />

            <div className="flex justify-end">
                <Button onClick={handleSaveCompanyInfo} size="lg">
                    Guardar Información de Empresa
                </Button>
            </div>
        </div>
    );
}
