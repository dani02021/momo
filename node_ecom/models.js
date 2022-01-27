const db = require("./db.js");
const { Sequelize, Model, DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");

const User = db.define("user", {
  username: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: true
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
    set(pass) {
      const salt = bcrypt.genSaltSync(5);
      const hash = bcrypt.hashSync(pass, salt, 5);
      this.setDataValue('password', hash);
    }
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emailConfirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
},
{
  paranoid: true,
  timestamp: true
});

// Add custom methods
User.prototype.ecomDelete = async function(varSave) {
  deleted = true;
  if (varSave) 
  {
    await this.save();
  }
}
User.prototype.checkPassword = function(varPass) {
  return bcrypt.compareSync(varPass, this.password);
}

const Category = db.define("category", {
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  imageCss: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
},
{
  paranoid: true,
  timestamp: true
});

const Product = db.define("product", {
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  price: {
    type: DataTypes.DECIMAL(7, 2),
    allowNull: false
  },
  discountPrice: {
    type: DataTypes.DECIMAL(7, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING(600),
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  hide: {
    type: DataTypes.BOOLEAN
  }
},
{
  paranoid: true,
  timestamp: true
});

Product.belongsTo(Category, {
  foreignKey: 'categoryId'
});

function category() {
  return Category;
}

function product() {
  return Product;
}

function user() {
  return User;
}

module.exports.category = category;
module.exports.product = product;
module.exports.user = user;

(async () => {
    // await db.sync({ alter: true });
    // await Category.create({name: "Gym Accessories", imageCss: "fa fa-dumbbell"})
})();