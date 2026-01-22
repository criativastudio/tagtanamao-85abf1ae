-- Add billing fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS complemento text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bairro text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- Create payments table for detailed payment history
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL,
  asaas_payment_id text,
  asaas_customer_id text,
  card_last_digits text,
  card_brand text,
  installments integer DEFAULT 1,
  paid_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "System can insert payments"
  ON payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for payments
ALTER PUBLICATION supabase_realtime ADD TABLE payments;