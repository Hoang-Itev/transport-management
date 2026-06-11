const unitTypeModel = require('../models/unitTypeModel');

exports.getUnitTypes = async (req, res) => {
    try {
        const unitTypes = await unitTypeModel.getAll();
        res.status(200).json({ success: true, data: unitTypes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.createUnitType = async (req, res) => {
    try {
        const insertId = await unitTypeModel.create(req.body);
        res.status(201).json({ success: true, message: 'Tạo đơn vị tính thành công', id: insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi tạo đơn vị tính', error: error.message });
    }
};

exports.updateUnitType = async (req, res) => {
    try {
        const affectedRows = await unitTypeModel.update(req.params.id, req.body);
        if (affectedRows === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy ID' });
        res.status(200).json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật', error: error.message });
    }
};

exports.deleteUnitType = async (req, res) => {
    try {
        const affectedRows = await unitTypeModel.delete(req.params.id);
        if (affectedRows === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy ID' });
        res.status(200).json({ success: true, message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xóa', error: error.message });
    }
};