-- =========================================================================
-- 0. LÀM SẠCH VÀ TẠO MỚI DATABASE (Chuẩn UTF-8 Tiếng Việt)
-- =========================================================================
DROP DATABASE IF EXISTS logi;
CREATE DATABASE logi DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE logi;

-- =========================================================================
-- 1. TẠO CÁC BẢNG LÕI & ĐỐI TÁC
-- =========================================================================

CREATE TABLE tham_so_he_thongs (
  ma_tham_so      VARCHAR(50) PRIMARY KEY,
  gia_tri         VARCHAR(255) NOT NULL,
  kieu_du_lieu    ENUM('NUMBER', 'STRING', 'BOOLEAN') NOT NULL,
  mo_ta_nghiep_vu TEXT NULL
);

CREATE TABLE nguoi_dungs (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  ten_dang_nhap   VARCHAR(50)  NOT NULL UNIQUE,
  mat_khau_hash   VARCHAR(255) NOT NULL,
  ho_ten          VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  so_dien_thoai   VARCHAR(20)  NULL,
  vai_tro         ENUM('MANAGER','SALE','KE_TOAN') NOT NULL,
  trang_thai      ENUM('ACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at      DATETIME NOT NULL DEFAULT NOW(),
  updated_at      DATETIME NULL
);

CREATE TABLE khach_hangs (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  loai_khach        ENUM('B2C_VANG_LAI', 'B2B_DOANH_NGHIEP') NOT NULL,
  ten_cong_ty       VARCHAR(255) NOT NULL,
  ma_so_thue        VARCHAR(20)  NULL UNIQUE,
  nguoi_lien_he     VARCHAR(100) NOT NULL,
  so_dien_thoai     VARCHAR(20)  NOT NULL,
  email             VARCHAR(255) NULL,
  dia_chi           VARCHAR(500) NULL,
  han_muc_no_toi_da DECIMAL(15,2) NOT NULL DEFAULT 0,
  tong_no_hien_tai  DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        DATETIME     NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- 2. TẠO BẢNG DANH MỤC & BẢNG GIÁ
-- =========================================================================

CREATE TABLE danh_muc_don_vi_tinhs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  ten_dvt     VARCHAR(50) NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE loai_hangs (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  ten_loai            VARCHAR(100) NOT NULL,
  he_so_gia           DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  cau_hinh_thuoc_tinh JSON NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE loai_xes (
  id               VARCHAR(20) PRIMARY KEY,
  ten_hien_thi     VARCHAR(100) NOT NULL,
  tai_trong_max_kg DECIMAL(10,2) NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE phu_phis (
  id          VARCHAR(20) PRIMARY KEY,
  ten_phu_phi VARCHAR(100) NOT NULL,
  cach_tinh   ENUM('CO_DINH', 'THEO_KG', 'THEO_LOAI_XE') NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE bang_gia_phu_phis (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  phu_phi_id VARCHAR(20) NOT NULL,
  loai_xe_id VARCHAR(20) NULL, 
  don_gia    DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (phu_phi_id) REFERENCES phu_phis(id) ON DELETE CASCADE,
  FOREIGN KEY (loai_xe_id) REFERENCES loai_xes(id) ON DELETE CASCADE
);

CREATE TABLE chiet_khau_san_luong_ltls (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  moc_tu_kg          DECIMAL(10,2) NOT NULL,
  moc_den_kg         DECIMAL(10,2) NOT NULL,
  he_so_chiet_khau   DECIMAL(4,2) NOT NULL
);

CREATE TABLE bang_gia_ltls (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  moc_tu_km      DECIMAL(10,2) NOT NULL,
  moc_den_km     DECIMAL(10,2) NOT NULL,
  don_gia_goc_kg DECIMAL(10,2) NOT NULL,
  cuoc_toi_thieu DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE bang_gia_ftls (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  loai_xe_id VARCHAR(20) NOT NULL,
  moc_tu_km  DECIMAL(10,2) NOT NULL,
  moc_den_km DECIMAL(10,2) NOT NULL,
  gia_mo_cua DECIMAL(12,2) NOT NULL,
  don_gia_km DECIMAL(10,2) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (loai_xe_id) REFERENCES loai_xes(id) ON UPDATE CASCADE
);

-- =========================================================================
-- 3. TẠO BẢNG BÁO GIÁ & BOOKINGS
-- =========================================================================

CREATE TABLE bao_gias (
  id                   VARCHAR(30) PRIMARY KEY, 
  khach_hang_id        BIGINT NOT NULL,
  nguoi_tao_id         BIGINT NOT NULL,
  tong_tien_truoc_thue DECIMAL(15,2) NOT NULL DEFAULT 0,
  thue_vat_pt          DECIMAL(5,2) NOT NULL DEFAULT 0,
  tong_tien_sau_thue   DECIMAL(15,2) NOT NULL DEFAULT 0,
  trang_thai           ENUM('DRAFT','SENT','ACCEPTED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  ngay_het_han         DATE NOT NULL,
  ghi_chu_dieu_khoan   TEXT NULL,
  created_at           DATETIME NOT NULL DEFAULT NOW(),
  updated_at           DATETIME NULL,
  FOREIGN KEY (khach_hang_id) REFERENCES khach_hangs(id) ON UPDATE CASCADE,
  FOREIGN KEY (nguoi_tao_id) REFERENCES nguoi_dungs(id) ON UPDATE CASCADE
);

CREATE TABLE bookings (
  id                  VARCHAR(30) PRIMARY KEY,
  bao_gia_id          VARCHAR(30) NOT NULL,
  hinh_thuc           ENUM('LTL', 'FTL') NOT NULL,
  loai_xe_id          VARCHAR(20) NULL,
  so_km_api           DECIMAL(10,2) NOT NULL,
  nguoi_gui_ten       VARCHAR(100) NOT NULL,
  nguoi_gui_sdt       VARCHAR(20) NOT NULL,
  diem_lay_chi_tiet   VARCHAR(500) NOT NULL,
  nguoi_nhan_ten      VARCHAR(100) NOT NULL,
  nguoi_nhan_sdt      VARCHAR(20) NOT NULL,
  diem_giao_chi_tiet  VARCHAR(500) NOT NULL,
  tong_cuoc_chinh     DECIMAL(15,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (bao_gia_id) REFERENCES bao_gias(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (loai_xe_id) REFERENCES loai_xes(id) ON UPDATE CASCADE
);

CREATE TABLE booking_items (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id            VARCHAR(30) NOT NULL,
  loai_hang_id          BIGINT NOT NULL,
  ten_hang              VARCHAR(255) NOT NULL,
  so_luong              INT NOT NULL,
  don_vi_tinh_id        BIGINT NOT NULL,
  trong_luong_thuc_te   DECIMAL(10,2) NOT NULL,
  gia_tri_khai_bao      DECIMAL(15,2) NULL,
  thuoc_tinh_chi_tiet   JSON NULL,
  chargeable_weight     DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (loai_hang_id) REFERENCES loai_hangs(id) ON UPDATE CASCADE,
  FOREIGN KEY (don_vi_tinh_id) REFERENCES danh_muc_don_vi_tinhs(id) ON UPDATE CASCADE
);

CREATE TABLE booking_phu_phis (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id      VARCHAR(30) NOT NULL,
  phu_phi_id      VARCHAR(20) NOT NULL,
  loai_xe_id      VARCHAR(20) NULL, 
  so_tien_du_kien DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (phu_phi_id) REFERENCES phu_phis(id) ON UPDATE CASCADE,
  FOREIGN KEY (loai_xe_id) REFERENCES loai_xes(id) ON UPDATE CASCADE
);

-- =========================================================================
-- 4. BẢNG VẬN ĐƠN & TÀI CHÍNH
-- =========================================================================

CREATE TABLE van_dons (
  ma_van_don            VARCHAR(30) PRIMARY KEY,
  booking_id            VARCHAR(30) NOT NULL UNIQUE,
  nguoi_tao_id          BIGINT NOT NULL,
  nguoi_gui_ten_thuc_te  VARCHAR(100) NOT NULL,
  nguoi_gui_sdt_thuc_te  VARCHAR(20) NOT NULL,
  nguoi_nhan_ten_thuc_te VARCHAR(100) NOT NULL,
  nguoi_nhan_sdt_thuc_te VARCHAR(20) NOT NULL,
  trong_luong_chot      DECIMAL(10,2) NULL,
  kich_thuoc_chot       JSON NULL,
  tong_cuoc_chinh       DECIMAL(15,2) NOT NULL,
  tong_phu_phi          DECIMAL(15,2) NOT NULL DEFAULT 0,
  so_tien_chot_cuoi     DECIMAL(15,2) NOT NULL,
  hinh_thuc_thanh_toan  ENUM('TRA_TRUOC','COD_THU_HO','GHI_NO') NOT NULL,
  tien_cod_thu_ho       DECIMAL(15,2) NOT NULL DEFAULT 0,
  trang_thai_thanh_toan ENUM('UNPAID','PARTIAL','PAID') NOT NULL DEFAULT 'UNPAID',
  trang_thai_van_chuyen ENUM('CHO_LAY','LUU_KHO_DI','DANG_CHAY','LUU_KHO_DEN','DANG_GIAO','DA_GIAO','CANCELLED') NOT NULL DEFAULT 'CHO_LAY',
  hinh_anh_pod          VARCHAR(500) NULL,
  ngay_tao              DATETIME NOT NULL DEFAULT NOW(),
  updated_at            DATETIME NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON UPDATE CASCADE,
  FOREIGN KEY (nguoi_tao_id) REFERENCES nguoi_dungs(id) ON UPDATE CASCADE
);

-- =========================================================================
-- 5. BẢNG QUẢN LÝ TÀI CHÍNH (PHIẾU THU & ĐỐI SOÁT CÔNG NỢ)
-- =========================================================================

CREATE TABLE phieu_thus (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  khach_hang_id       BIGINT NOT NULL,
  nguoi_ghi_nhan_id   BIGINT NOT NULL,
  so_tien_nhan_duoc   DECIMAL(15,2) NOT NULL,
  ngay_thu            DATE NOT NULL,
  hinh_thuc           ENUM('CHUYEN_KHOAN','TIEN_MAT') NOT NULL,
  so_tham_chieu       VARCHAR(100) NULL,
  hinh_anh_bill       VARCHAR(500) NULL,
  ghi_chu             TEXT NULL,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (khach_hang_id) REFERENCES khach_hangs(id) ON UPDATE CASCADE,
  FOREIGN KEY (nguoi_ghi_nhan_id) REFERENCES nguoi_dungs(id) ON UPDATE CASCADE
);

CREATE TABLE phieu_thu_chi_tiets (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  phieu_thu_id    BIGINT NOT NULL,
  van_don_id      VARCHAR(30) NOT NULL,
  so_tien_phan_bo DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (phieu_thu_id) REFERENCES phieu_thus(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (van_don_id) REFERENCES van_dons(ma_van_don) ON UPDATE CASCADE,
  CONSTRAINT uq_ptct UNIQUE (phieu_thu_id, van_don_id)
);

-- =========================================================================
-- 6. DỮ LIỆU ĐỂ DEMO (SEED DATA CỰC CHI TIẾT)
-- =========================================================================

-- Tham số hệ thống
INSERT INTO tham_so_he_thongs (ma_tham_so, gia_tri, kieu_du_lieu, mo_ta_nghiep_vu) VALUES
('VAT_RATE', '8', 'NUMBER', 'Thuế suất VAT (%) - Áp dụng giảm thuế'),
('VOLUMETRIC_DIVISOR', '5000', 'NUMBER', 'Quy đổi thể tích sang Kg (Đường bộ)');

-- Người dùng (Admin, Sales, Kế toán)
INSERT INTO nguoi_dungs (ten_dang_nhap, mat_khau_hash, ho_ten, email, vai_tro) VALUES
('admin', '$2b$10$YHtTDQEjxSIr.UCLmj/JD.VN7UD4hMBOtJNzfdjxW3s1TmcMyaOYK', 'Admin Quản Trị', 'admin@logi.vn', 'MANAGER'),
('sale01', '$2b$10$YHtTDQEjxSIr.UCLmj/JD.VN7UD4hMBOtJNzfdjxW3s1TmcMyaOYK', 'Nguyễn Phương Sale', 'phuong.sale@logi.vn', 'SALE'),
('sale02', '$2b$10$YHtTDQEjxSIr.UCLmj/JD.VN7UD4hMBOtJNzfdjxW3s1TmcMyaOYK', 'Trần Hùng Điều Vận', 'hung.dieuvan@logi.vn', 'SALE'),
('ketoan01', '$2b$10$YHtTDQEjxSIr.UCLmj/JD.VN7UD4hMBOtJNzfdjxW3s1TmcMyaOYK', 'Lê Thu Tài Chính', 'thu.ketoan@logi.vn', 'KE_TOAN');

-- Khách hàng Doanh Nghiệp (B2B) và Khách Lẻ (B2C)
INSERT INTO khach_hangs (loai_khach, ten_cong_ty, ma_so_thue, nguoi_lien_he, so_dien_thoai, email, han_muc_no_toi_da, is_active) VALUES
('B2B_DOANH_NGHIEP', 'Công ty CP Sữa Vinamilk', '0300588569', 'Anh Khoa', '0901234567', 'khoa.logistics@vinamilk.com.vn', 500000000, 1),
('B2B_DOANH_NGHIEP', 'Tập đoàn Masan Consumer', '0302017440', 'Chị Ngọc', '0933444555', 'ngoc.supplychain@masan.vn', 300000000, 1),
('B2B_DOANH_NGHIEP', 'Công ty TNHH Nhựa Duy Tân', '0300588570', 'Chú Hưng', '0988777666', 'hung.kho@duytan.com', 150000000, 1),
('B2C_VANG_LAI', 'Nguyễn Văn Tuấn (Khách lẻ)', NULL, 'Anh Tuấn', '0919999888', 'tuan.nguyen123@gmail.com', 0, 1),
('B2C_VANG_LAI', 'Chị Lan Bán Online', NULL, 'Chị Lan', '0322111222', 'lan.shopquanao@gmail.com', 0, 1);

-- Đơn vị tính đa dạng
INSERT INTO danh_muc_don_vi_tinhs (ten_dvt) VALUES ('Thùng'), ('Pallet'), ('Kiện'), ('Cuộn'), ('Cái'), ('Bao'), ('Can 20L');

-- Các loại hàng hóa đặc thù kèm cấu trúc nhập liệu (UI)
INSERT INTO loai_hangs (ten_loai, he_so_gia, cau_hinh_thuoc_tinh) VALUES
('Bách hóa tiêu chuẩn', 1.00, '["dai_cm", "rong_cm", "cao_cm"]'),
('Hàng cồng kềnh / Siêu nhẹ', 0.90, '["dai_cm", "rong_cm", "cao_cm"]'), -- Giấy, Bỉm tã (Ưu đãi nhẹ)
('Hàng giá trị cao / Dễ vỡ', 1.30, '["dai_cm", "rong_cm", "cao_cm", "khong_xep_chong"]'), -- Tivi, Rượu
('Hàng hóa chất / Dễ cháy', 1.50, '["loai_bon_chua"]'),
('Hàng đông lạnh / Y tế', 1.80, '["nhiet_do_c", "yeu_cau_lam_lanh"]');

-- Xe tải các kích cỡ
INSERT INTO loai_xes (id, ten_hien_thi, tai_trong_max_kg) VALUES
('XE_MAY', 'Xe máy (Giao hỏa tốc)', 100),
('XE_BAN_TAI', 'Xe Bán tải / Van (Chạy phố)', 500),
('XE_1.25T', 'Xe tải nhỏ 1.25 Tấn', 1250),
('XE_2.5T', 'Xe tải trung 2.5 Tấn', 2500),
('XE_5T', 'Xe tải 5 Tấn (Thùng dài 6m)', 5000),
('XE_8T', 'Xe tải 8 Tấn (Thùng dài 7-9m)', 8000),
('XE_15T', 'Xe tải nặng 15 Tấn (3 chân)', 15000),
('XE_CONT', 'Xe Container 30 Tấn', 30000);

-- Danh mục Phụ phí
INSERT INTO phu_phis (id, ten_phu_phi, cach_tinh) VALUES
('PP_LAY', 'Thuê xe trung chuyển đi Lấy hàng', 'THEO_LOAI_XE'),
('PP_GIAO', 'Thuê xe trung chuyển đi Giao hàng', 'THEO_LOAI_XE'),
('PP_BOC_XEP', 'Phí bốc xếp / Lên xuống hàng', 'THEO_KG'),
('PP_ROT_DIEM', 'Phí ghé rớt điểm (Từ điểm thứ 3)', 'CO_DINH'),
('PP_DONG_GOI', 'Phí đóng gói / Bọc màng co Pallet', 'CO_DINH');

-- Bảng giá Phụ phí theo loại xe
INSERT INTO bang_gia_phu_phis (phu_phi_id, loai_xe_id, don_gia) VALUES
('PP_LAY', 'XE_MAY', 50000),  
('PP_LAY', 'XE_BAN_TAI', 200000),
('PP_LAY', 'XE_1.25T', 350000),
('PP_LAY', 'XE_2.5T', 550000),
('PP_GIAO', 'XE_MAY', 50000),
('PP_GIAO', 'XE_BAN_TAI', 200000),
('PP_GIAO', 'XE_1.25T', 350000),
('PP_GIAO', 'XE_2.5T', 550000),
('PP_BOC_XEP', NULL, 250); -- 250đ/kg bốc xếp

-- Bảng chiết khấu LTL: Gửi càng nhiều, giảm càng sâu
INSERT INTO chiet_khau_san_luong_ltls (moc_tu_kg, moc_den_kg, he_so_chiet_khau) VALUES
(0, 100, 1.00),         -- Không giảm
(100.1, 500, 0.95),     -- Giảm 5%
(500.1, 2000, 0.90),    -- Giảm 10%
(2000.1, 5000, 0.80),   -- Giảm 20%
(5000.1, 999999, 0.70); -- Giảm 30%

-- Bảng giá Hàng Ghép (LTL): Áp dụng thực tế theo cự ly
INSERT INTO bang_gia_ltls (moc_tu_km, moc_den_km, don_gia_goc_kg, cuoc_toi_thieu) VALUES
(0, 50, 1200, 150000),       -- Nội thành phố (Tối thiểu 150k)
(50.1, 200, 2000, 300000),   -- Đi tỉnh lân cận
(200.1, 500, 2800, 500000),  -- Chặng trung (VD: HCM - Nha Trang)
(500.1, 1000, 3500, 800000), -- Chặng dài
(1000.1, 2500, 4200, 1200000); -- Bắc Nam (VD: HCM - HN)

-- Bảng giá Nguyên Chuyến (FTL): Bậc thang chuẩn Grab/Taxi
-- Logic: Trong X km đầu thì tính giá Mở cửa. Vượt X km thì nhân thêm cước/km.
INSERT INTO bang_gia_ftls (loai_xe_id, moc_tu_km, moc_den_km, gia_mo_cua, don_gia_km) VALUES
-- Xe 1.25 Tấn
('XE_1.25T', 0, 40, 800000, 0),        -- Bao 40km đầu: 800k
('XE_1.25T', 40.1, 200, 0, 14000),     -- Chạy thêm tính 14k/km
('XE_1.25T', 200.1, 9999, 0, 12000),   -- Đi xa giảm còn 12k/km

-- Xe 5 Tấn
('XE_5T', 0, 50, 1500000, 0),          -- Bao 50km đầu: 1.5 triệu
('XE_5T', 50.1, 300, 0, 19000),        -- Chạy thêm tính 19k/km
('XE_5T', 300.1, 9999, 0, 16000),      -- Đi xa giảm còn 16k/km

-- Xe 15 Tấn (Đường dài)
('XE_15T', 0, 100, 3500000, 0),        -- Bao 100km đầu: 3.5 triệu
('XE_15T', 100.1, 500, 0, 25000),      -- Chạy thêm tính 25k/km
('XE_15T', 500.1, 9999, 0, 21000);     -- Đi xa giảm còn 21k/km