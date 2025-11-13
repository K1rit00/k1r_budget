const Bank = require('../models/Bank');

exports.getBanks = async (req, res) => {
  try {
    const banks = await Bank.find({ userId: req.user.id }).sort({ name: 1 });
    res.status(200).json({ 
      success: true, 
      count: banks.length, 
      data: banks 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка получения банков', 
      error: error.message 
    });
  }
};

exports.getBank = async (req, res) => {
  try {
    const bank = await Bank.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!bank) {
      return res.status(404).json({ 
        success: false, 
        message: 'Банк не найден' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      data: bank 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка получения банка', 
      error: error.message 
    });
  }
};

exports.createBank = async (req, res) => {
  try {
    req.body.userId = req.user.id;
    const bank = await Bank.create(req.body);
    
    res.status(201).json({ 
      success: true, 
      data: bank 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Банк с таким названием уже существует',
        errors: ['Банк с таким названием уже существует']
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: 'Ошибка создания банка', 
      error: error.message 
    });
  }
};

exports.updateBank = async (req, res) => {
  try {
    let bank = await Bank.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!bank) {
      return res.status(404).json({ 
        success: false, 
        message: 'Банк не найден' 
      });
    }
    
    if (bank.isDefault) {
      return res.status(400).json({ 
        success: false, 
        message: 'Нельзя редактировать банк по умолчанию' 
      });
    }
    
    bank = await Bank.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ 
      success: true, 
      data: bank 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Банк с таким названием уже существует',
        errors: ['Банк с таким названием уже существует']
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: 'Ошибка обновления банка', 
      error: error.message 
    });
  }
};

exports.deleteBank = async (req, res) => {
  try {
    const bank = await Bank.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!bank) {
      return res.status(404).json({ 
        success: false, 
        message: 'Банк не найден' 
      });
    }
    
    if (bank.isDefault) {
      return res.status(400).json({ 
        success: false, 
        message: 'Нельзя удалить банк по умолчанию' 
      });
    }
    
    await bank.deleteOne();
    
    res.status(200).json({ 
      success: true, 
      message: 'Банк удален' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка удаления банка', 
      error: error.message 
    });
  }
};