-- Initial schema migration for Pluggy integration

-- Create pluggy_items table first (referenced by other tables)
CREATE TABLE IF NOT EXISTS public.pluggy_items (
  item_id uuid NOT NULL,
  user_id text,
  connector_id text,
  connector_name text,
  connector_image_url text,
  status text CHECK (status = ANY (ARRAY['UPDATED'::text, 'UPDATING'::text, 'WAITING_USER_INPUT'::text, 'LOGIN_ERROR'::text, 'OUTDATED'::text, 'CREATED'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_updated_at timestamp with time zone,
  webhook_url text,
  parameters jsonb,
  institution_name text,
  institution_url text,
  primary_color text,
  secondary_color text,
  CONSTRAINT pluggy_items_pkey PRIMARY KEY (item_id)
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  account_id text NOT NULL,
  item_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['BANK'::text, 'CREDIT'::text, 'PAYMENT_ACCOUNT'::text])),
  subtype text,
  number text,
  name text NOT NULL,
  marketing_name text,
  balance numeric,
  currency_code text DEFAULT 'BRL'::text,
  owner text,
  tax_number text,
  bank_data jsonb,
  credit_data jsonb,
  disaggregated_credit_limits jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (account_id),
  CONSTRAINT accounts_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.pluggy_items(item_id)
);

-- Create credit_card_bills table
CREATE TABLE IF NOT EXISTS public.credit_card_bills (
  bill_id text NOT NULL,
  account_id text,
  due_date timestamp with time zone NOT NULL,
  total_amount numeric NOT NULL,
  total_amount_currency_code text DEFAULT 'BRL'::text,
  minimum_payment_amount numeric,
  allows_installments boolean DEFAULT false,
  finance_charges jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_card_bills_pkey PRIMARY KEY (bill_id),
  CONSTRAINT credit_card_bills_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id)
);

-- Create identities table
CREATE TABLE IF NOT EXISTS public.identities (
  identity_id text NOT NULL,
  item_id uuid,
  full_name text,
  company_name text,
  document text,
  document_type text,
  tax_number text,
  job_title text,
  birth_date timestamp with time zone,
  investor_profile text,
  establishment_code text,
  establishment_name text,
  addresses jsonb,
  phone_numbers jsonb,
  emails jsonb,
  relations jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT identities_pkey PRIMARY KEY (identity_id),
  CONSTRAINT identities_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.pluggy_items(item_id)
);

-- Create investments table
CREATE TABLE IF NOT EXISTS public.investments (
  investment_id text NOT NULL,
  item_id uuid,
  name text NOT NULL,
  code text,
  isin text,
  number text,
  owner text,
  currency_code text DEFAULT 'BRL'::text,
  type text CHECK (type = ANY (ARRAY['FIXED_INCOME'::text, 'SECURITY'::text, 'MUTUAL_FUND'::text, 'EQUITY'::text, 'ETF'::text, 'COE'::text])),
  subtype text,
  last_month_rate numeric,
  last_twelve_months_rate numeric,
  annual_rate numeric,
  date timestamp with time zone,
  value numeric,
  quantity numeric,
  amount numeric NOT NULL,
  balance numeric NOT NULL,
  taxes numeric,
  taxes2 numeric,
  due_date timestamp with time zone,
  rate numeric,
  rate_type text CHECK (rate_type = ANY (ARRAY['CDI'::text, 'IPCA'::text, 'PRE_FIXADO'::text, 'SELIC'::text])),
  fixed_annual_rate numeric,
  issuer text,
  issue_date timestamp with time zone,
  amount_profit numeric,
  amount_withdrawal numeric,
  amount_original numeric,
  status text DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'PENDING'::text, 'TOTAL_WITHDRAWAL'::text])),
  institution jsonb,
  metadata jsonb,
  provider_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT investments_pkey PRIMARY KEY (investment_id),
  CONSTRAINT investments_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.pluggy_items(item_id)
);

-- Create investment_transactions table
CREATE TABLE IF NOT EXISTS public.investment_transactions (
  transaction_id text NOT NULL,
  investment_id text,
  trade_date timestamp with time zone NOT NULL,
  date timestamp with time zone NOT NULL,
  description text,
  quantity numeric,
  value numeric,
  amount numeric NOT NULL,
  net_amount numeric,
  type text NOT NULL CHECK (type = ANY (ARRAY['BUY'::text, 'SELL'::text, 'DIVIDEND'::text, 'SPLIT'::text, 'BONUS'::text])),
  brokerage_number text,
  expenses jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT investment_transactions_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT investment_transactions_investment_id_fkey FOREIGN KEY (investment_id) REFERENCES public.investments(investment_id)
);

-- Create loans table
CREATE TABLE IF NOT EXISTS public.loans (
  loan_id text NOT NULL,
  item_id uuid,
  contract_number text,
  ipoc_code text,
  product_name text NOT NULL,
  provider_id text,
  type text,
  date timestamp with time zone,
  contract_date timestamp with time zone,
  disbursement_dates jsonb,
  settlement_date timestamp with time zone,
  due_date timestamp with time zone,
  first_installment_due_date timestamp with time zone,
  contract_amount numeric,
  currency_code text DEFAULT 'BRL'::text,
  cet numeric,
  installment_periodicity text,
  installment_periodicity_additional_info text,
  amortization_scheduled text,
  amortization_scheduled_additional_info text,
  cnpj_consignee text,
  interest_rates jsonb,
  contracted_fees jsonb,
  contracted_finance_charges jsonb,
  warranties jsonb,
  installments jsonb,
  payments jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT loans_pkey PRIMARY KEY (loan_id),
  CONSTRAINT loans_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.pluggy_items(item_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  transaction_id text NOT NULL,
  account_id text,
  date timestamp with time zone NOT NULL,
  description text NOT NULL,
  description_raw text,
  amount numeric NOT NULL,
  amount_in_account_currency numeric,
  balance numeric,
  currency_code text DEFAULT 'BRL'::text,
  category text,
  category_id text,
  provider_code text,
  provider_id text,
  status text DEFAULT 'POSTED'::text CHECK (status = ANY (ARRAY['POSTED'::text, 'PENDING'::text])),
  type text NOT NULL CHECK (type = ANY (ARRAY['CREDIT'::text, 'DEBIT'::text])),
  operation_type text,
  operation_category text,
  payment_data jsonb,
  credit_card_metadata jsonb,
  merchant jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.pluggy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_item_id ON public.accounts(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_credit_card_bills_account_id ON public.credit_card_bills(account_id);
CREATE INDEX IF NOT EXISTS idx_identities_item_id ON public.identities(item_id);
CREATE INDEX IF NOT EXISTS idx_investments_item_id ON public.investments(item_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_investment_id ON public.investment_transactions(investment_id);
CREATE INDEX IF NOT EXISTS idx_loans_item_id ON public.loans(item_id);