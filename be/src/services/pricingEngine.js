// src/services/pricingEngine.js
const PricingLTL = require('../models/pricingLtlModel');
const PricingFTL = require('../models/pricingFtlModel');
const db = require('../config/database');

// Lấy tham số hệ thống quy đổi thể tích (Mặc định 5000 nếu DB chưa có)
const getVolumetricDivisor = async () => {
  const [rows] = await db.query(`SELECT gia_tri FROM tham_so_he_thongs WHERE ma_tham_so = 'VOLUMETRIC_DIVISOR'`);
  return rows.length > 0 ? Number(rows[0].gia_tri) : 5000;
};

const calculateLTL = async (soKmApi, loaiHangId, trongLuongKg, soLuong, thuocTinhChiTiet) => {
  if (!soKmApi || soKmApi <= 0) return null;

  // 1. Lấy Hệ số loại hàng
  const [lhRows] = await db.query('SELECT he_so_gia FROM loai_hangs WHERE id = ?', [loaiHangId]);
  const heSoGia = lhRows.length > 0 ? Number(lhRows[0].he_so_gia) : 1.0;

  // 2. Tính Trọng lượng quy đổi (Chargeable Weight)
  let khoiLuongQuyDoi = 0;
  if (thuocTinhChiTiet && thuocTinhChiTiet.dai_cm && thuocTinhChiTiet.rong_cm && thuocTinhChiTiet.cao_cm) {
    const divisor = await getVolumetricDivisor();
    const theTich1Kien = (Number(thuocTinhChiTiet.dai_cm) * Number(thuocTinhChiTiet.rong_cm) * Number(thuocTinhChiTiet.cao_cm)) / divisor;
    khoiLuongQuyDoi = theTich1Kien * Number(soLuong);
  }

  const tongKgThucTe = Number(trongLuongKg) * Number(soLuong);
  const chargeableWeight = Math.max(tongKgThucTe, khoiLuongQuyDoi);

  // 3. Tra Đơn Giá Gốc theo số Km API
  const basePriceRow = await PricingLTL.lookupBasePrice(soKmApi);
  if (!basePriceRow) return null; 
  const donGiaGoc = Number(basePriceRow.don_gia_goc_kg);

  // 4. Tra Hệ số chiết khấu theo Tổng Kg (Chargeable Weight)
  const discountRow = await PricingLTL.lookupDiscount(chargeableWeight);
  const heSoChietKhau = discountRow ? Number(discountRow.he_so_chiet_khau) : 1.0;

  // 5. MASTER FORMULA
  const cuocChinhDuKien = donGiaGoc * chargeableWeight * heSoGia * heSoChietKhau;

  // Trả về cả phân tích giá để Sale nhìn thấy trên UI
  return { 
    chargeableWeight, 
    chiTietGia: {
      donGiaGoc,
      heSoGia,
      heSoChietKhau
    },
    cuocChinhDuKien 
  };
};

const calculateFTL = async (loaiXeId, soKm) => {
  if (!soKm || soKm <= 0) return null;
  const bangGia = await PricingFTL.findByVehicle(loaiXeId);
  if (!bangGia || bangGia.length === 0) return null;

  let totalCost = 0;
  let remainingKm = Number(soKm);

  for (const moc of bangGia) {
    if (remainingKm <= 0) break;
    const kmTrongMoc = Number(moc.moc_den_km) - Number(moc.moc_tu_km);
    if (Number(moc.gia_mo_cua) > 0 && moc.moc_tu_km == 0) {
      totalCost += Number(moc.gia_mo_cua);
      remainingKm -= kmTrongMoc;
      continue;
    }
    if (remainingKm > kmTrongMoc) {
      totalCost += kmTrongMoc * Number(moc.don_gia_km);
      remainingKm -= kmTrongMoc;
    } else {
      totalCost += remainingKm * Number(moc.don_gia_km);
      remainingKm = 0;
    }
  }
  return { cuocChinhDuKien: totalCost };
};

module.exports = { calculateLTL, calculateFTL };