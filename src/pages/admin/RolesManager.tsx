import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  UserPlus, 
  Shield, 
  Users, 
  Trash2,
  Crown,
  UserCog,
  Edit3,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'gestor' | 'editor';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
}

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string; description: string; permissions: string[] }> = {
  admin: {
    label: 'Administrador',
    icon: Crown,
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    description: 'Acesso total ao sistema',
    permissions: [
      'Gerenciar usuários e permissões',
      'Acessar todas as configurações',
      'Gerenciar produtos e pedidos',
      'Gerar QR Codes',
      'Ver analytics globais'
    ]
  },
  gestor: {
    label: 'Gestor',
    icon: UserCog,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: 'Gerencia operações do dia a dia',
    permissions: [
      'Gerenciar pedidos',
      'Gerenciar produtos',
      'Ver analytics',
      'Gerenciar tags e displays'
    ]
  },
  editor: {
    label: 'Editor',
    icon: Edit3,
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    description: 'Edita conteúdo e templates',
    permissions: [
      'Editar templates de arte',
      'Gerenciar cupons',
      'Ver pedidos (somente leitura)'
    ]
  }
};

export default function RolesManager() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole | null>(null);

  // Form states
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('editor');

  useEffect(() => {
    if (!authLoading && profile && !profile.is_admin) {
      navigate('/dashboard');
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar esta página.',
        variant: 'destructive'
      });
    }
  }, [profile, authLoading, navigate, toast]);

  useEffect(() => {
    if (profile?.is_admin) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch all profiles to get user info
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profilesError) throw profilesError;

      // Combine roles with user info
      const rolesWithUsers = (rolesData || []).map(role => {
        const userProfile = profilesData?.find(p => p.id === role.user_id);
        return {
          ...role,
          user_email: userProfile?.email || 'Email não encontrado',
          user_name: userProfile?.full_name || 'Sem nome'
        };
      });

      setUserRoles(rolesWithUsers);
      setUsers(profilesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as permissões.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUserId || !selectedRole) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione um usuário e uma função.',
        variant: 'destructive'
      });
      return;
    }

    // Check if user already has this role
    const existingRole = userRoles.find(
      r => r.user_id === selectedUserId && r.role === selectedRole
    );

    if (existingRole) {
      toast({
        title: 'Função já atribuída',
        description: 'Este usuário já possui esta função.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUserId,
          role: selectedRole
        });

      if (error) throw error;

      toast({
        title: 'Função atribuída',
        description: 'A função foi atribuída com sucesso.'
      });

      setShowAddDialog(false);
      setSelectedUserId('');
      setSelectedRole('editor');
      fetchData();
    } catch (error) {
      console.error('Error adding role:', error);
      toast({
        title: 'Erro ao atribuir função',
        description: 'Não foi possível atribuir a função.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedUserRole) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', selectedUserRole.id);

      if (error) throw error;

      toast({
        title: 'Função removida',
        description: 'A função foi removida com sucesso.'
      });

      setShowDeleteDialog(false);
      setSelectedUserRole(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: 'Erro ao remover função',
        description: 'Não foi possível remover a função.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredRoles = userRoles.filter(role => 
    role.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Users without any role assigned
  const usersWithoutRole = users.filter(
    user => !userRoles.some(role => role.user_id === user.id)
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard/configuracoes')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Gerenciar Funções</h1>
                <p className="text-sm text-muted-foreground">
                  Configure permissões de usuários do sistema
                </p>
              </div>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Função
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Role Hierarchy Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Hierarquia de Funções
              </CardTitle>
              <CardDescription>
                Cada função tem acesso às suas permissões e às funções inferiores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.entries(roleConfig) as [AppRole, typeof roleConfig['admin']][]).map(([role, config]) => (
                  <div
                    key={role}
                    className={`p-4 rounded-lg border ${config.color}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <config.icon className="w-5 h-5" />
                      <span className="font-semibold">{config.label}</span>
                    </div>
                    <p className="text-xs opacity-80 mb-3">{config.description}</p>
                    <ul className="text-xs space-y-1">
                      {config.permissions.map((perm, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {perm}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* User Roles Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Usuários com Funções
                  </CardTitle>
                  <CardDescription>
                    {userRoles.length} função(ões) atribuída(s)
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRoles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma função encontrada</p>
                  <p className="text-sm">Adicione funções para gerenciar permissões</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Atribuído em</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredRoles.map((userRole) => {
                        const config = roleConfig[userRole.role];
                        return (
                          <motion.tr
                            key={userRole.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="group"
                          >
                            <TableCell className="font-medium">
                              {userRole.user_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {userRole.user_email}
                            </TableCell>
                            <TableCell>
                              <Badge className={config.color}>
                                <config.icon className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(userRole.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedUserRole(userRole);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Add Role Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Função</DialogTitle>
              <DialogDescription>
                Atribua uma função a um usuário para conceder permissões
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col">
                          <span>{user.full_name || 'Sem nome'}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {usersWithoutRole.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {usersWithoutRole.length} usuário(s) sem função atribuída
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(roleConfig) as [AppRole, typeof roleConfig['admin']][]).map(([role, config]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedRole && (
                <div className={`p-3 rounded-lg border ${roleConfig[selectedRole].color}`}>
                  <p className="text-sm font-medium mb-2">Permissões incluídas:</p>
                  <ul className="text-xs space-y-1">
                    {roleConfig[selectedRole].permissions.map((perm, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-current" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddRole} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover função?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a função{' '}
                <strong>{selectedUserRole && roleConfig[selectedUserRole.role].label}</strong> de{' '}
                <strong>{selectedUserRole?.user_email}</strong>?
                <br /><br />
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRole}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
