const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // 1. Lấy token từ header "Authorization" (thường có dạng: Bearer <token>)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // 2. Nếu không có token thì đuổi ra
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'NO_TOKEN', message: 'Bạn cần đăng nhập để thực hiện thao tác này' } 
    });
  }

  try {
    // 3. Giải mã token bằng Secret Key đã cài ở .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. Lưu thông tin đã giải mã (id, vaiTro) vào req để các hàm sau sử dụng
    req.user = decoded; 
    
    // 5. Cho phép đi tiếp vào Controller
    next(); 
  } catch (error) {
    // 6. Nếu token sai hoặc hết hạn
    return res.status(403).json({ 
      success: false, 
      error: { code: 'INVALID_TOKEN', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' } 
    });
  }
};

// Middleware phân quyền (Ví dụ: Chỉ Manager mới được vào)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.vaiTro)) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Bạn không có quyền thực hiện hành động này' } 
      });
    }
    next();
  };
};

module.exports = { verifyToken, authorize };