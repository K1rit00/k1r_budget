const UtilityType = require('../models/UtilityType');

exports.getUtilityTypes = async (req, res) => {
  try {
    const utilityTypes = await UtilityType.find({ userId: req.user.id })
      .sort({ order: 1, name: 1 });
    
    res.status(200).json({ 
      success: true, 
      count: utilityTypes.length, 
      data: utilityTypes 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка получения типов услуг', 
      error: error.message 
    });
  }
};

exports.getUtilityType = async (req, res) => {
  try {
    const utilityType = await UtilityType.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!utilityType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Тип услуги не найден' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      data: utilityType 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка получения типа услуги', 
      error: error.message 
    });
  }
};

exports.createUtilityType = async (req, res) => {
  try {
    req.body.userId = req.user.id;
    const utilityType = await UtilityType.create(req.body);
    
    res.status(201).json({ 
      success: true, 
      data: utilityType 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Тип услуги с таким названием уже существует',
        errors: ['Тип услуги с таким названием уже существует']
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: 'Ошибка создания типа услуги', 
      error: error.message 
    });
  }
};

exports.updateUtilityType = async (req, res) => {
  try {
    let utilityType = await UtilityType.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!utilityType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Тип услуги не найден' 
      });
    }
    
    if (utilityType.isDefault) {
      return res.status(400).json({ 
        success: false, 
        message: 'Нельзя редактировать тип услуги по умолчанию' 
      });
    }
    
    utilityType = await UtilityType.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ 
      success: true, 
      data: utilityType 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Тип услуги с таким названием уже существует',
        errors: ['Тип услуги с таким названием уже существует']
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: 'Ошибка обновления типа услуги', 
      error: error.message 
    });
  }
};

exports.deleteUtilityType = async (req, res) => {
  try {
    const utilityType = await UtilityType.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!utilityType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Тип услуги не найден' 
      });
    }
    
    if (utilityType.isDefault) {
      return res.status(400).json({ 
        success: false, 
        message: 'Нельзя удалить тип услуги по умолчанию' 
      });
    }
    
    await utilityType.deleteOne();
    
    res.status(200).json({ 
      success: true, 
      message: 'Тип услуги удален' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка удаления типа услуги', 
      error: error.message 
    });
  }
};