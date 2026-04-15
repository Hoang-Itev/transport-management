const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Kiểm tra kết nối ngay khi khởi động
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Kết nối Database thất bại:', err.message);
  } else {
    console.log('✅ Kết nối Database thành công!');
    connection.release();
  }
});

const promisePool = pool.promise();
module.exports = promisePool;