const User = require('../models/userModel');

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', vaiTro, trangThai } = req.query;
    const result = await User.findAll({ page, limit, search, vaiTro, trangThai });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { message: 'Không tìm thấy người dùng' } });
    
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const createUser = async (req, res) => {
  try {
    const id = await User.create(req.body);
    res.status(201).json({ success: true, message: 'Thêm người dùng thành công', data: { id } });
  } catch (error) {
    // MySQL Lỗi trùng lặp (Tên đăng nhập hoặc Email)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: { message: 'Tên đăng nhập hoặc Email đã tồn tại' } });
    }
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, error: { message: 'Không tìm thấy người dùng' } });

    await User.update(id, req.body);
    res.json({ success: true, message: 'Cập nhật người dùng thành công' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: { message: 'Email này đã được sử dụng bởi người khác' } });
    }
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const toggleLock = async (req, res) => {
  try {
    const { id } = req.params;
    
    // NGHIỆP VỤ: Không cho phép tự khóa tài khoản của chính mình
    if (Number(id) === req.user.id) {
      return res.status(422).json({ success: false, error: { message: 'Không thể tự khóa tài khoản của chính mình' } });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, error: { message: 'Không tìm thấy người dùng' } });

    const newStatus = await User.toggleLock(id, user.trang_thai);
    const message = newStatus === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản';
    
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, toggleLock };