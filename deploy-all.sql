-- ============================================================
-- 财务系统 — 全部 SQL 变更（一次性执行）
-- 执行顺序：先修 → 再加 → 最后重建函数
-- ============================================================

-- ============================================================
-- 第一部分：余额修复
-- ============================================================

-- 1. 修复快照触发器：退款按账户过滤
CREATE OR REPLACE FUNCTION calculate_closing_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_period TEXT;
  v_income DECIMAL(12,2);
  v_expense DECIMAL(12,2);
  v_refund DECIMAL(12,2);
  v_transfer_in DECIMAL(12,2);
  v_transfer_out DECIMAL(12,2);
  v_fee DECIMAL(12,2);
BEGIN
  v_period := NEW.period;
  
  SELECT COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END), 0) INTO v_income
  FROM orders o
  WHERE o.account_id = NEW.account_id
    AND o.status IN ('completed', 'partially_refunded')
    AND o.created_at >= v_period || '-01'
    AND o.created_at < (v_period || '-01')::date + interval '1 month';
  
  SELECT COALESCE(SUM(amount), 0) INTO v_expense
  FROM expenses
  WHERE account_id = NEW.account_id
    AND status = 'paid'
    AND paid_at >= v_period || '-01'
    AND paid_at < (v_period || '-01')::date + interval '1 month';
  
  SELECT COALESCE(SUM(r.refund_amount), 0) INTO v_refund
  FROM refunds r
  WHERE r.refund_to_account_id = NEW.account_id
    AND r.status = 'completed'
    AND r.completed_at >= v_period || '-01'
    AND r.completed_at < (v_period || '-01')::date + interval '1 month';
  
  SELECT COALESCE(SUM(amount), 0) INTO v_transfer_in FROM account_transfers
    WHERE status = 'completed' AND to_account_id = NEW.account_id
    AND created_at >= v_period || '-01'
    AND created_at < (v_period || '-01')::date + interval '1 month';
  SELECT COALESCE(SUM(amount), 0) INTO v_transfer_out FROM account_transfers
    WHERE status = 'completed' AND from_account_id = NEW.account_id
    AND created_at >= v_period || '-01'
    AND created_at < (v_period || '-01')::date + interval '1 month';
  SELECT COALESCE(SUM(fee), 0) INTO v_fee FROM account_transfers
    WHERE status = 'completed' AND from_account_id = NEW.account_id
    AND created_at >= v_period || '-01'
    AND created_at < (v_period || '-01')::date + interval '1 month';
  
  NEW.closing_balance := NEW.opening_balance + v_income - v_expense - v_refund + v_transfer_in - v_transfer_out - v_fee + NEW.admin_adjustment;
  NEW.total_income := v_income;
  NEW.total_expense := v_expense;
  NEW.total_refund := v_refund;
  NEW.transfer_in := v_transfer_in;
  NEW.transfer_out := v_transfer_out;
  NEW.transfer_fee := v_fee;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 修复 calc_account_monthly_balance 函数
CREATE OR REPLACE FUNCTION calc_account_monthly_balance(
  p_account_id UUID,
  p_period TEXT
) RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_opening DECIMAL(12,2);
  v_income DECIMAL(12,2);
  v_expense DECIMAL(12,2);
  v_refund DECIMAL(12,2);
  v_transfer_in DECIMAL(12,2);
  v_transfer_out DECIMAL(12,2);
  v_fee DECIMAL(12,2);
  v_adjustment DECIMAL(12,2);
BEGIN
  BEGIN
    SELECT opening_balance INTO v_opening FROM balance_snapshots
    WHERE account_id = p_account_id AND period = p_period;
  EXCEPTION WHEN OTHERS THEN v_opening := NULL; END;
  IF v_opening IS NULL THEN
    SELECT COALESCE(opening_balance, 0) INTO v_opening FROM accounts WHERE id = p_account_id;
  END IF;

  SELECT COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) INTO v_income
  FROM orders WHERE account_id = p_account_id
    AND status IN ('completed', 'partially_refunded')
    AND created_at >= p_period || '-01' AND created_at < (p_period || '-01')::date + interval '1 month';

  SELECT COALESCE(SUM(amount), 0) INTO v_expense
  FROM expenses WHERE account_id = p_account_id AND status = 'paid'
    AND paid_at >= p_period || '-01' AND paid_at < (p_period || '-01')::date + interval '1 month';

  SELECT COALESCE(SUM(refund_amount), 0) INTO v_refund
  FROM refunds WHERE refund_to_account_id = p_account_id AND status = 'completed'
    AND completed_at >= p_period || '-01' AND completed_at < (p_period || '-01')::date + interval '1 month';

  SELECT COALESCE(SUM(amount), 0) INTO v_transfer_in FROM account_transfers
    WHERE to_account_id = p_account_id AND status = 'completed'
    AND created_at >= p_period || '-01' AND created_at < (p_period || '-01')::date + interval '1 month';
  SELECT COALESCE(SUM(amount), 0) INTO v_transfer_out FROM account_transfers
    WHERE from_account_id = p_account_id AND status = 'completed'
    AND created_at >= p_period || '-01' AND created_at < (p_period || '-01')::date + interval '1 month';
  SELECT COALESCE(SUM(fee), 0) INTO v_fee FROM account_transfers
    WHERE from_account_id = p_account_id AND status = 'completed'
    AND created_at >= p_period || '-01' AND created_at < (p_period || '-01')::date + interval '1 month';

  SELECT COALESCE(admin_adjustment, 0) INTO v_adjustment FROM balance_snapshots
    WHERE account_id = p_account_id AND period = p_period;

  RETURN v_opening + v_income - v_expense - v_refund + v_transfer_in - v_transfer_out - v_fee + v_adjustment;
END;
$$ LANGUAGE plpgsql;

-- 3. increment_balance 改为原子操作
CREATE OR REPLACE FUNCTION increment_balance(
  acct_id UUID,
  delta DECIMAL(12,2)
) RETURNS JSONB AS $$
DECLARE
  v_old DECIMAL(12,2);
  v_new DECIMAL(12,2);
BEGIN
  UPDATE accounts SET balance = COALESCE(balance, 0) + delta, updated_at = NOW()
  WHERE id = acct_id RETURNING COALESCE(balance, 0) INTO v_new;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account % not found', acct_id; END IF;
  v_old := v_new - delta;
  RETURN jsonb_build_object('old_balance', v_old, 'new_balance', v_new, 'delta', delta);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 第二部分：对账功能
-- ============================================================

-- 4. 增加对账字段
ALTER TABLE balance_snapshots
  ADD COLUMN IF NOT EXISTS actual_balance DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS balance_diff DECIMAL(12,2) GENERATED ALWAYS AS 
    (COALESCE(actual_balance, 0) - COALESCE(closing_balance, 0)) STORED,
  ADD COLUMN IF NOT EXISTS diff_reason TEXT,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

-- 5. 对账状态索引
CREATE INDEX IF NOT EXISTS idx_bs_reconciliation ON balance_snapshots(period, account_id);


-- ============================================================
-- 第三部分：重建结算函数
-- ============================================================

-- 6. 先删再建（避免参数名冲突）
DROP FUNCTION IF EXISTS settle_monthly_balances(DATE);
DROP FUNCTION IF EXISTS generate_monthly_snapshots();

-- 7. 手动结算函数
CREATE OR REPLACE FUNCTION settle_monthly_balances(settlement_date DATE)
RETURNS JSONB AS $$
DECLARE
  v_period TEXT;
  v_results JSONB := '[]'::JSONB;
  v_acc_id UUID;
  v_acc_code TEXT;
  v_start_date DATE;
  v_end_date DATE;
  v_existing_id UUID;
  v_prev_period TEXT;
  v_prev_closing DECIMAL(12,2);
  v_opening DECIMAL(12,2);
  v_income DECIMAL(12,2);
  v_expense DECIMAL(12,2);
  v_refund DECIMAL(12,2);
  v_transfer_in DECIMAL(12,2);
  v_transfer_out DECIMAL(12,2);
  v_fee DECIMAL(12,2);
  v_admin_adj DECIMAL(12,2);
  v_closing DECIMAL(12,2);
BEGIN
  v_period := to_char(settlement_date, 'YYYY-MM');
  v_start_date := (v_period || '-01')::DATE;
  v_end_date := v_start_date + interval '1 month';

  FOR v_acc_id, v_acc_code IN
    SELECT id, code FROM accounts WHERE status = 'active' ORDER BY ip_code, sequence, code
  LOOP
    v_prev_period := to_char(v_start_date - interval '1 month', 'YYYY-MM');
    SELECT closing_balance INTO v_prev_closing FROM balance_snapshots
      WHERE account_id = v_acc_id AND period = v_prev_period AND status = 'confirmed' LIMIT 1;
    IF v_prev_closing IS NOT NULL THEN v_opening := v_prev_closing;
    ELSE SELECT COALESCE(opening_balance, 0) INTO v_opening FROM accounts WHERE id = v_acc_id;
    END IF;

    SELECT COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) INTO v_income
    FROM orders WHERE account_id = v_acc_id AND status IN ('completed', 'partially_refunded')
      AND created_at >= v_start_date AND created_at < v_end_date;
    SELECT COALESCE(SUM(amount), 0) INTO v_expense
    FROM expenses WHERE account_id = v_acc_id AND status = 'paid'
      AND paid_at >= v_start_date AND paid_at < v_end_date;
    SELECT COALESCE(SUM(refund_amount), 0) INTO v_refund
    FROM refunds WHERE refund_to_account_id = v_acc_id AND status = 'completed'
      AND completed_at >= v_start_date AND completed_at < v_end_date;
    SELECT COALESCE(SUM(amount), 0) INTO v_transfer_in FROM account_transfers
      WHERE status = 'completed' AND to_account_id = v_acc_id AND created_at >= v_start_date AND created_at < v_end_date;
    SELECT COALESCE(SUM(amount), 0) INTO v_transfer_out FROM account_transfers
      WHERE status = 'completed' AND from_account_id = v_acc_id AND created_at >= v_start_date AND created_at < v_end_date;
    SELECT COALESCE(SUM(fee), 0) INTO v_fee FROM account_transfers
      WHERE status = 'completed' AND from_account_id = v_acc_id AND created_at >= v_start_date AND created_at < v_end_date;
    SELECT COALESCE(admin_adjustment, 0) INTO v_admin_adj FROM balance_snapshots
      WHERE account_id = v_acc_id AND period = v_period LIMIT 1;

    v_closing := v_opening + v_income - v_expense - v_refund + v_transfer_in - v_transfer_out - v_fee + v_admin_adj;

    SELECT id INTO v_existing_id FROM balance_snapshots WHERE account_id = v_acc_id AND period = v_period LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      UPDATE balance_snapshots SET opening_balance = v_opening, total_income = v_income, total_expense = v_expense,
        total_refund = v_refund, transfer_in = v_transfer_in, transfer_out = v_transfer_out, transfer_fee = v_fee,
        closing_balance = v_closing, status = 'open', settlement_date = settlement_date, updated_at = NOW()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO balance_snapshots (account_id, period, opening_balance, total_income, total_expense, total_refund,
        transfer_in, transfer_out, transfer_fee, admin_adjustment, closing_balance, status, settlement_date)
      VALUES (v_acc_id, v_period, v_opening, v_income, v_expense, v_refund, v_transfer_in, v_transfer_out, v_fee,
        v_admin_adj, v_closing, 'open', settlement_date);
    END IF;
    UPDATE accounts SET opening_balance = v_closing WHERE id = v_acc_id;
    v_results := v_results || jsonb_build_object('account_id', v_acc_id, 'account_code', v_acc_code, 'opening_balance', v_opening, 'closing_balance', v_closing);
  END LOOP;
  RETURN v_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 快捷生成函数
CREATE OR REPLACE FUNCTION generate_monthly_snapshots()
RETURNS VOID AS $$
BEGIN
  PERFORM settle_monthly_balances((to_char(NOW(), 'YYYY-MM') || '-01')::DATE + interval '1 month' - interval '1 day');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
