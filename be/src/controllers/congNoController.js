const CongNo = require('../models/congNoModel');
const ExcelJS = require('exceljs');

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
    const { thang, nam, format = 'excel' } = req.query;
    const data = await CongNo.baoCaoCongNo({ thang, nam });

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

      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };

      data.forEach(row => {
        const added = worksheet.addRow({
          ...row,
          isQuaHan: row.isQuaHan ? 'Quá hạn' : 'Trong hạn'
        });
        // Tô đỏ dòng quá hạn
        if (row.isQuaHan) {
          added.font = { color: { argb: 'FFFF0000' } };
        }
      });

      const tenFile = `BaoCaoCongNo${thang ? `_T${thang}` : ''}_${nam || ''}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${tenFile}"`);
      
      await workbook.xlsx.write(res);
      res.end();

    } else {
      // format=pdf — để dành làm sau nếu cần
      res.status(501).json({
        success: false,
        error: { code: 'NOT_IMPLEMENTED', message: 'Xuất PDF chưa hỗ trợ' }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getCongNo, getCongNoByKhachHang, xuatBaoCao };