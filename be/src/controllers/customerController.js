const Customer = require('../models/customerModel');

// [GET] /api/v1/khach-hang
const getCustomers = async (req, res) => {
  try {
    // FIX LỖI 500: Ép kiểu bắt buộc sang Number để MySQL không bị sập
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || '';
    const isActive = req.query.isActive;
    
    const result = await Customer.findAll({ page, limit, search, isActive });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("LỖI GET KHACH HANG:", error); // In ra log đỏ ở Terminal
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [GET] /api/v1/khach-hang/:id
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({ success: false, error: { message: 'Không tìm thấy khách hàng' } });
    }

    // FIX CHUẨN V3: Không cần Query tính nợ phức tạp nữa, bốc thẳng từ Database ra
    const hanMucNo = Number(customer.han_muc_no_toi_da) || 0;
    const noHienTai = Number(customer.tong_no_hien_tai) || 0;
    const conLaiDuocPhepNo = hanMucNo > 0 ? (hanMucNo - noHienTai) : 0;

    res.json({
      success: true,
      data: {
        ...customer,
        han_muc_no_toi_da: hanMucNo,
        tong_no_hien_tai: noHienTai,
        conLaiDuocPhepNo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [POST] /api/v1/khach-hang
const createCustomer = async (req, res) => {
  try {
    const id = await Customer.create(req.body);
    res.status(201).json({ success: true, message: 'Thêm khách hàng thành công', data: { id } });
  } catch (error) {
    // Bắt lỗi trùng Mã số thuế (MySQL error code 1062 là Duplicate entry)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: { message: 'Mã số thuế hoặc Email đã tồn tại' } });
    }
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [PUT] /api/v1/khach-hang/:id
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({ success: false, error: { message: 'Không tìm thấy khách hàng' } });
    }

    await Customer.update(id, req.body);
    res.json({ success: true, message: 'Cập nhật khách hàng thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [DELETE] /api/v1/khach-hang/:id
// Thao tác sửa trực tiếp tại hàm deleteCustomer trong file customerController.js
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, error: { message: 'Không tìm thấy khách hàng' } });

    // FIX CHUẨN V3: Thay thế hàm checkUnpaidWaybills bằng đoạn check nợ thực tế dựa trên cột tong_no_hien_tai
    if (Number(customer.tong_no_hien_tai) > 0) {
      return res.status(422).json({ 
        success: false, 
        error: { code: 'KHACH_HANG_CO_DU_LIEU', message: 'Không thể xóa! Khách hàng này hiện vẫn còn dư nợ công nợ chưa hoàn thành.' } 
      });
    }

    await Customer.softDelete(id);
    res.json({ success: true, message: 'Đã vô hiệu hóa khách hàng thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };