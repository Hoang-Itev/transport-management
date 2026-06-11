const CongNo = require('../models/congNoModel');
const ExcelJS = require('exceljs');
const { sendDebtReminderEmail } = require('../services/emailService');

const getCongNo = async (req, res) => {
  try {
    const result = await CongNo.findAll(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getCongNoByKhachHang = async (req, res) => {
  try {
    const data = await CongNo.findByKhachHangId(req.params.khachHangId);
    if (!data) {
      return res.status(404).json({
        success: false,
        error: { code: 'KHACH_HANG_NOT_FOUND', message: 'Không tìm thấy khách hàng' }
      });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const xuatBaoCao = async (req, res) => {
  try {
    // 🚀 FIX: Nhận tham số tìm kiếm từ Frontend
    const { search, quaHan, format = 'excel' } = req.query;
    const data = await CongNo.baoCaoCongNo({ search, quaHan });

    if (format === 'excel') {
      const workbook  = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Báo cáo công nợ');

      worksheet.columns = [
        { header: 'Khách hàng',     key: 'tenCongTy',    width: 30 },
        { header: 'Người liên hệ',  key: 'nguoiLienHe',  width: 20 },
        { header: 'SĐT',            key: 'soDienThoai',  width: 15 },
        { header: 'Mã vận đơn',     key: 'vanDonId',     width: 18 },
        { header: 'Giá trị',        key: 'giaTri',       width: 15 },
        { header: 'Đã thu',         key: 'daThu',        width: 15 },
        { header: 'Còn lại',        key: 'conLai',       width: 15 },
        { header: 'Hạn thanh toán', key: 'ngayHetHan',   width: 18 },
        { header: 'Số ngày quá hạn',key: 'soNgayQuaHan', width: 18 },
        { header: 'Trạng thái',     key: 'isQuaHan',     width: 15 }
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };

      data.forEach(row => {
        // 🚀 FIX: Format số đẹp cho Excel (100.000 thay vì 100000)
        const added = worksheet.addRow({
          ...row,
          giaTri: row.giaTri.toLocaleString('vi-VN') + ' đ',
          daThu: row.daThu.toLocaleString('vi-VN') + ' đ',
          conLai: row.conLai.toLocaleString('vi-VN') + ' đ',
          ngayHetHan: new Date(row.ngayHetHan).toLocaleDateString('vi-VN'),
          soNgayQuaHan: row.soNgayQuaHan > 0 ? row.soNgayQuaHan : 0,
          isQuaHan: row.isQuaHan ? 'Quá hạn' : 'Trong hạn'
        });
        
        if (row.isQuaHan) {
          added.font = { color: { argb: 'FFFF0000' } }; // Bôi đỏ
        }
      });

      const tenFile = `BaoCaoCongNo_ChiTiet.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${tenFile}"`);
      
      await workbook.xlsx.write(res);
      res.end();

    } else {
      res.status(501).json({ success: false, error: { message: 'Xuất PDF chưa hỗ trợ' }});
    }
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getVanDonChuaThanhToan = async (req, res) => {
  try {
    const { khachHangId } = req.params;
    // Tận dụng logic đã có trong findByKhachHangId của Model
    const data = await CongNo.findByKhachHangId(khachHangId);
    
    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }
    
    // Chỉ trả về danh sách vận đơn chưa thanh toán
    res.json({ success: true, data: data.vanDonChuaTT });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 🚀 HÀM MỚI: Gửi mail nhắc nợ toàn bộ do Kế toán bấm thủ công
const guiMailNhacNoToanBo = async (req, res) => {
  try {
    const khachHangNoList = await CongNo.getDanhSachKhachNoEmail();
    
    if (khachHangNoList.length === 0) {
      return res.status(200).json({ success: true, message: 'Tuyệt vời! Hiện tại không có khách hàng nào đang nợ hoặc không có email.' });
    }

    let successCount = 0;
    // Chạy vòng lặp gửi email ngầm (Chạy nền không đợi để API trả response nhanh)
    Promise.allSettled(khachHangNoList.map(async (kh) => {
      try {
        await sendDebtReminderEmail(kh.email, kh.ten_cong_ty, kh.tong_no_hien_tai, kh.soNgayQuaHan);
        successCount++;
      } catch (err) {
        console.error(`Lỗi gửi mail nhắc nợ cho ${kh.email}:`, err);
      }
    }));

    res.json({ 
      success: true, 
      message: `Hệ thống đang tiến hành gửi email nhắc nợ đến ${khachHangNoList.length} khách hàng! Quá trình này chạy ngầm mất vài phút.` 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getCongNo, getCongNoByKhachHang, xuatBaoCao, getVanDonChuaThanhToan, guiMailNhacNoToanBo };