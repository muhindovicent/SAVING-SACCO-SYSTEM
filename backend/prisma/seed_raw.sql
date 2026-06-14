BEGIN;

-- Users
INSERT INTO public.users (id,username,email,phone,password_hash,role,status,password_changed_at,is_deleted,created_at,updated_at) VALUES
('fb328ae0-cd09-4ec6-b2f5-5b8a7434c2e3','admin','admin@jengawealth.com',NULL,crypt('Admin@123',gen_salt('bf')),'ADMINISTRATOR','ACTIVE',now(),false,now(),now()),
('5f284311-491b-466a-85ec-66ccfd9a0a2a','treasurer','treasurer@jengawealth.com',NULL,crypt('Admin@123',gen_salt('bf')),'TREASURER','ACTIVE',now(),false,now(),now()),
('b7db2654-009b-4e7d-b4ea-5214fb1c9a3a','loanofficer','loanofficer@jengawealth.com',NULL,crypt('Admin@123',gen_salt('bf')),'LOAN_OFFICER','ACTIVE',now(),false,now(),now()),
('9db62ada-c267-4bc3-a211-80492831ee58','auditor','auditor@jengawealth.com',NULL,crypt('Admin@123',gen_salt('bf')),'AUDITOR','ACTIVE',now(),false,now(),now()),
('4dd4ff8f-7325-4123-9671-cdb4d48777b5','boardmember','board@jengawealth.com',NULL,crypt('Admin@123',gen_salt('bf')),'BOARD_MEMBER','ACTIVE',now(),false,now(),now()),
('1c047a5f-a488-43e9-a0b6-351aa8b5bead','john','john@email.com','+256701000001',crypt('Member@123',gen_salt('bf')),'MEMBER','ACTIVE',now(),false,now(),now()),
('21cb4e29-48b4-4c0e-8469-b70b9d0fa890','jane','jane@email.com','+256701000002',crypt('Member@123',gen_salt('bf')),'MEMBER','ACTIVE',now(),false,now(),now()),
('5a3b0b22-93ce-4fdc-b964-76fd7629daec','peter','peter@email.com','+256701000003',crypt('Member@123',gen_salt('bf')),'MEMBER','ACTIVE',now(),false,now(),now());

-- Members
INSERT INTO public.members (id,user_id,member_number,full_name,date_of_birth,gender,nationality,email,phone_primary,city,district,occupation,employer,kyc_status,kyc_verified_at,id_type,id_number,status,is_deleted,created_at,updated_at) VALUES
('3a814131-d70c-456d-af1e-59620ff33350','1c047a5f-a488-43e9-a0b6-351aa8b5bead','JNW-00001','John Mukasa','1985-06-15','MALE','Ugandan','john@email.com','+256701000001','Kampala','Kampala','Teacher','Kitante Secondary School','VERIFIED','2024-01-10','NATIONAL_ID','CM12345678','ACTIVE',false,now(),now()),
('29ad45ac-fa62-4435-b03a-394d68f755af','21cb4e29-48b4-4c0e-8469-b70b9d0fa890','JNW-00002','Jane Nakato','1990-03-22','FEMALE','Ugandan','jane@email.com','+256701000002','Jinja','Jinja','Nurse','Jinja Regional Hospital','VERIFIED','2024-02-15','NATIONAL_ID','CM23456789','ACTIVE',false,now(),now()),
('394a8624-70a0-4243-bc32-2c6f5878e8b9','5a3b0b22-93ce-4fdc-b964-76fd7629daec','JNW-00003','Peter Okello','1978-11-08','MALE','Ugandan','peter@email.com','+256701000003','Gulu','Gulu','Farmer','Self Employed','PENDING',NULL,'NATIONAL_ID','CM34567890','ACTIVE',false,now(),now());

-- Shares
INSERT INTO public.shares (id,member_id,total_units,total_value,created_at,updated_at) VALUES
('8ceed7ac-dbfa-4233-a20c-fa2a406cc6f8','3a814131-d70c-456d-af1e-59620ff33350',500,500000,now(),now()),
('ac9837d6-4330-4ef8-b8c2-145e9e9b2346','29ad45ac-fa62-4435-b03a-394d68f755af',300,300000,now(),now()),
('7eab2fc7-a22d-4346-a318-0b6b29fa8ae4','394a8624-70a0-4243-bc32-2c6f5878e8b9',100,100000,now(),now());

-- Chart of Accounts
INSERT INTO public.chart_of_accounts (id,code,name,category,sub_category,normal_side,is_active,created_at,updated_at) VALUES
('8eef8eae-37b2-448f-b832-1ffd4623a35d','1010','Cash - Petty Cash','ASSET','CURRENT_ASSET','DEBIT',true,now(),now()),
('b265063e-2b54-4b78-8c65-57b32f6cb6db','1020','Cash - Bank Account','ASSET','CURRENT_ASSET','DEBIT',true,now(),now()),
('150e5573-0610-4a86-8a99-26638bc0348d','1030','Cash - Mobile Money','ASSET','CURRENT_ASSET','DEBIT',true,now(),now()),
('7448ed4f-de91-4728-b4ee-9fd2135e3efc','1100','Loan Receivables','ASSET','CURRENT_ASSET','DEBIT',true,now(),now()),
('1e51b6f3-fcd6-4e9e-9e91-6b3eac30183a','2010','Member Savings Deposits','LIABILITY','CURRENT_LIABILITY','CR',true,now(),now()),
('87a70f77-4a46-44c7-86b3-78f0f35082c9','2020','Member Share Capital','LIABILITY','CURRENT_LIABILITY','CR',true,now(),now()),
('ecdcdf5f-6d61-408f-b173-cd1c029781ae','3010','Retained Earnings','EQUITY','RETAINED_EARNINGS','CR',true,now(),now()),
('c50902f9-7071-4898-a369-34a79a8be2b4','4010','Interest Income - Loans','INCOME','INTEREST_INCOME','CR',true,now(),now()),
('40128a6c-649c-4013-9f74-90b7f435e540','4020','Fee Income','INCOME','FEE_INCOME','CR',true,now(),now()),
('960bdecd-6bc0-4a9b-9d3a-0e5fb1d27f24','5010','Interest Expense - Savings','EXPENSE','OPERATING_EXPENSE','DEBIT',true,now(),now()),
('910a08c0-d56e-4765-a6db-c2a2ae328fc5','5020','Operating Expenses','EXPENSE','ADMIN_EXPENSE','DEBIT',true,now(),now()),
('21d9b024-9253-4d95-8a31-1b428c77c5e4','5030','Provision for Bad Debts','EXPENSE','PROVISION_EXPENSE','DEBIT',true,now(),now());

-- Financial Periods
INSERT INTO public.financial_periods (id,name,start_date,end_date,is_closed,closed_at,closed_by,created_at) VALUES
(gen_random_uuid(),'FY2026','2026-01-01','2026-12-31',false,NULL,NULL,now()),
(gen_random_uuid(),'FY2025','2025-01-01','2025-12-31',true,'2026-01-01','fb328ae0-cd09-4ec6-b2f5-5b8a7434c2e3',now());

-- Savings Products
INSERT INTO public.savings_products (id,name,code,product_type,min_balance,interest_rate,interest_freq,charges,is_active,created_at,updated_at) VALUES
(gen_random_uuid(),'Regular Savings','REG','REGULAR',5000,3.0,'MONTHLY','[{"name":"Account Opening","amount":10000}]',true,now(),now()),
(gen_random_uuid(),'Fixed Deposit','FD','FIXED_DEPOSIT',100000,8.0,'MATURITY','[]',true,now(),now()),
(gen_random_uuid(),'Education Goal','EDU','GOAL_BASED',20000,5.0,'MONTHLY','[]',true,now(),now());

-- Loan Products
INSERT INTO public.loan_products (id,name,code,product_type,min_amount,max_amount,interest_rate,interest_method,repayment_period,repayment_freq,requires_guarantor,requires_collateral,max_guarantors,is_active,created_at,updated_at) VALUES
(gen_random_uuid(),'Regular Loan','REG','REGULAR',50000,5000000,15.0,'DECLINING',12,'MONTHLY',true,false,2,true,now(),now()),
(gen_random_uuid(),'Emergency Loan','EMR','EMERGENCY',10000,500000,10.0,'FLAT',6,'MONTHLY',false,false,0,true,now(),now()),
(gen_random_uuid(),'Agriculture Loan','AGR','AGRICULTURE',100000,10000000,12.0,'DECLINING',24,'MONTHLY',false,true,0,true,now(),now()),
(gen_random_uuid(),'Education Loan','EDU','EDUCATION',100000,20000000,8.0,'DECLINING',36,'MONTHLY',false,false,0,true,now(),now()),
(gen_random_uuid(),'Business Loan','BIZ','BUSINESS',200000,50000000,18.0,'DECLINING',24,'MONTHLY',true,true,2,true,now(),now());

-- Savings Accounts
INSERT INTO public.savings_accounts (id,member_id,product_id,account_number,status,balance,available_balance,created_at,updated_at) VALUES
('f60a968c-2a8b-4a5f-b6de-c77f0b4125bc','3a814131-d70c-456d-af1e-59620ff33350',(SELECT id FROM public.savings_products WHERE code='REG' LIMIT 1),'SAV-00001','ACTIVE',500000,500000,now(),now()),
('fc7fa8a4-9339-4aae-84c6-ae975834f20e','29ad45ac-fa62-4435-b03a-394d68f755af',(SELECT id FROM public.savings_products WHERE code='REG' LIMIT 1),'SAV-00002','ACTIVE',350000,350000,now(),now()),
('0fc47c18-9ea2-40e1-83dc-b5b7da946a7c','394a8624-70a0-4243-bc32-2c6f5878e8b9',(SELECT id FROM public.savings_products WHERE code='REG' LIMIT 1),'SAV-00003','ACTIVE',100000,100000,now(),now());

-- Savings Transactions
INSERT INTO public.savings_transactions (id,account_id,type,amount,balance_before,balance_after,payment_method,receipt_number,description,created_at) VALUES
('9850efd5-fda4-451d-90a4-e31494e2a185','f60a968c-2a8b-4a5f-b6de-c77f0b4125bc','DEPOSIT',500000,0,500000,'BANK_TRANSFER','RCP-000001','Initial deposit',now()-interval'90 days'),
('1900b707-357e-4360-91d9-2abe4ac088c8','f60a968c-2a8b-4a5f-b6de-c77f0b4125bc','DEPOSIT',50000,500000,550000,'CASH','RCP-000002','Monthly deposit 1',now()-interval'60 days'),
('f1e163d4-0a1f-46c9-9d5a-9d4bd5d439ae','f60a968c-2a8b-4a5f-b6de-c77f0b4125bc','DEPOSIT',75000,550000,625000,'CASH','RCP-000003','Monthly deposit 2',now()-interval'30 days'),
('c1952890-8e8c-4d05-9dd4-8eac1c844ee1','fc7fa8a4-9339-4aae-84c6-ae975834f20e','DEPOSIT',350000,0,350000,'BANK_TRANSFER','RCP-000004','Initial deposit',now()-interval'60 days'),
('22ff7574-ec94-4280-b5c7-527ca3d7db92','fc7fa8a4-9339-4aae-84c6-ae975834f20e','DEPOSIT',80000,350000,430000,'MOBILE_MONEY','RCP-000005','Savings deposit 1',now()-interval'30 days'),
('5499b1b7-9b88-45ea-8ed9-acd11a2e03a7','0fc47c18-9ea2-40e1-83dc-b5b7da946a7c','DEPOSIT',100000,0,100000,'BANK_TRANSFER','RCP-000006','Initial deposit',now()-interval'45 days');

-- Update savings account balances
UPDATE public.savings_accounts SET balance=675000,available_balance=675000 WHERE account_number='SAV-00001';
UPDATE public.savings_accounts SET balance=430000,available_balance=430000 WHERE account_number='SAV-00002';
UPDATE public.savings_accounts SET balance=100000,available_balance=100000 WHERE account_number='SAV-00003';

-- Loan Applications
INSERT INTO public.loan_applications (id,member_id,product_id,application_no,principal,purpose,repayment_period,status,risk_score,submitted_at,updated_at) VALUES
('b70e011d-5f07-4203-b1fb-5641017d1573','3a814131-d70c-456d-af1e-59620ff33350',(SELECT id FROM public.loan_products WHERE code='REG' LIMIT 1),'LAP-00001',1000000,'Home improvement',12,'ACTIVE',72,now()-interval'60 days',now()-interval'60 days'),
('61f73d70-11cd-4467-8d4c-0ba2077b7da2','29ad45ac-fa62-4435-b03a-394d68f755af',(SELECT id FROM public.loan_products WHERE code='EMR' LIMIT 1),'LAP-00002',500000,'Medical emergency',6,'ACTIVE',85,now()-interval'40 days',now()-interval'40 days'),
('95d9abb9-e265-4fa3-bd83-96fc62332b48','394a8624-70a0-4243-bc32-2c6f5878e8b9',(SELECT id FROM public.loan_products WHERE code='AGR' LIMIT 1),'LAP-00003',2000000,'Farm equipment purchase',24,'PENDING',55,now()-interval'5 days',now()-interval'5 days');

-- Loans
INSERT INTO public.loans (id,application_id,member_id,loan_no,principal,interest_rate,interest_method,total_interest,total_amount,amount_paid,balance,repayment_period,status,disbursed_at,disbursed_by,first_due_date,created_at,updated_at) VALUES
('63f0aa5d-1bee-4491-b716-c41fc9944a89','b70e011d-5f07-4203-b1fb-5641017d1573','3a814131-d70c-456d-af1e-59620ff33350','LN-00001',1000000,15.0,'DECLINING',83000,1083000,270750,812250,12,'ACTIVE',now()-interval'55 days','b7db2654-009b-4e7d-b4ea-5214fb1c9a3a',now()-interval'25 days',now()-interval'55 days',now()-interval'55 days'),
('941dd163-2e3c-4fbf-9475-6b4b72dca0c2','61f73d70-11cd-4467-8d4c-0ba2077b7da2','29ad45ac-fa62-4435-b03a-394d68f755af','LN-00002',500000,10.0,'FLAT',25000,525000,87500,437500,6,'ACTIVE',now()-interval'35 days','b7db2654-009b-4e7d-b4ea-5214fb1c9a3a',now()-interval'5 days',now()-interval'35 days',now()-interval'35 days');

-- Loan Schedules
INSERT INTO public.loan_schedules (id,loan_id,installment,due_date,principal,interest,total_amount,paid_amount,balance,status) VALUES
('ded8790a-a507-41dc-b385-d4afc81c2232','63f0aa5d-1bee-4491-b716-c41fc9944a89',1,now()-interval'55 days',83333,6917,90250,90250,0,'PAID'),
('fc30049b-fa20-423b-8c89-de3f373df988','63f0aa5d-1bee-4491-b716-c41fc9944a89',2,now()-interval'25 days',83333,6917,90250,90250,0,'PAID'),
('b52d1a92-2c54-491b-867b-9dbc78ed69b9','63f0aa5d-1bee-4491-b716-c41fc9944a89',3,now()-interval'-5 days',83333,6917,90250,90250,0,'PAID'),
('0f913eff-d5c2-4929-80f3-2cccbf159751','63f0aa5d-1bee-4491-b716-c41fc9944a89',4,now()-interval'-35 days',83333,6917,90250,0,90250,'PENDING'),
('428bf3d9-a7df-49b4-aa6d-b4e1bf8e0a70','63f0aa5d-1bee-4491-b716-c41fc9944a89',5,now()-interval'-65 days',83333,6917,90250,0,90250,'PENDING'),
('26249ff1-f7d6-4131-911f-5cb2e0e5e995','63f0aa5d-1bee-4491-b716-c41fc9944a89',6,now()-interval'-95 days',83333,6917,90250,0,90250,'PENDING'),
('58712575-d787-4db5-91eb-eb226438e846','63f0aa5d-1bee-4491-b716-c41fc9944a89',7,now()-interval'-125 days',83333,6000,89333,0,89333,'PENDING'),
('327981a6-c5d5-46d5-9ff1-3ae570c3df83','63f0aa5d-1bee-4491-b716-c41fc9944a89',8,now()-interval'-155 days',83333,6000,89333,0,89333,'PENDING'),
('09a7c741-54e6-4255-9514-008843b80b98','63f0aa5d-1bee-4491-b716-c41fc9944a89',9,now()-interval'-185 days',83333,6000,89333,0,89333,'PENDING'),
('3ab382a8-54d8-4d75-875e-a0d2567aab3b','63f0aa5d-1bee-4491-b716-c41fc9944a89',10,now()-interval'-215 days',83333,6000,89333,0,89333,'PENDING'),
('9451107a-f6fa-4e00-bae9-36364fba3ac9','63f0aa5d-1bee-4491-b716-c41fc9944a89',11,now()-interval'-245 days',83333,6000,89333,0,89333,'PENDING'),
('4152a0f4-5af1-47c8-9e5d-7f99b1a9b070','63f0aa5d-1bee-4491-b716-c41fc9944a89',12,now()-interval'-275 days',83333,6000,89333,0,89333,'PENDING');

INSERT INTO public.loan_schedules (id,loan_id,installment,due_date,principal,interest,total_amount,paid_amount,balance,status) VALUES
('c7cdc914-9031-49b0-b823-534e76b73564','941dd163-2e3c-4fbf-9475-6b4b72dca0c2',1,now()-interval'35 days',83333,4167,87500,87500,0,'PAID'),
('64fbc29a-ae10-4551-aa3d-bec2fc62c33c','941dd163-2e3c-4fbf-9475-6b4b72dca0c2',2,now()-interval'5 days',83333,4167,87500,0,87500,'PENDING'),
('a38b85f7-fb43-4ff1-a9c8-30842ecb002b','941dd163-2e3c-4fbf-9475-6b4b72dca0c2',3,now()-interval'-25 days',83333,4167,87500,0,87500,'PENDING'),
('b197f2f5-8496-4d8b-9773-728175c0d279','941dd163-2e3c-4fbf-9475-6b4b72dca0c2',4,now()-interval'-55 days',83333,4167,87500,0,87500,'PENDING'),
('b0606786-f3df-4b77-8d93-d96ea328b25e','941dd163-2e3c-4fbf-9475-6b4b72dca0c2',5,now()-interval'-85 days',83333,4167,87500,0,87500,'PENDING'),
('6d1e4c05-99c8-47ea-8f67-a914f3f25be5','941dd163-2e3c-4fbf-9475-6b4b72dca0c2',6,now()-interval'-115 days',83333,4167,87500,0,87500,'PENDING');

-- Loan Guarantors
INSERT INTO public.loan_guarantors (id,application_id,guarantor_id,amount,approved,approved_at,notes,created_at) VALUES
('157995fc-6d9e-44e0-a42a-2612e2ab5fb9','95d9abb9-e265-4fa3-bd83-96fc62332b48','3a814131-d70c-456d-af1e-59620ff33350',1000000,true,now()-interval'3 days','Guarantor approved',now()),
('0a4f4a21-d8a8-4a61-a03d-762c37ef6bb6','95d9abb9-e265-4fa3-bd83-96fc62332b48','29ad45ac-fa62-4435-b03a-394d68f755af',1000000,true,now()-interval'2 days','Guarantor approved',now());

-- Collateral
INSERT INTO public.loan_collaterals (id,application_id,type,description,estimated_value,document_ref,is_verified,created_at) VALUES
('986b6fd2-0971-431b-a68a-6df5cf2e6299','95d9abb9-e265-4fa3-bd83-96fc62332b48','LAND','Title deed for plot 22, Gulu',5000000,'TITLE-2024-001',true,now());

-- Share Purchases
INSERT INTO public.share_purchases (id,member_id,share_id,units,price_per_unit,total_amount,purchased_at) VALUES
('0f91b2d6-bb64-4548-9158-7373967ac611','3a814131-d70c-456d-af1e-59620ff33350','8ceed7ac-dbfa-4233-a20c-fa2a406cc6f8',500,1000,500000,now()-interval'90 days'),
('13837058-f2bb-4b71-92c5-dc0753e07873','29ad45ac-fa62-4435-b03a-394d68f755af','ac9837d6-4330-4ef8-b8c2-145e9e9b2346',300,1000,300000,now()-interval'80 days'),
('5575b03d-2f16-4f41-a6fe-96197678a042','394a8624-70a0-4243-bc32-2c6f5878e8b9','7eab2fc7-a22d-4346-a318-0b6b29fa8ae4',100,1000,100000,now()-interval'70 days');

-- Share Value
INSERT INTO public.share_values (id,price_per_unit,effective_date,set_by,notes,created_at) VALUES
('8934f596-ae7c-484e-9b16-383f227f6e94',1000,'2026-01-01','fb328ae0-cd09-4ec6-b2f5-5b8a7434c2e3','Opening share price FY2026',now());

-- Cash Accounts
INSERT INTO public.cash_accounts (id,name,account_type,account_number,bank_name,branch_code,swift_code,balance,currency,is_active,created_at,updated_at) VALUES
(gen_random_uuid(),'Petty Cash','PETTY_CASH',NULL,NULL,NULL,NULL,500000,'UGX',true,now(),now()),
(gen_random_uuid(),'Stanbic Bank - Main Account','BANK','9030001234567','Stanbic Bank Uganda','KAMPALA','SBICUGKA',8500000,'UGX',true,now(),now()),
(gen_random_uuid(),'MTN Mobile Money','MOBILE_MONEY',NULL,NULL,NULL,NULL,2300000,'UGX',true,now(),now()),
(gen_random_uuid(),'Airtel Money','MOBILE_MONEY',NULL,NULL,NULL,NULL,1500000,'UGX',true,now(),now());

-- Dividends
INSERT INTO public.dividend_distributions (id,financial_year,total_amount,per_unit_amount,declared_at,status,approved_by,created_at) VALUES
(gen_random_uuid(),'2025',25000000,500,'2025-12-15','PAID','fb328ae0-cd09-4ec6-b2f5-5b8a7434c2e3',now()),
(gen_random_uuid(),'2024',18000000,350,'2024-12-20','PAID','fb328ae0-cd09-4ec6-b2f5-5b8a7434c2e3',now());

-- Meetings
INSERT INTO public.meetings (id,title,type,date,venue,agenda,status,created_by,created_at,updated_at) VALUES
(gen_random_uuid(),'AGM 2025','AGM','2025-03-15','Jenga Wealth Conference Hall','[{"item":1,"title":"Opening"},{"item":2,"title":"Financial Report"}]','SCHEDULED','fb328ae0-cd09-4ec6-b2f5-5b8a7434c2e3',now(),now()),
(gen_random_uuid(),'AGM 2024','AGM','2024-03-15','Jenga Wealth Conference Hall','[{"item":1,"title":"Opening"}]','COMPLETED','fb328ae0-cd09-4ec6-b2f5-5b8a7434c2e3',now(),now());

-- Resolutions
INSERT INTO public.resolutions (id,meeting_id,title,description,status,votes_for,votes_against,votes_abstain,created_by,created_at,updated_at) VALUES
(gen_random_uuid(),(SELECT id FROM public.meetings WHERE title='AGM 2024' LIMIT 1),'Approve Dividend','Declare UGS 500/share dividend','IMPLEMENTED',25,3,2,'fb328ae0-cd09-4ec6-b2f5-5b8a7434c2e3',now(),now()),
(gen_random_uuid(),(SELECT id FROM public.meetings WHERE title='AGM 2024' LIMIT 1),'Increase Membership Fees','From UGS 50K to UGS 75K','PASSED',20,8,2,'fb328ae0-cd09-4ec6-b2f5-5b8a7434c2e3',now(),now());

-- System Config
INSERT INTO public.system_config (id,key,value,type,"group",description,created_at,updated_at) VALUES
(gen_random_uuid(),'sacco.name','"Jenga Wealth"','STRING','general','SACCO display name',now(),now()),
(gen_random_uuid(),'sacco.share_price','1000','NUMBER','shares','Price per share',now(),now()),
(gen_random_uuid(),'sacco.min_savings_balance','5000','NUMBER','savings','Minimum savings balance',now(),now()),
(gen_random_uuid(),'sacco.max_loan_multiplier','3','NUMBER','loans','Maximum loan as multiple of savings',now(),now());

COMMIT;
