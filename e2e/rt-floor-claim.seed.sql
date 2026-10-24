-- ข้อมูลทดสอบ "E2E local" สำหรับหน้า /rt-approval (ฐาน op_rt_e2e บนเครื่องเท่านั้น)
SET time_zone = '+00:00'; -- แอปเก็บเวลาเป็น UTC (timezone +00:00) ให้ NOW()/CURRENT_TIMESTAMP ตรงกัน
DELETE FROM rt_request WHERE so_running LIKE 'E2EL%';
DELETE FROM shopping_order WHERE so_running LIKE 'E2EL%';
DELETE FROM shopping_head WHERE sh_running LIKE 'E2EL%';
DELETE FROM members WHERE mem_code LIKE 'E2EL%';
DELETE FROM products WHERE product_code LIKE 'E2E-P%';
DELETE FROM employees WHERE emp_code LIKE 'E2E%';
DELETE FROM member_route WHERE route_code = 'E2EL';

INSERT INTO employees (emp_code, emp_name, emp_nickname, emp_tel, emp_floor, allowUsed) VALUES
 ('E2E01','E2E local QC','QC ทดสอบ','-','1',1),
 ('E2E02','E2E local หยิบชั้น 3','หยิบ3','-','3',1),
 ('E2E03','E2E local หยิบชั้น 2','หยิบ2','-','2',1);
INSERT INTO member_route (route_code, route_name) VALUES ('E2EL','E2E local สาย');
INSERT INTO members (mem_code, mem_name, route_code, picking_status) VALUES ('E2EL01','E2E local ร้าน 1','E2EL','picked');
INSERT INTO products (product_code, product_name, product_floor, product_stock, product_unit, last_stock_date) VALUES
 ('E2E-P1','E2E local ยา A 60 มล. (ชั้นบอกหมด แต่สต็อกมี)','3',317,'ขวด',NOW() - INTERVAL 30 MINUTE),
 ('E2E-P2','E2E local ยา B (ชั้นบอกไม่เจอ สต็อก 0)','2',0,'กล่อง',NOW() - INTERVAL 30 MINUTE),
 ('E2E-P3','E2E local ยา C (ชั้นบอกเสีย)','3',50,'แผง',NOW() - INTERVAL 30 MINUTE),
 ('E2E-P4','E2E local ยา D (ชั้นยังไม่ได้กด)','2',12,'ขวด',NOW() - INTERVAL 30 MINUTE);
INSERT INTO shopping_head (sh_running, sh_datetime, mem_code, picking_status, sh_already_qc) VALUES ('E2EL-SH1', NOW(), 'E2EL01', 'Submit', 'No');
INSERT INTO shopping_order (so_running, so_procode, so_amount, so_unit, sh_running, picking_status, emp_code_floor_picking, so_picking_time, so_already_qc) VALUES
 ('E2EL-SO1','E2E-P1',2,'ขวด','E2EL-SH1','หมด','E2E02',NOW() - INTERVAL 40 MINUTE,'No'),
 ('E2EL-SO2','E2E-P2',1,'กล่อง','E2EL-SH1','ไม่เจอ','E2E03',NOW() - INTERVAL 35 MINUTE,'No'),
 ('E2EL-SO3','E2E-P3',3,'แผง','E2EL-SH1','เสีย','E2E02',NOW() - INTERVAL 30 MINUTE,'No'),
 ('E2EL-SO4','E2E-P4',1,'ขวด','E2EL-SH1','pending',NULL,NULL,'No');
INSERT INTO rt_request (ref, so_running, sh_running, amount_item, unit_item, empQc_note, status, emp_code, product_code, mem_code, is_active) VALUES
 (UUID(),'E2EL-SO1','E2EL-SH1',2,'ขวด','สินค้าหมด','Pending','E2E01','E2E-P1','E2EL01',1),
 (UUID(),'E2EL-SO2','E2EL-SH1',1,'กล่อง','สินค้าหมด','Pending','E2E01','E2E-P2','E2EL01',1),
 (UUID(),'E2EL-SO3','E2EL-SH1',3,'แผง','สินค้าไม่พร้อมขาย','Pending','E2E01','E2E-P3','E2EL01',1),
 (UUID(),'E2EL-SO4','E2EL-SH1',1,'ขวด','อื่น ๆ','Pending','E2E01','E2E-P4','E2EL01',1);
-- ฐานใหม่ไม่มี flag rt-request → หน้าอนุมัติจะถือว่าปิดและกดแถวไม่ได้ (prod มี flag นี้อยู่แล้ว)
INSERT INTO featue_flag (module, status) VALUES ('rt-request', 1) ON DUPLICATE KEY UPDATE status = 1;
