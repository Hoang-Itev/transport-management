const SysParam = require('../models/sysParamModel');

const getParams = async (req, res) => {
  const data = await SysParam.findAll();
  res.json({ success: true, data });
};

const updateParam = async (req, res) => {
  await SysParam.update(req.params.maThamSo, req.body.giaTri);
  res.json({ success: true, message: 'Cập nhật tham số thành công' });
};

module.exports = { getParams, updateParam };