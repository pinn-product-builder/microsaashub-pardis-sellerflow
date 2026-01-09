-- Corrigir policies com USING (true) para serem mais específicas

-- Drop das policies problemáticas
DROP POLICY IF EXISTS "Users can update L2L flag" ON public.customers;
DROP POLICY IF EXISTS "Users can update campaign fields" ON public.products;

-- Recriar com condições mais específicas (restringir a coordenadores+)
CREATE POLICY "Managers can update customers" ON public.customers 
FOR UPDATE TO authenticated 
USING (
    public.has_role(auth.uid(), 'coordenador') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'diretor') OR
    public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    public.has_role(auth.uid(), 'coordenador') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'diretor') OR
    public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Managers can update products" ON public.products 
FOR UPDATE TO authenticated 
USING (
    public.has_role(auth.uid(), 'coordenador') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'diretor') OR
    public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    public.has_role(auth.uid(), 'coordenador') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'diretor') OR
    public.has_role(auth.uid(), 'admin')
);