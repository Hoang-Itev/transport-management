const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    console.log(">>> Body nhận được từ Thunder:", req.body); // Dòng cực kỳ quan trọng
    const { tenDangNhap, matKhau } = req.body;

    // 1. Kiểm tra user có tồn tại không
    const user = await User.findByUsername(tenDangNhap);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng' } 
      });
    }

    // 2. Kiểm tra tài khoản có bị khóa không
    if (user.trang_thai === 'LOCKED') {
      return res.status(423).json({ 
        success: false, 
        error: { code: 'ACCOUNT_LOCKED', message: 'Tài khoản đang bị khóa' } 
      });
    }

    // 3. Kiểm tra mật khẩu (so sánh mật khẩu nhập vào với hash trong DB)
    const isMatch = await bcrypt.compare(matKhau, user.mat_khau_hash);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng' } 
      });
    }

    // 4. Tạo JWT Token
    const token = jwt.sign(
      { id: user.id, vaiTro: user.vai_tro }, 
      process.env.JWT_SECRET, 
      { expiresIn: '8h' } // Token có hiệu lực trong 8 tiếng
    );

    // 5. Trả về thành công
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          hoTen: user.ho_ten,
          vaiTro: user.vai_tro
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// Lấy thông tin người dùng đang đăng nhập
const getMe = async (req, res) => {
  try {
    // req.user được tạo ra từ verifyToken middleware
    const User = require('../models/userModel');
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Đăng xuất
const logout = async (req, res) => {
  // Với JWT, việc đăng xuất ở Backend chủ yếu là thông báo thành công
  // Frontend sẽ tự xóa Token trong LocalStorage là xong.
  res.json({ success: true, message: 'Đăng xuất thành công' });
};

// Nhớ export thêm 2 hàm này
module.exports = { login, getMe, logout };