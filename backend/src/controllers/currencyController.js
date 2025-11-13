const Currency = require('../models/Currency');

exports.getCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.find({ userId: req.user.id })
      .sort({ isDefault: -1, name: 1 });
    
    res.status(200).json({ 
      success: true, 
      count: currencies.length, 
      data: currencies 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка получения валют', 
      error: error.message 
    });
  }
};

exports.getCurrency = async (req, res) => {
  try {
    const currency = await Currency.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!currency) {
      return res.status(404).json({ 
        success: false, 
        message: 'Валюта не найдена' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      data: currency 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка получения валюты', 
      error: error.message 
    });
  }
};

exports.createCurrency = async (req, res) => {
  try {
    req.body.userId = req.user.id;
    
    // Если это первая валюта или установлен флаг isDefault
    if (req.body.isDefault) {
      // Снять флаг default со всех других валют пользователя
      await Currency.updateMany(
        { userId: req.user.id, isDefault: true },
        { isDefault: false }
      );
    }
    
    const currency = await Currency.create(req.body);
    
    res.status(201).json({ 
      success: true, 
      data: currency 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Валюта с таким кодом уже существует',
        errors: ['Валюта с таким кодом уже существует']
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: 'Ошибка создания валюты', 
      error: error.message 
    });
  }
};

exports.updateCurrency = async (req, res) => {
  try {
    let currency = await Currency.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!currency) {
      return res.status(404).json({ 
        success: false, 
        message: 'Валюта не найдена' 
      });
    }
    
    // Если устанавливается новая валюта по умолчанию
    if (req.body.isDefault && !currency.isDefault) {
      await Currency.updateMany(
        { userId: req.user.id, isDefault: true, _id: { $ne: req.params.id } },
        { isDefault: false }
      );
    }
    
    currency = await Currency.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ 
      success: true, 
      data: currency 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Валюта с таким кодом уже существует',
        errors: ['Валюта с таким кодом уже существует']
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: 'Ошибка обновления валюты', 
      error: error.message 
    });
  }
};

exports.deleteCurrency = async (req, res) => {
  try {
    const currency = await Currency.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!currency) {
      return res.status(404).json({ 
        success: false, 
        message: 'Валюта не найдена' 
      });
    }
    
    if (currency.isDefault) {
      return res.status(400).json({ 
        success: false, 
        message: 'Нельзя удалить валюту по умолчанию' 
      });
    }
    
    await currency.deleteOne();
    
    res.status(200).json({ 
      success: true, 
      message: 'Валюта удалена' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка удаления валюты', 
      error: error.message 
    });
  }
};

exports.setDefaultCurrency = async (req, res) => {
  try {
    const currency = await Currency.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!currency) {
      return res.status(404).json({ 
        success: false, 
        message: 'Валюта не найдена' 
      });
    }
    
    // Снять флаг default со всех валют
    await Currency.updateMany(
      { userId: req.user.id, isDefault: true },
      { isDefault: false }
    );
    
    // Установить текущую валюту как default
    currency.isDefault = true;
    await currency.save();
    
    res.status(200).json({ 
      success: true, 
      data: currency,
      message: 'Валюта по умолчанию установлена'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка установки валюты по умолчанию', 
      error: error.message 
    });
  }
};