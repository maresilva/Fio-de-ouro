-- ==============================================================================
-- ERP FIO DE OURO - MIGRATION 001: SCHEMA DE SEGURANÇA, RBAC E PERSISTÊNCIA
-- ==============================================================================
-- Descrição:
-- 1. Criação da tabela de perfis de usuário (RBAC gerenciado exclusivamente no servidor).
-- 2. Criação das tabelas de dados operacionais (Futebol & Histórico da Lotérica).
-- 3. Habilitação de RLS (Row Level Security) em todas as tabelas.
-- 4. Constraints para garantir integridade:
--    - Fechamento único por data (unique_closing_date).
--    - Prevenção contra pagamento duplicado de apostas (unique_bet_prize).
-- 5. Trilha de auditoria imutável com autoria do servidor.
-- ==============================================================================

-- 1. Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuário (Fonte da Verdade para Roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('gestor', 'operador', 'financeiro', 'auditor')) DEFAULT 'operador',
    badge TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Função helper para recuperar o perfil/role do usuário autenticado atual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS boolean AS $$
    SELECT is_active FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    cpf TEXT,
    reference_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid()
);

-- 4. Painel de Futebol: Apostas
CREATE TABLE IF NOT EXISTS public.football_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    date DATE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_legacy_id TEXT,
    client_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL CHECK (status IN ('pago', 'nao_pago')) DEFAULT 'nao_pago',
    received_at TIMESTAMPTZ,
    received_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid()
);

-- Função Atômica no Banco de Dados para Baixa de Aposta (Prevenção Concorrente de Recebimento Duplicado)
CREATE OR REPLACE FUNCTION public.confirm_bet_payment(
    p_bet_id UUID,
    p_received_at TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
    v_bet public.football_bets%ROWTYPE;
    v_user_role TEXT;
BEGIN
    -- Verifica autorização do usuário (apenas gestor, operador ou financeiro)
    v_user_role := public.get_current_user_role();
    IF v_user_role NOT IN ('gestor', 'operador', 'financeiro') THEN
        RAISE EXCEPTION 'Acesso negado: perfil % não possui autorização para dar baixa.', v_user_role;
    END IF;

    -- Bloqueio pessimista de linha (FOR UPDATE) para garantir atomicidade sob concorrência
    SELECT * INTO v_bet
    FROM public.football_bets
    WHERE id = p_bet_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Aposta não localizada.');
    END IF;

    -- Se já estiver paga, recusa a segunda confirmação atômica
    IF v_bet.status = 'pago' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Aposta já se encontra paga. Recebimento duplicado recusado pelo banco.',
            'already_paid', true,
            'received_at', v_bet.received_at
        );
    END IF;

    -- Atualização atômica
    UPDATE public.football_bets
    SET status = 'pago',
        received_at = p_received_at,
        received_by = auth.uid()
    WHERE id = p_bet_id;

    -- Registro atômico na auditoria
    INSERT INTO public.audit_logs (
        timestamp,
        user_id,
        user_name,
        user_role,
        action,
        entity,
        entity_id,
        reference,
        details,
        previous_state,
        new_state
    ) VALUES (
        timezone('utc'::text, now()),
        auth.uid(),
        COALESCE((SELECT name FROM public.profiles WHERE id = auth.uid()), 'Operador'),
        v_user_role,
        'BAIXA_APOSTA_ATOMICA',
        'FootballBet',
        p_bet_id::text,
        'Baixa Aposta ' || v_bet.client_name,
        'Baixa confirmada atomicamente no banco para aposta de R$ ' || v_bet.amount::text,
        row_to_json(v_bet)::jsonb,
        jsonb_build_object('id', p_bet_id, 'status', 'pago', 'received_at', p_received_at, 'received_by', auth.uid())
    );

    RETURN jsonb_build_object('success', true, 'bet_id', p_bet_id, 'status', 'pago');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Painel de Futebol: Fechamentos Diários
-- Regra de negócio: Saldo = Apurado - Descarrego
-- Constraint: Fechamento único por data
CREATE TABLE IF NOT EXISTS public.football_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    date DATE NOT NULL,
    apurado NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (apurado >= 0),
    descarrego NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (descarrego >= 0),
    saldo NUMERIC(12, 2) GENERATED ALWAYS AS (apurado - descarrego) STORED,
    status TEXT NOT NULL CHECK (status IN ('aberto', 'fechado', 'revisado')) DEFAULT 'fechado',
    notes TEXT,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    closed_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_closing_date UNIQUE (date)
);

-- 6. Histórico de Correções de Fechamento Diário
CREATE TABLE IF NOT EXISTS public.closing_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_id UUID NOT NULL REFERENCES public.football_closings(id) ON DELETE CASCADE,
    previous_apurado NUMERIC(12, 2) NOT NULL,
    new_apurado NUMERIC(12, 2) NOT NULL,
    previous_descarrego NUMERIC(12, 2) NOT NULL,
    new_descarrego NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    corrected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    corrected_by UUID NOT NULL REFERENCES public.profiles(id) DEFAULT auth.uid()
);

-- 7. Painel de Futebol: Prêmios
-- Constraint: unique_bet_prize (impede pagar o mesmo bilhete/aposta duas vezes)
CREATE TABLE IF NOT EXISTS public.football_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_legacy_id TEXT,
    client_name TEXT NOT NULL,
    bet_id UUID REFERENCES public.football_bets(id) ON DELETE SET NULL,
    bet_legacy_id TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    paid_at TIMESTAMPTZ NOT NULL,
    paid_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_bet_prize UNIQUE (bet_id)
);

-- 8. Trilha de Auditoria Geral (Imutável)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    user_id UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    reference TEXT,
    details TEXT,
    previous_state JSONB,
    new_state JSONB
);

-- 9. Tabelas Históricas da Lotérica (Preservadas para consulta)
CREATE TABLE IF NOT EXISTS public.legacy_drawers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL,
    current_shift_id TEXT
);

CREATE TABLE IF NOT EXISTS public.legacy_cash_shifts (
    id TEXT PRIMARY KEY,
    drawer_id TEXT NOT NULL,
    operator_id TEXT NOT NULL,
    operator_name TEXT NOT NULL,
    period TEXT NOT NULL,
    status TEXT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.legacy_treasury_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    code TEXT NOT NULL,
    balance NUMERIC(12, 2) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.legacy_treasury_transactions (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    source_account_id TEXT NOT NULL,
    dest_account_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL,
    reference TEXT NOT NULL,
    notes TEXT,
    performed_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.legacy_reconciliations (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    system_amount NUMERIC(12, 2) NOT NULL,
    bank_amount NUMERIC(12, 2) NOT NULL,
    difference NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL,
    type TEXT NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.legacy_prizes (
    id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL,
    contest_number TEXT NOT NULL,
    ticket_number TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL,
    data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.legacy_finance_records (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    competency TEXT NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL,
    data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.legacy_payroll_records (
    id TEXT PRIMARY KEY,
    employee_name TEXT NOT NULL,
    role TEXT NOT NULL,
    type TEXT NOT NULL,
    competency TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL,
    data JSONB NOT NULL
);

-- ==============================================================================
-- 10. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.football_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.football_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closing_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.football_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_treasury_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_payroll_records ENABLE ROW LEVEL SECURITY;

-- Revogar qualquer privilégio público/anônimo
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- POLICIES: PROFILES
-- Usuários autenticados podem ver perfis ativos
CREATE POLICY "profiles_select_authenticated" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Apenas Gestores podem criar ou atualizar roles de usuários
CREATE POLICY "profiles_insert_gestor" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() = 'gestor');

CREATE POLICY "profiles_update_gestor" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() = 'gestor')
    WITH CHECK (public.get_current_user_role() = 'gestor');

-- POLICIES: CLIENTS
CREATE POLICY "clients_select_active" ON public.clients
    FOR SELECT TO authenticated
    USING (public.is_current_user_active());

CREATE POLICY "clients_insert_operator_gestor" ON public.clients
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_current_user_active() AND 
        public.get_current_user_role() IN ('gestor', 'operador', 'financeiro')
    );

CREATE POLICY "clients_update_operator_gestor" ON public.clients
    FOR UPDATE TO authenticated
    USING (
        public.is_current_user_active() AND 
        public.get_current_user_role() IN ('gestor', 'operador')
    );

-- POLICIES: FOOTBALL BETS
CREATE POLICY "bets_select_active" ON public.football_bets
    FOR SELECT TO authenticated
    USING (public.is_current_user_active());

CREATE POLICY "bets_insert_operator_gestor" ON public.football_bets
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_current_user_active() AND 
        public.get_current_user_role() IN ('gestor', 'operador')
    );

CREATE POLICY "bets_update_operator_gestor" ON public.football_bets
    FOR UPDATE TO authenticated
    USING (
        public.is_current_user_active() AND 
        public.get_current_user_role() IN ('gestor', 'operador', 'financeiro')
    );

-- POLICIES: FOOTBALL CLOSINGS
CREATE POLICY "closings_select_active" ON public.football_closings
    FOR SELECT TO authenticated
    USING (public.is_current_user_active());

-- Operadores, Gestores e Financeiros podem criar fechamento inicial do dia
CREATE POLICY "closings_insert_active" ON public.football_closings
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_current_user_active() AND 
        public.get_current_user_role() IN ('gestor', 'operador', 'financeiro')
    );

-- CRÍTICO: APENAS Gestor pode alterar/corrigir um fechamento já gravado!
CREATE POLICY "closings_update_gestor_only" ON public.football_closings
    FOR UPDATE TO authenticated
    USING (
        public.is_current_user_active() AND 
        public.get_current_user_role() = 'gestor'
    )
    WITH CHECK (
        public.is_current_user_active() AND 
        public.get_current_user_role() = 'gestor'
    );

-- POLICIES: CLOSING CORRECTIONS
CREATE POLICY "corrections_select_active" ON public.closing_corrections
    FOR SELECT TO authenticated
    USING (public.is_current_user_active());

-- APENAS Gestor pode inserir correção de fechamento
CREATE POLICY "corrections_insert_gestor_only" ON public.closing_corrections
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_current_user_active() AND 
        public.get_current_user_role() = 'gestor'
    );

-- POLICIES: FOOTBALL PRIZES
CREATE POLICY "prizes_select_active" ON public.football_prizes
    FOR SELECT TO authenticated
    USING (public.is_current_user_active());

CREATE POLICY "prizes_insert_operator_gestor" ON public.football_prizes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_current_user_active() AND 
        public.get_current_user_role() IN ('gestor', 'operador', 'financeiro')
    );

-- POLICIES: AUDIT LOGS (Imutável)
-- Apenas Gestor, Financeiro e Auditor podem consultar a trilha de auditoria
CREATE POLICY "audit_select_authorized" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        public.is_current_user_active() AND 
        public.get_current_user_role() IN ('gestor', 'financeiro', 'auditor')
    );

-- Qualquer usuário ativo pode registrar uma ação na auditoria
CREATE POLICY "audit_insert_active" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_current_user_active());

-- Sem permissão de UPDATE ou DELETE na trilha de auditoria para garantir imutabilidade.

-- POLICIES: HISTÓRICO LOTÉRICA (Consulta por usuários autenticados)
CREATE POLICY "legacy_drawers_select" ON public.legacy_drawers FOR SELECT TO authenticated USING (public.is_current_user_active());
CREATE POLICY "legacy_shifts_select" ON public.legacy_cash_shifts FOR SELECT TO authenticated USING (public.is_current_user_active());
CREATE POLICY "legacy_accounts_select" ON public.legacy_treasury_accounts FOR SELECT TO authenticated USING (public.is_current_user_active());
CREATE POLICY "legacy_transactions_select" ON public.legacy_treasury_transactions FOR SELECT TO authenticated USING (public.is_current_user_active());
CREATE POLICY "legacy_reconciliations_select" ON public.legacy_reconciliations FOR SELECT TO authenticated USING (public.is_current_user_active());
CREATE POLICY "legacy_prizes_select" ON public.legacy_prizes FOR SELECT TO authenticated USING (public.is_current_user_active());
CREATE POLICY "legacy_finance_select" ON public.legacy_finance_records FOR SELECT TO authenticated USING (public.is_current_user_active());
CREATE POLICY "legacy_payroll_select" ON public.legacy_payroll_records FOR SELECT TO authenticated USING (
    public.is_current_user_active() AND public.get_current_user_role() IN ('gestor', 'financeiro')
);

-- Permissão de gravação das tabelas legadas apenas durante migração / Gestor
CREATE POLICY "legacy_all_insert_gestor" ON public.legacy_drawers FOR ALL TO authenticated USING (public.get_current_user_role() = 'gestor');
CREATE POLICY "legacy_shifts_insert_gestor" ON public.legacy_cash_shifts FOR ALL TO authenticated USING (public.get_current_user_role() = 'gestor');
CREATE POLICY "legacy_accounts_insert_gestor" ON public.legacy_treasury_accounts FOR ALL TO authenticated USING (public.get_current_user_role() = 'gestor');
CREATE POLICY "legacy_trans_insert_gestor" ON public.legacy_treasury_transactions FOR ALL TO authenticated USING (public.get_current_user_role() = 'gestor');
CREATE POLICY "legacy_rec_insert_gestor" ON public.legacy_reconciliations FOR ALL TO authenticated USING (public.get_current_user_role() = 'gestor');
CREATE POLICY "legacy_prizes_insert_gestor" ON public.legacy_prizes FOR ALL TO authenticated USING (public.get_current_user_role() = 'gestor');
CREATE POLICY "legacy_fin_insert_gestor" ON public.legacy_finance_records FOR ALL TO authenticated USING (public.get_current_user_role() = 'gestor');
CREATE POLICY "legacy_pay_insert_gestor" ON public.legacy_payroll_records FOR ALL TO authenticated USING (public.get_current_user_role() = 'gestor');
