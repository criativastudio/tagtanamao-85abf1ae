import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, QrCode, Dog, Building2 } from 'lucide-react';
import logoHorizontal from "@/assets/logo-horizontal.png";
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres');
const activationCodeSchema = z.string().min(1, 'Código de ativação é obrigatório');
type ProductType = 'pet_tag' | 'business_display';
interface ValidatedProduct {
  productId: string;
  productType: ProductType;
  qrCode: string;
}
export default function Auth() {
  const [searchParams] = useSearchParams();
  const fromShop = searchParams.get('from') === 'shop';
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    activationCode?: string;
  }>({});

  // Signup with activation code states
  const [signupStep, setSignupStep] = useState(1);
  const [productType, setProductType] = useState<ProductType | null>(null);
  const [activationCode, setActivationCode] = useState('');
  const [validatedProduct, setValidatedProduct] = useState<ValidatedProduct | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  // Activation is now always optional - users can create accounts freely
  const [skipActivation] = useState(true);
  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);
  const validateForm = () => {
    const newErrors: typeof errors = {};
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    if (!isLogin && password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleValidateActivationCode = async () => {
    if (!activationCode.trim() || !productType) {
      setErrors({
        activationCode: 'Digite o código de ativação'
      });
      return;
    }
    setIsValidatingCode(true);
    setErrors({});
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('validate-activation-code', {
        body: {
          code: activationCode.trim(),
          type: productType
        }
      });
      if (error || !data?.valid) {
        toast({
          title: 'Código inválido',
          description: data?.error || 'Este código não foi encontrado ou já foi ativado.',
          variant: 'destructive'
        });
        return;
      }

      // Code is valid, move to account creation step
      setValidatedProduct({
        productId: data.productId,
        productType: data.productType,
        qrCode: data.qrCode
      });
      setSignupStep(3);
      toast({
        title: 'Código validado!',
        description: 'Agora crie sua conta para ativar o produto.'
      });
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao validar o código. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsValidatingCode(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (isLogin) {
        const {
          error
        } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Erro ao entrar',
              description: 'Email ou senha incorretos.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Erro ao entrar',
              description: error.message,
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: 'Bem-vindo!',
            description: 'Login realizado com sucesso.'
          });
          navigate(redirectTo);
        }
      } else {
        // Signup flow - activation code is now optional

        const {
          error
        } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Erro ao cadastrar',
              description: 'Este email já está cadastrado. Faça login.',
              variant: 'destructive'
            });
            setIsLogin(true);
            setSignupStep(1);
          } else {
            toast({
              title: 'Erro ao cadastrar',
              description: error.message,
              variant: 'destructive'
            });
          }
          return;
        }

        // Wait for session to be established
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        if (session?.user && validatedProduct) {
          // Activate product for the new user (only if we have a validated product)
          const {
            error: activateError
          } = await supabase.functions.invoke('activate-on-signup', {
            body: {
              userId: session.user.id,
              productId: validatedProduct.productId,
              productType: validatedProduct.productType
            }
          });
          if (activateError) {
            console.error('Activation error:', activateError);
            toast({
              title: 'Conta criada',
              description: 'Conta criada, mas houve um erro ao ativar o produto. Contate o suporte.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Conta criada e produto ativado!',
              description: 'Sua conta foi criada e seu produto já está ativado.'
            });
          }
        } else if (session?.user && skipActivation) {
          // Shop flow - just account creation, no product activation
          toast({
            title: 'Conta criada!',
            description: 'Sua conta foi criada com sucesso. Continue sua compra.'
          });
        }
        navigate(redirectTo);
      }
    } finally {
      setIsLoading(false);
    }
  };
  const resetSignupFlow = () => {
    setSignupStep(1);
    setProductType(null);
    setActivationCode('');
    setValidatedProduct(null);
    setErrors({});
  };
  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    resetSignupFlow();
    setErrors({});
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  // Signup Step 1: Select product type
  const renderProductTypeSelection = () => <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: -20
  }} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-foreground">Qual produto você comprou?</h2>
        <p className="text-sm text-muted-foreground">Selecione o tipo para continuar</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.button type="button" whileHover={{
        scale: 1.02
      }} whileTap={{
        scale: 0.98
      }} onClick={() => {
        setProductType('pet_tag');
        setSignupStep(2);
      }} className="p-4 rounded-xl border border-border/50 bg-background/50 hover:border-primary/50 transition-colors text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-primary/20 flex items-center justify-center mb-3">
            <Dog className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-medium text-foreground">Tag Pet</h3>
          <p className="text-xs text-muted-foreground mt-1">Tag para coleira</p>
        </motion.button>

        <motion.button type="button" whileHover={{
        scale: 1.02
      }} whileTap={{
        scale: 0.98
      }} onClick={() => {
        setProductType('business_display');
        setSignupStep(2);
      }} className="p-4 rounded-xl border border-border/50 bg-background/50 hover:border-blue-500/50 transition-colors text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="font-medium text-foreground">Display</h3>
          <p className="text-xs text-muted-foreground mt-1">Display empresarial</p>
        </motion.button>
      </div>
    </motion.div>;

  // Signup Step 2: Enter activation code
  const renderActivationCodeInput = () => <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: -20
  }} className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={() => setSignupStep(1)} className="text-muted-foreground hover:text-foreground">
          ←
        </button>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${productType === 'pet_tag' ? 'bg-primary/20' : 'bg-blue-500/20'}`}>
          {productType === 'pet_tag' ? <Dog className="w-5 h-5 text-primary" /> : <Building2 className="w-5 h-5 text-blue-400" />}
        </div>
        <div>
          <h2 className="font-semibold text-foreground">
            {productType === 'pet_tag' ? 'Tag Pet' : 'Display Empresarial'}
          </h2>
          <p className="text-xs text-muted-foreground">Digite o código do produto</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Código de Ativação</label>
        <div className="relative">
          <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input type="text" placeholder="Digite o código de 6 dígitos" value={activationCode} onChange={e => setActivationCode(e.target.value)} className="pl-10 bg-background/50 border-border/50 focus:border-primary" />
        </div>
        <p className="text-xs text-muted-foreground">
          O código está impresso no seu produto ou no cartão que o acompanha
        </p>
        {errors.activationCode && <p className="text-sm text-destructive">{errors.activationCode}</p>}
      </div>

      <Button type="button" variant="hero" size="lg" className="w-full" onClick={handleValidateActivationCode} disabled={isValidatingCode || !activationCode.trim()}>
        {isValidatingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
            Validar Código
            <ArrowRight className="w-5 h-5 ml-2" />
          </>}
      </Button>
    </motion.div>;

  // Signup Step 3: Create account
  const renderAccountForm = () => <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: -20
  }}>
      {!isLogin && validatedProduct && <div className="mb-6 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${validatedProduct.productType === 'pet_tag' ? 'bg-primary/20' : 'bg-blue-500/20'}`}>
              {validatedProduct.productType === 'pet_tag' ? <Dog className="w-4 h-4 text-primary" /> : <Building2 className="w-4 h-4 text-blue-400" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Código validado ✓</p>
              <p className="text-xs text-muted-foreground">
                {validatedProduct.productType === 'pet_tag' ? 'Tag Pet' : 'Display'}: {validatedProduct.qrCode}
              </p>
            </div>
          </div>
        </div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-background/50 border-border/50 focus:border-primary" />
          </div>
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 bg-background/50 border-border/50 focus:border-primary" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>

        {/* Confirm Password (signup only) */}
        {!isLogin && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirmar Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10 bg-background/50 border-border/50 focus:border-primary" />
            </div>
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
          </motion.div>}

        {/* Submit Button */}
        <Button type="submit" variant="hero" size="lg" className="w-full mt-6" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
              {isLogin ? 'Entrar' : skipActivation ? 'Criar Conta' : 'Criar Conta e Ativar'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </>}
        </Button>
      </form>
    </motion.div>;
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5
        }} className="glass-card p-8 rounded-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div initial={{
              scale: 0.5
            }} animate={{
              scale: 1
            }} transition={{
              delay: 0.2,
              type: 'spring'
            }} className="mb-4 flex justify-center">
                <img alt="Tag Tá Na Mão" className="h-10 object-contain" src="/lovable-uploads/c37cfe01-38fd-432c-a969-8e15f789223e.png" />
              </motion.div>
              <h1 className="text-2xl font-bold text-foreground">
                {isLogin ? 'Entrar na sua conta' : 'Criar nova conta'}
              </h1>
              <p className="text-muted-foreground mt-2">
                {isLogin ? 'Acesse suas tags e displays' : 'Crie sua conta para gerenciar seus produtos'}
              </p>
            </div>

            {/* Content - always show account form directly */}
            <AnimatePresence mode="wait">
              {renderAccountForm()}
            </AnimatePresence>

            {/* Toggle login/signup */}
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {isLogin ? 'Comprou um produto?' : 'Já tem uma conta?'}
                <button type="button" onClick={handleToggleMode} className="ml-2 text-primary hover:underline font-medium">
                  {isLogin ? 'Criar conta' : 'Entrar'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>;
}