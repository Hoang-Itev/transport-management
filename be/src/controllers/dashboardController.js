const Dashboard = require('../models/dashboardModel');

const getTongQuan = async (req, res) => {
  try {
    const data = await Dashboard.tongQuan();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getDoanhThu = async (req, res) => {
  try {
    const { thang, nam } = req.query;

    // Validate nếu truyền vào
    if (thang && (Number(thang) < 1 || Number(thang) > 12)) {
      return res.status(422).json({
        success: false,
        error: { code: 'THANG_KHONG_HOP_LE', message: 'Tháng phải từ 1 đến 12' }
      });
    }
    if (nam && (Number(nam) < 2000 || Number(nam) > 2100)) {
      return res.status(422).json({
        success: false,
        error: { code: 'NAM_KHONG_HOP_LE', message: 'Năm không hợp lệ' }
      });
    }

    const data = await Dashboard.doanhThu({ thang, nam });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getTongQuan, getDoanhThu };