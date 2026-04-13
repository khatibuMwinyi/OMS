-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS owerumg;
USE owerumg;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'secretary') NOT NULL DEFAULT 'secretary',
  signature_image_path VARCHAR(500), -- nullable by default
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL,
  tin VARCHAR(50),
  invoice_date DATE NOT NULL,
  director VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  payment_method VARCHAR(50),
  bank_account VARCHAR(50),
  holder_name VARCHAR(255),
  bank_name VARCHAR(255),
  branch VARCHAR(255),
  mobile_number VARCHAR(255),
  mobile_holder VARCHAR(255),
  mobile_operator VARCHAR(255),
  subtotal DECIMAL(10,2) NOT NULL,
  vat DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL,
  grand_total DECIMAL(10,2) NOT NULL,
  sent_at TIMESTAMP NULL,
  sent_by INT,
  sent_via ENUM('whatsapp','email'),
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_invoices_user_created (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (sent_by) REFERENCES users(id)
);

-- Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_invoice_items_invoice (invoice_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  type VARCHAR(50),
  category VARCHAR(100),
  description VARCHAR(255),
  phone VARCHAR(20),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  bank_name VARCHAR(255),
  branch_name VARCHAR(255),
  reference_number VARCHAR(255),
  receipt_date DATE NOT NULL,
  sent_at TIMESTAMP NULL,
  sent_by INT,
  sent_via ENUM('whatsapp','email'),
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_receipts_user_created (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (sent_by) REFERENCES users(id)
);

-- Petty cash transactions
CREATE TABLE IF NOT EXISTS petty_cash_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  code VARCHAR(50),
  type VARCHAR(100),
  description VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  pettycash_number VARCHAR(50),
  reference_number VARCHAR(255),
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_petty_cash_user_created (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Payment vouchers
CREATE TABLE IF NOT EXISTS payment_vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  voucher_number VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  customer_name VARCHAR(255),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
  bank_name VARCHAR(255),
  account_number VARCHAR(255),
  account_name VARCHAR(255),
  bank_reference VARCHAR(255),
  mobile_number VARCHAR(255),
  payer_name VARCHAR(255),
  mobile_reference VARCHAR(255),
  code VARCHAR(100),
  type VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  admin_comment TEXT,
  approved_by INT,
  approved_at TIMESTAMP NULL,
  rejected_by INT,
  rejected_at TIMESTAMP NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_payment_vouchers_user_created (user_id, created_at),
  KEY idx_payment_vouchers_status_created (status, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (rejected_by) REFERENCES users(id)
);

-- Payment voucher config
CREATE TABLE IF NOT EXISTS payment_voucher_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  initial_voucher_number INT DEFAULT 1,
  user_id INT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Printed letters
CREATE TABLE IF NOT EXISTS printed_letters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  reference_number VARCHAR(50),
  description TEXT,
  pdf_path VARCHAR(500) NOT NULL,
  status ENUM('pending','approved') NOT NULL DEFAULT 'pending',
  approved_by INT,
  approved_at TIMESTAMP NULL,
  approved_signature_path VARCHAR(500),
  sent_at TIMESTAMP NULL,
  sent_by INT,
  sent_via ENUM('whatsapp','email'),
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_printed_letters_status_created (status, created_at),
  KEY idx_printed_letters_user_created (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (sent_by) REFERENCES users(id)
);

-- Letter content
CREATE TABLE IF NOT EXISTS letter_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  letter_id INT NOT NULL UNIQUE,
  letter_date DATE,
  receiver_address TEXT,
  heading VARCHAR(500),
  body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_letter_content_letter (letter_id),
  FOREIGN KEY (letter_id) REFERENCES printed_letters(id) ON DELETE CASCADE
);

-- Incoming letters
CREATE TABLE IF NOT EXISTS incoming_letters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_number VARCHAR(50),
  sender_name VARCHAR(255) NOT NULL,
  sender_organization VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  received_date DATE NOT NULL,
  pdf_path VARCHAR(500) NOT NULL,
  original_file_name VARCHAR(255),
  description TEXT,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_incoming_letters_user_created (user_id, created_at),
  KEY idx_incoming_letters_received_date (received_date, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Ranges tables
CREATE TABLE IF NOT EXISTS invoice_ranges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_range INT NOT NULL,
  end_range INT NOT NULL,
  current_number INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS receipt_ranges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_range INT NOT NULL,
  end_range INT NOT NULL,
  current_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voucher_ranges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_range INT NOT NULL,
  end_range INT NOT NULL,
  current_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS petty_cash_ranges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_range INT NOT NULL,
  end_range INT NOT NULL,
  current_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Petty cash config
CREATE TABLE IF NOT EXISTS petty_cash_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  initial_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  user_id INT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Default users
INSERT IGNORE INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin');
INSERT IGNORE INTO users (username, password, role) VALUES ('secretary', '1234', 'secretary');