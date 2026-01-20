import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  QrCode, 
  Save, 
  Loader2,
  MessageSquare,
  Phone,
  Mail,
  Key,
  Hash,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PixSettings {
  pix_key: string;
  pix_key_type: 'phone' | 'email' | 'cpf' | 'cnpj' | 'random';
  admin_whatsapp: string;
  admin_notification_enabled: boolean;
}

const keyTypeLabels = {
  phone: { label: 'Telefone', icon: Phone, placeholder: '11999999999' },
  email: { label: 'E-mail', icon: Mail, placeholder: 'email@exemplo.com' },
  cpf: { label: 'CPF', icon: Key, placeholder: '00000000000' },
  cnpj: { label: 'CNPJ', icon: Key, placeholder: '00000000000000' },
  random: { label: 'Chave Aleatória', icon: Hash, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
};

export default function PixSettings() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PixSettings>({
    pix_key: '',
    pix_key_type: 'phone',
    admin_whatsapp: '',
    admin_notification_enabled: true,
  });

  useEffect(() => {
    if (!authLoading && profile && !profile.is_admin) {
      navigate('/dashboard');
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive"
      });
    }
  }, [profile, authLoading, navigate, toast]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['pix_key', 'pix_key_type', 'admin_whatsapp', 'admin_notification_enabled']);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      setSettings({
        pix_key: settingsMap['pix_key'] || '',
        pix_key_type: (settingsMap['pix_key_type'] as PixSettings['pix_key_type']) || 'phone',
        admin_whatsapp: settingsMap['admin_whatsapp'] || '',
        admin_notification_enabled: settingsMap['admin_notification_enabled'] === 'true',
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const updates = [
        { key: 'pix_key', value: settings.pix_key, description: 'Chave PIX para recebimento' },
        { key: 'pix_key_type', value: settings.pix_key_type, description: 'Tipo da chave PIX' },
        { key: 'admin_whatsapp', value: settings.admin_whatsapp, description: 'WhatsApp do admin para notificações' },
        { key: 'admin_notification_enabled', value: settings.admin_notification_enabled.toString(), description: 'Habilitar notificações de novos pedidos' },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso!',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.is_admin) {
    return null;
  }

  const KeyIcon = keyTypeLabels[settings.pix_key_type].icon;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/configuracoes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações PIX</h1>
            <p className="text-muted-foreground">Configure chave PIX e notificações de pedidos</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* PIX Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Chave PIX
              </CardTitle>
              <CardDescription>
                Configure a chave PIX que será exibida para os clientes no checkout
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pix_key_type">Tipo da Chave</Label>
                <Select
                  value={settings.pix_key_type}
                  onValueChange={(value) => setSettings(prev => ({ 
                    ...prev, 
                    pix_key_type: value as PixSettings['pix_key_type'],
                    pix_key: '' // Reset key when type changes
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(keyTypeLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pix_key">Chave PIX</Label>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="pix_key"
                    value={settings.pix_key}
                    onChange={(e) => setSettings(prev => ({ ...prev, pix_key: e.target.value }))}
                    placeholder={keyTypeLabels[settings.pix_key_type].placeholder}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta chave será exibida para os clientes copiarem e realizarem o pagamento.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notificações de Pedidos
              </CardTitle>
              <CardDescription>
                Receba notificações via WhatsApp quando novos pedidos PIX forem criados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações Ativas</Label>
                  <p className="text-xs text-muted-foreground">
                    Receber alerta no WhatsApp para novos pedidos PIX
                  </p>
                </div>
                <Switch
                  checked={settings.admin_notification_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, admin_notification_enabled: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_whatsapp">WhatsApp do Admin</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="admin_whatsapp"
                    value={settings.admin_whatsapp}
                    onChange={(e) => setSettings(prev => ({ ...prev, admin_whatsapp: e.target.value }))}
                    placeholder="5511999999999"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Formato: código do país + DDD + número (ex: 5511999999999)
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card border-primary/30">
            <CardHeader>
              <CardTitle className="text-sm">Preview - Exibição no Checkout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground mb-2">Chave PIX ({keyTypeLabels[settings.pix_key_type].label}):</p>
                <p className="font-mono text-lg text-primary">
                  {settings.pix_key || 'Nenhuma chave configurada'}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
