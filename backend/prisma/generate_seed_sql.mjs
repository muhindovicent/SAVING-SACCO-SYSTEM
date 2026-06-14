import fs from 'fs';
import crypto from 'crypto';

const uid = () => crypto.randomUUID();

const ids = {
  admin: uid(), treasurer: uid(), loanOfficer: uid(), auditor: uid(),
  boardMember: uid(), john: uid(), jane: uid(), peter: uid(),
  mJohn: uid(), mJane: uid(), mPeter: uid(),
  sJohn: uid(), sJane: uid(), sPeter: uid(),
};

const sql = [];
const q = (s) => `'${s.replace(/'/g, "''")}'`;

sql.push('BEGIN;\n');

// Users
sql.push('-- Users');
sql.push('INSERT INTO public.users (id,username,email,phone,password_hash,role,status,password_changed_at,is_deleted,created_at,updated_at) VALUES');
sql.push(`(${q(ids.admin)},'admin','admin@jengawealth.com',NULL,crypt('Admin@123',gen_salt('bf')),'ADMINISTRATOR','ACTIVE',now(),false,now(),now()),`);
sql.push(`(${q(ids.treasurer)},'treasurer','treasurer@jengawealth.com',NULL,crypt('Admin@123',gen_salt('bf')),'TREASURER','ACTIVE',now(),false,now(),now()),`);
sql.push(`(${q(ids.loanOfficer)},'loanofficer','loanofficer@jengawealth.com',NULL,crypt('Admin@123',gen_salt('bf')),'LOAN_OFFICER','ACTIVE',now(),false,now(),now()),`);
sql.push(`(${q(ids.auditor)},'auditor','auditor@jengawealth.com',NULL,crypt('Admin@123',gen_salt('bf')),'AUDITOR','ACTIVE',now(),false,now(),now()),`);
sql.push(`(${q(ids.boardMember)},'boardmember','board@jengawealth.com',NULL,crypt('Admin@123',gen_salt('bf')),'BOARD_MEMBER','ACTIVE',now(),false,now(),now()),`);
sql.push(`(${q(ids.john)},'john','john@email.com','+256701000001',crypt('Member@123',gen_salt('bf')),'MEMBER','ACTIVE',now(),false,now(),now()),`);
sql.push(`(${q(ids.jane)},'jane','jane@email.com','+256701000002',crypt('Member@123',gen_salt('bf')),'MEMBER','ACTIVE',now(),false,now(),now()),`);
sql.push(`(${q(ids.peter)},'peter','peter@email.com','+256701000003',crypt('Member@123',gen_salt('bf')),'MEMBER','ACTIVE',now(),false,now(),now());\n`);

// Members
sql.push('-- Members');
sql.push('INSERT INTO public.members (id,user_id,member_number,full_name,date_of_birth,gender,nationality,email,phone_primary,city,district,occupation,employer,kyc_status,kyc_verified_at,id_type,id_number,status,is_deleted,created_at,updated_at) VALUES');
sql.push(`(${q(ids.mJohn)},${q(ids.john)},${q('JNW-00001')},'John Mukasa','1985-06-15','MALE','Ugandan','john@email.com','+256701000001','Kampala','Kampala','Teacher','Kitante Secondary School','VERIFIED','2024-01-10','NATIONAL_ID','CM12345678','ACTIVE',false,now(),now()),`);
sql.push(`(${q(ids.mJane)},${q(ids.jane)},${q('JNW-00002')},'Jane Nakato','1990-03-22','FEMALE','Ugandan','jane@email.com','+256701000002','Jinja','Jinja','Nurse','Jinja Regional Hospital','VERIFIED','2024-02-15','NATIONAL_ID','CM23456789','ACTIVE',false,now(),now()),`);
sql.push(`(${q(ids.mPeter)},${q(ids.peter)},${q('JNW-00003')},'Peter Okello','1978-11-08','MALE','Ugandan','peter@email.com','+256701000003','Gulu','Gulu','Farmer','Self Employed','PENDING',NULL,'NATIONAL_ID','CM34567890','ACTIVE',false,now(),now());\n`);

// Shares
sql.push('-- Shares');
sql.push('INSERT INTO public.shares (id,member_id,total_units,total_value,created_at,updated_at) VALUES');
sql.push(`(${q(ids.sJohn)},${q(ids.mJohn)},500,500000,now(),now()),`);
sql.push(`(${q(ids.sJane)},${q(ids.mJane)},300,300000,now(),now()),`);
sql.push(`(${q(ids.sPeter)},${q(ids.mPeter)},100,100000,now(),now());\n`);

// Chart of Accounts
const accts = {
  cashPetty: uid(), cashBank: uid(), cashMobile: uid(), loanRecv: uid(),
  memberSav: uid(), shareCap: uid(), retainEarn: uid(),
  intIncome: uid(), feeIncome: uid(), intExpense: uid(), opExpense: uid(), provBad: uid(),
};
sql.push('-- Chart of Accounts');
sql.push('INSERT INTO public.chart_of_accounts (id,code,name,category,sub_category,normal_side,is_active,created_at,updated_at) VALUES');
sql.push(`(${q(accts.cashPetty)},'1010','Cash - Petty Cash','ASSET','CURRENT_ASSET','DEBIT',true,now(),now()),`);
sql.push(`(${q(accts.cashBank)},'1020','Cash - Bank Account','ASSET','CURRENT_ASSET','DEBIT',true,now(),now()),`);
sql.push(`(${q(accts.cashMobile)},'1030','Cash - Mobile Money','ASSET','CURRENT_ASSET','DEBIT',true,now(),now()),`);
sql.push(`(${q(accts.loanRecv)},'1100','Loan Receivables','ASSET','CURRENT_ASSET','DEBIT',true,now(),now()),`);
sql.push(`(${q(accts.memberSav)},'2010','Member Savings Deposits','LIABILITY','CURRENT_LIABILITY','CR',true,now(),now()),`);
sql.push(`(${q(accts.shareCap)},'2020','Member Share Capital','LIABILITY','CURRENT_LIABILITY','CR',true,now(),now()),`);
sql.push(`(${q(accts.retainEarn)},'3010','Retained Earnings','EQUITY','RETAINED_EARNINGS','CR',true,now(),now()),`);
sql.push(`(${q(accts.intIncome)},'4010','Interest Income - Loans','INCOME','INTEREST_INCOME','CR',true,now(),now()),`);
sql.push(`(${q(accts.feeIncome)},'4020','Fee Income','INCOME','FEE_INCOME','CR',true,now(),now()),`);
sql.push(`(${q(accts.intExpense)},'5010','Interest Expense - Savings','EXPENSE','OPERATING_EXPENSE','DEBIT',true,now(),now()),`);
sql.push(`(${q(accts.opExpense)},'5020','Operating Expenses','EXPENSE','ADMIN_EXPENSE','DEBIT',true,now(),now()),`);
sql.push(`(${q(accts.provBad)},'5030','Provision for Bad Debts','EXPENSE','PROVISION_EXPENSE','DEBIT',true,now(),now());\n`);

// Financial Periods
sql.push('-- Financial Periods');
sql.push('INSERT INTO public.financial_periods (id,name,start_date,end_date,is_closed,closed_at,closed_by,created_at) VALUES');
sql.push(`(gen_random_uuid(),'FY2026','2026-01-01','2026-12-31',false,NULL,NULL,now()),`);
sql.push(`(gen_random_uuid(),'FY2025','2025-01-01','2025-12-31',true,'2026-01-01',${q(ids.admin)},now());\n`);

// Savings Products
sql.push('-- Savings Products');
sql.push("INSERT INTO public.savings_products (id,name,code,product_type,min_balance,interest_rate,interest_freq,charges,is_active,created_at,updated_at) VALUES");
sql.push("(gen_random_uuid(),'Regular Savings','REG','REGULAR',5000,3.0,'MONTHLY','[{\"name\":\"Account Opening\",\"amount\":10000}]',true,now(),now()),");
sql.push("(gen_random_uuid(),'Fixed Deposit','FD','FIXED_DEPOSIT',100000,8.0,'MATURITY','[]',true,now(),now()),");
sql.push("(gen_random_uuid(),'Education Goal','EDU','GOAL_BASED',20000,5.0,'MONTHLY','[]',true,now(),now());\n");

// Loan Products
sql.push('-- Loan Products');
sql.push('INSERT INTO public.loan_products (id,name,code,product_type,min_amount,max_amount,interest_rate,interest_method,repayment_period,repayment_freq,requires_guarantor,requires_collateral,max_guarantors,is_active,created_at,updated_at) VALUES');
sql.push("(gen_random_uuid(),'Regular Loan','REG','REGULAR',50000,5000000,15.0,'DECLINING',12,'MONTHLY',true,false,2,true,now(),now()),");
sql.push("(gen_random_uuid(),'Emergency Loan','EMR','EMERGENCY',10000,500000,10.0,'FLAT',6,'MONTHLY',false,false,0,true,now(),now()),");
sql.push("(gen_random_uuid(),'Agriculture Loan','AGR','AGRICULTURE',100000,10000000,12.0,'DECLINING',24,'MONTHLY',false,true,0,true,now(),now()),");
sql.push("(gen_random_uuid(),'Education Loan','EDU','EDUCATION',100000,20000000,8.0,'DECLINING',36,'MONTHLY',false,false,0,true,now(),now()),");
sql.push("(gen_random_uuid(),'Business Loan','BIZ','BUSINESS',200000,50000000,18.0,'DECLINING',24,'MONTHLY',true,true,2,true,now(),now());\n");

sql.push('-- Savings Accounts');
const saJohn = uid(), saJane = uid(), saPeter = uid();
sql.push('INSERT INTO public.savings_accounts (id,member_id,product_id,account_number,status,balance,available_balance,created_at,updated_at) VALUES');
sql.push(`(${q(saJohn)},${q(ids.mJohn)},(SELECT id FROM public.savings_products WHERE code='REG' LIMIT 1),'SAV-00001','ACTIVE',500000,500000,now(),now()),`);
sql.push(`(${q(saJane)},${q(ids.mJane)},(SELECT id FROM public.savings_products WHERE code='REG' LIMIT 1),'SAV-00002','ACTIVE',350000,350000,now(),now()),`);
sql.push(`(${q(saPeter)},${q(ids.mPeter)},(SELECT id FROM public.savings_products WHERE code='REG' LIMIT 1),'SAV-00003','ACTIVE',100000,100000,now(),now());\n`);

// Savings Transactions for John
sql.push('-- Savings Transactions');
sql.push('INSERT INTO public.savings_transactions (id,account_id,type,amount,balance_before,balance_after,payment_method,receipt_number,description,created_at) VALUES');
sql.push(`(${q(uid())},${q(saJohn)},'DEPOSIT',500000,0,500000,'BANK_TRANSFER','RCP-000001','Initial deposit',now()-interval'90 days'),`);
sql.push(`(${q(uid())},${q(saJohn)},'DEPOSIT',50000,500000,550000,'CASH','RCP-000002','Monthly deposit 1',now()-interval'60 days'),`);
sql.push(`(${q(uid())},${q(saJohn)},'DEPOSIT',75000,550000,625000,'CASH','RCP-000003','Monthly deposit 2',now()-interval'30 days'),`);
sql.push(`(${q(uid())},${q(saJane)},'DEPOSIT',350000,0,350000,'BANK_TRANSFER','RCP-000004','Initial deposit',now()-interval'60 days'),`);
sql.push(`(${q(uid())},${q(saJane)},'DEPOSIT',80000,350000,430000,'MOBILE_MONEY','RCP-000005','Savings deposit 1',now()-interval'30 days'),`);
sql.push(`(${q(uid())},${q(saPeter)},'DEPOSIT',100000,0,100000,'BANK_TRANSFER','RCP-000006','Initial deposit',now()-interval'45 days');\n`);

// Update balances from transactions
sql.push('-- Update savings account balances');
sql.push("UPDATE public.savings_accounts SET balance=675000,available_balance=675000 WHERE account_number='SAV-00001';");
sql.push("UPDATE public.savings_accounts SET balance=430000,available_balance=430000 WHERE account_number='SAV-00002';");
sql.push("UPDATE public.savings_accounts SET balance=100000,available_balance=100000 WHERE account_number='SAV-00003';\n");

// Loan Applications
const jaJohn = uid(), jaJane = uid(), jaPeter = uid();
sql.push('-- Loan Applications');
sql.push('INSERT INTO public.loan_applications (id,member_id,product_id,application_no,principal,purpose,repayment_period,status,risk_score,submitted_at,updated_at) VALUES');
sql.push(`(${q(jaJohn)},${q(ids.mJohn)},(SELECT id FROM public.loan_products WHERE code='REG' LIMIT 1),'LAP-00001',1000000,'Home improvement',12,'ACTIVE',72,now()-interval'60 days',now()-interval'60 days'),`);
sql.push(`(${q(jaJane)},${q(ids.mJane)},(SELECT id FROM public.loan_products WHERE code='EMR' LIMIT 1),'LAP-00002',500000,'Medical emergency',6,'ACTIVE',85,now()-interval'40 days',now()-interval'40 days'),`);
sql.push(`(${q(jaPeter)},${q(ids.mPeter)},(SELECT id FROM public.loan_products WHERE code='AGR' LIMIT 1),'LAP-00003',2000000,'Farm equipment purchase',24,'PENDING',55,now()-interval'5 days',now()-interval'5 days');\n`);

// Loans
const lJohn = uid(), lJane = uid();
sql.push('-- Loans');
sql.push('INSERT INTO public.loans (id,application_id,member_id,loan_no,principal,interest_rate,interest_method,total_interest,total_amount,amount_paid,balance,repayment_period,status,disbursed_at,disbursed_by,first_due_date,created_at,updated_at) VALUES');
sql.push(`(${q(lJohn)},${q(jaJohn)},${q(ids.mJohn)},'LN-00001',1000000,15.0,'DECLINING',83000,1083000,270750,812250,12,'ACTIVE',now()-interval'55 days',${q(ids.loanOfficer)},now()-interval'25 days',now()-interval'55 days',now()-interval'55 days'),`);
sql.push(`(${q(lJane)},${q(jaJane)},${q(ids.mJane)},'LN-00002',500000,10.0,'FLAT',25000,525000,87500,437500,6,'ACTIVE',now()-interval'35 days',${q(ids.loanOfficer)},now()-interval'5 days',now()-interval'35 days',now()-interval'35 days');\n`);

// Loan Schedules for John
sql.push('-- Loan Schedules');
sql.push('INSERT INTO public.loan_schedules (id,loan_id,installment,due_date,principal,interest,total_amount,paid_amount,balance,status) VALUES');
for (let m = 0; m < 12; m++) {
  const principal = 83333, interest = m < 6 ? 6917 : 6000;
  const total = principal + interest;
  const paid = m < 3 ? total : 0;
  const status = paid > 0 ? "'PAID'" : "'PENDING'";
  const sep = m < 11 ? ',' : ';';
  sql.push(`(${q(uid())},${q(lJohn)},${m + 1},now()-interval'${55 - m * 30} days',${principal},${interest},${total},${paid},${total - paid},${status})${sep}`);
}
sql.push('');

// Loan Schedules for Jane
sql.push('INSERT INTO public.loan_schedules (id,loan_id,installment,due_date,principal,interest,total_amount,paid_amount,balance,status) VALUES');
for (let m = 0; m < 6; m++) {
  const total = 87500, principal = 83333, interest = 4167;
  const paid = m < 1 ? total : 0;
  const status = paid > 0 ? "'PAID'" : "'PENDING'";
  const sep = m < 5 ? ',' : ';';
  sql.push(`(${q(uid())},${q(lJane)},${m + 1},now()-interval'${35 - m * 30} days',${principal},${interest},${total},${paid},${total - paid},${status})${sep}`);
}
sql.push('');

// Loan Guarantors for Peter
sql.push('-- Loan Guarantors');
sql.push('INSERT INTO public.loan_guarantors (id,application_id,guarantor_id,amount,approved,approved_at,notes,created_at) VALUES');
sql.push(`(${q(uid())},${q(jaPeter)},${q(ids.mJohn)},1000000,true,now()-interval'3 days','Guarantor approved',now()),`);
sql.push(`(${q(uid())},${q(jaPeter)},${q(ids.mJane)},1000000,true,now()-interval'2 days','Guarantor approved',now());\n`);

// Collateral for Peter
sql.push('-- Collateral');
sql.push('INSERT INTO public.loan_collaterals (id,application_id,type,description,estimated_value,document_ref,is_verified,created_at) VALUES');
sql.push(`(${q(uid())},${q(jaPeter)},'LAND','Title deed for plot 22, Gulu',5000000,'TITLE-2024-001',true,now());\n`);

// Share Purchases
sql.push('-- Share Purchases');
sql.push('INSERT INTO public.share_purchases (id,member_id,share_id,units,price_per_unit,total_amount,purchased_at) VALUES');
sql.push(`(${q(uid())},${q(ids.mJohn)},${q(ids.sJohn)},500,1000,500000,now()-interval'90 days'),`);
sql.push(`(${q(uid())},${q(ids.mJane)},${q(ids.sJane)},300,1000,300000,now()-interval'80 days'),`);
sql.push(`(${q(uid())},${q(ids.mPeter)},${q(ids.sPeter)},100,1000,100000,now()-interval'70 days');\n`);

// Share Value
sql.push('-- Share Value');
sql.push('INSERT INTO public.share_values (id,price_per_unit,effective_date,set_by,notes,created_at) VALUES');
sql.push(`(${q(uid())},1000,'2026-01-01',${q(ids.admin)},'Opening share price FY2026',now());\n`);

// Cash Accounts
sql.push('-- Cash Accounts');
sql.push("INSERT INTO public.cash_accounts (id,name,account_type,account_number,bank_name,branch_code,swift_code,balance,currency,is_active,created_at,updated_at) VALUES");
sql.push("(gen_random_uuid(),'Petty Cash','PETTY_CASH',NULL,NULL,NULL,NULL,500000,'UGX',true,now(),now()),");
sql.push("(gen_random_uuid(),'Stanbic Bank - Main Account','BANK','9030001234567','Stanbic Bank Uganda','KAMPALA','SBICUGKA',8500000,'UGX',true,now(),now()),");
sql.push("(gen_random_uuid(),'MTN Mobile Money','MOBILE_MONEY',NULL,NULL,NULL,NULL,2300000,'UGX',true,now(),now()),");
sql.push("(gen_random_uuid(),'Airtel Money','MOBILE_MONEY',NULL,NULL,NULL,NULL,1500000,'UGX',true,now(),now());\n");

// Dividends
sql.push('-- Dividends');
sql.push("INSERT INTO public.dividend_distributions (id,financial_year,total_amount,per_unit_amount,declared_at,status,approved_by,created_at) VALUES");
sql.push(`(gen_random_uuid(),'2025',25000000,500,'2025-12-15','PAID',${q(ids.admin)},now()),`);
sql.push(`(gen_random_uuid(),'2024',18000000,350,'2024-12-20','PAID',${q(ids.admin)},now());\n`);

// Meetings
sql.push('-- Meetings');
sql.push("INSERT INTO public.meetings (id,title,type,date,venue,agenda,status,created_by,created_at,updated_at) VALUES");
sql.push("(gen_random_uuid(),'AGM 2025','AGM','2025-03-15','Jenga Wealth Conference Hall','[{\"item\":1,\"title\":\"Opening\"},{\"item\":2,\"title\":\"Financial Report\"}]','SCHEDULED'," + q(ids.admin) + ",now(),now()),");
sql.push("(gen_random_uuid(),'AGM 2024','AGM','2024-03-15','Jenga Wealth Conference Hall','[{\"item\":1,\"title\":\"Opening\"}]','COMPLETED'," + q(ids.admin) + ",now(),now());\n");

// Resolutions
sql.push('-- Resolutions');
sql.push('INSERT INTO public.resolutions (id,meeting_id,title,description,status,votes_for,votes_against,votes_abstain,created_by,created_at,updated_at) VALUES');
sql.push(`(gen_random_uuid(),(SELECT id FROM public.meetings WHERE title='AGM 2024' LIMIT 1),'Approve Dividend','Declare UGS 500/share dividend','IMPLEMENTED',25,3,2,${q(ids.admin)},now(),now()),`);
sql.push(`(gen_random_uuid(),(SELECT id FROM public.meetings WHERE title='AGM 2024' LIMIT 1),'Increase Membership Fees','From UGS 50K to UGS 75K','PASSED',20,8,2,${q(ids.admin)},now(),now());\n`);

// System Config
sql.push('-- System Config');
sql.push("INSERT INTO public.system_config (id,key,value,type,\"group\",description,created_at,updated_at) VALUES");
sql.push("(gen_random_uuid(),'sacco.name','\"Jenga Wealth\"','STRING','general','SACCO display name',now(),now()),");
sql.push("(gen_random_uuid(),'sacco.share_price','1000','NUMBER','shares','Price per share',now(),now()),");
sql.push("(gen_random_uuid(),'sacco.min_savings_balance','5000','NUMBER','savings','Minimum savings balance',now(),now()),");
sql.push("(gen_random_uuid(),'sacco.max_loan_multiplier','3','NUMBER','loans','Maximum loan as multiple of savings',now(),now());\n");

sql.push('COMMIT;\n');

fs.writeFileSync('prisma/seed_raw.sql', sql.join('\n'));
console.log('Generated prisma/seed_raw.sql successfully');
console.log(`Demo credentials:`);
console.log(`  Admin:     admin / Admin@123`);
console.log(`  Treasurer: treasurer / Admin@123`);
console.log(`  Member:    john / Member@123`);
console.log(`  Member:    jane / Member@123`);
console.log(`  Member:    peter / Member@123`);
