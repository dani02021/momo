const db = require("./db.js");
const { Sequelize, Model, DataTypes, ValidationError, STRING } = require("sequelize");
const bcrypt = require("bcrypt");
const assert = require('assert/strict');
const configEcom = require("./config.js");
const { validate } = require("./db.js");
const { AssertionError } = require("assert");

const Settings = db.define('settings', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.STRING,
    allowNull: true
  }
},
{
  timestamps: false,
  paranoid: false
});

const Log = db.define("log", {
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.fn('NOW')
  },
  user: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: "",
    validate: {
      len: {
        args: [0, 50],
        msg: "Username must be within range [0-50]"
      }
    }
  },
  level: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  message: {
    type: DataTypes.STRING(1024),
    allowNull: true,
    validate: {
      stringTruncate() {
        Object.keys(this._changed).forEach((element) => {
            const temp = this.__proto__.rawAttributes[element];
            if (temp.type.__proto__.__proto__.key == "STRING") {
              if (this[element]) {
                if (this[element].length > temp.type._length) {
                  this[element] = this[element].substring(0, temp.type._length);
                }
              }
            }
        });
      }
    }
  },
  longMessage: {
    type: DataTypes.STRING(3096),
    allowNull: true,
    validate: {
      stringTruncate() {
        Object.keys(this._changed).forEach((element) => {
            const temp = this.__proto__.rawAttributes[element];
            if (temp.type.__proto__.__proto__.key == "STRING") {
              if (this[element]) {
                if (this[element].length > temp.type._length) {
                  this[element] = this[element].substring(0, temp.type._length);
                }
              }
            }
        });
      }
    }
  },
  isStaff: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
},
{
  paranoid: true,
  timestamps: false
});

const User = db.define("user", {
  username: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    validate: {
      is: {
        args: /^([a-zA-Z0-9]{4,14})$/i,
        msg: "Username must contains only Latin symbols or numbers and should be of size 4-14"
      },
      notNull: {
        msg: "Username cannot be null!"
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    unique: {
      msg: "This email already exists!"
    },
    allowNull: false,
    validate: {
      isEmail: {
        msg: "Email is not in valid format!"
      },
      len: {
        args: [1, 50],
        msg: "Email length must be within range [1-50]"
      },
      notNull: {
        msg: "Email cannot be null!"
      }
    }
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      is: {
        args: /^[a-zA-Zа-яА-Я]{2,50}$/i,
        msg: "First name should contain only latin or cyrillic symbols with length 2-50"
      },
      notNull: {
        msg: "First name cannot be null!"
      }
    }
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      is: {
        args: /^[a-zA-Zа-яА-Я]{2,50}$/i,
        msg: "Last name should contain only latin or cyrillic symbols with length 2-50"
      },
      notNull: {
        msg: "Last name cannot be null!"
      }
    }
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
    set(pass) {
      if (!pass) 
      {
        throw new ValidationError("Password is invalid!");
      }

      if (/^(?=.*[0-9])(?=.*[a-zA-Z])(?!.*\s).{8,32}$/i.exec(pass) == null) 
      {
        throw new ValidationError("Password must contain a digit and a character, with size 8-32!");
      }
      
      const hash = bcrypt.hashSync(pass, configEcom.DEFAULT_SALT_ROUNDS);
      this.setDataValue('password', hash);
    }
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: {
        args: [0, 200],
        msg: "Address length must be within range [0-200]"
      }
    }
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        args: true,
        msg: "Country name cannot be empty!"
      },
      len: {
        args: [1, 200],
        msg: "Country name length must be within range [1-200]!"
      },
      notNull: {
        msg: "County cannot be null!"
      } 
    }
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [1, 100],
        msg: "Gender length must be within range [1-100]"
      },
      notNull: {
        msg: "Gender cannot be null!"
      },
      isIn: {
        args: configEcom.VALID_GENDERS,
        msg: "Gender is not valid!"
      }
    }
  },
  birthday: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notNull: {
        msg: "Birthday cannot be null!"
      },

      isOldEnough(value) {
        var today = new Date();
        var birthDate = new Date(value);
        var age = today.getFullYear() - birthDate.getFullYear();
        var m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 18)
          throw new AssertionError("You have to be at least 18 years old!");

        if (age > 120)
          throw new AssertionError("Invalid age!");
      }
    }
  },
  emailConfirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  }
},
  {
    paranoid: true,
    timestamp: true
  });

// Add custom methods
User.prototype.authenticate = function (varPass) {
  return bcrypt.compareSync(varPass, this.password);
};

const Staff = db.define("staff", {
  username: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    validate: {
      is: {
        args: /^([a-zA-Z0-9]{4,14})$/i,
        msg: "Username must contains only Latin symbols or numbers and should be of size 4-14"
      },
      notNull: {
        msg: "Username cannot be null!"
      } 
    }
  },
  email: {
    type: DataTypes.STRING(50),
    unique: {
      msg: "This email already exists!"
    },
    allowNull: true,
    validate: {
      isEmail: {
        msg: "Email is not in valid format!"
      }
    }
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    is: {
      args: /^[a-zA-Zа-яА-Я]{2,50}$/i,
      msg: "First name should contain only latin or cyrillic symbols with length 2-50"
    },
    notNull: {
      msg: "First name cannot be null!"
    } 
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    is: {
      args: /^[a-zA-Zа-яА-Я]{2,50}$/i,
      msg: "Last name should contain only latin or cyrillic symbols with length 2-50"
    },
    notNull: {
      msg: "Last name cannot be null!"
    } 
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
    set(pass) {
      if (!pass) 
      {
        throw new ValidationError("Password is invalid!");
      }

      if (/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{7,32}$/i.exec(pass) == null) 
      {
        throw new ValidationError("Password must contain at least 1 digit, 1 uppercase and 1 lowercase character, with size 7-32");
      }
      
      const salt = bcrypt.genSaltSync(5);
      const hash = bcrypt.hashSync(pass, salt, 5);
      this.setDataValue('password', hash);
    }
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastActivity: {
    type: DataTypes.DATE,
    allowNull: true
  }
},
  {
    paranoid: true,
    timestamp: true
  });

// Add custom methods
Staff.prototype.authenticate = function (varPass) {
  return bcrypt.compareSync(varPass, this.password);
};

const Permission = db.define('permission', {
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: {
        args: [1, 50],
        msg: "Permission length must be within range [1-50]"
      }
    }
  }
},
  {
    paranoid: true,
    timestamp: true
  });

const Role = db.define("role", {
  name: {
    type: DataTypes.STRING(25),
    allowNull: false,
    unique: {
      name: true,
      msg: "Role name must be unique"
    },
    validate: {
      len: {
        args: [1,25],
        msg: "Role name length must be within range [1-25]"
      }
    }
  }
},
  {
    paranoid: true,
    timestamp: true
  });

Role.belongsToMany(Permission, { through: 'role_permissions' });
Permission.belongsToMany(Role, { through: 'role_permissions' });

Role.belongsToMany(Staff, { through: 'staff_role' });
Staff.belongsToMany(Role, { through: 'staff_role' });

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
    defaultValue: 1,
    allowNull: false
  },
  hide: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
},
  {
    paranoid: true,
    timestamp: true
  });

const Session = db.define("session", {
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  maxAge: {
    type: DataTypes.INTEGER
  },
  expire: {
    type: DataTypes.DATE
  },
  messages: {
    type: DataTypes.JSONB
  },
  username: {
    type: DataTypes.STRING(50)
  },
  staffUsername: {
    type: DataTypes.STRING(50)
  },
},
  {
    paranoid: false,
    timestamp: false
  });

Product.prototype.getPriceWithVAT = async function () {
  return parseFloat((await db.query(`SELECT price +
    ROUND(price * ${configEcom.SETTINGS.vat}, 2)
    AS total
    FROM products
    WHERE id = ${this.id} AND
    "deletedAt" is NULL`,
    {
      type: 'SELECT',
      plain: true
    })).total);
}

Product.prototype.getDiscountPriceWithVAT = async function () {
  return parseFloat((await db.query(`SELECT "discountPrice" +
    ROUND("discountPrice" * ${configEcom.SETTINGS.vat}, 2)
    AS total
    FROM products
    WHERE id = ${this.id} AND
    "deletedAt" is NULL`,
    {
      type: 'SELECT',
      plain: true
    })).total);
}

Product.belongsTo(Category, {
  foreignKey: 'categoryId'
});

const Transaction = db.define("transacion", {
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'paypal'
  }
},
{
  paranoid: false,
  timestamp: false
});

const PayPalTransaction = db.define("paypaltransacion", {
  transactionId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  orderId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  emailAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  grossAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  paypalFee: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false
  },
},
{
  paranoid: false,
  timestamp: false
});

// Cash On Delivery
const CODTransaction = db.define("codtransaction", {

},
{
  paranoid: false,
  timestamp: false
});

const OrderItem = db.define("orderitem", {
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  price: {
    type: DataTypes.DECIMAL(7, 2),
    defaultValue: 0,
    allowNull: false
  }
},
  {
    paranoid: true,
    timestamp: true
  });

OrderItem.belongsTo(Product, {
  foreignKey: 'productId',
  allowNull: false
});

OrderItem.prototype.getTotal = async function () {
  if (this.price != 0)
    return price;

  let product = await this.getProduct();

  assert(product);

  return parseFloat((await db.query(`SELECT "discountPrice" * orderitems.quantity
    AS total FROM products, orderitems
    WHERE products.id = ${product.id} AND
    orderitems.id = ${this.id} AND
    products.id = orderitems."productId" AND
    orderitems."deletedAt" is NULL AND
    products."deletedAt" is NULL`, {
    type: 'SELECT',
    plain: true,
  })).total);
};

OrderItem.prototype.getTotalWithVAT = async function () {
  if (this.price != 0)
    return parseFloat((await db.query(`SELECT (price + ROUND(price * ${configEcom.SETTINGS.vat}, 2) * quantity)
      AS total
      FROM orderitems
      WHERE orderitems.id = ${this.id} AND
      "deletedAt" is NULL`, {
        type: 'SELECT',
        plain: true,
      })).total);

  let product = await this.getProduct();

  assert(product);

  return parseFloat((await db.query(`SELECT ("discountPrice" + ROUND("discountPrice" * ${configEcom.SETTINGS.vat}, 2)) * orderitems.quantity
    AS total
    FROM products, orderitems
    WHERE products.id = ${product.id} AND
    orderitems.id = ${this.id} AND
    products.id = orderitems."productId" AND
    orderitems."deletedAt" is NULL AND
    products."deletedAt" is NULL`, {
    type: 'SELECT',
    plain: true,
  })).total);
};

const Order = db.define("order", {
  orderedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.SMALLINT,
    defaultValue: 0
  }
},
{
  paranoid: true,
  timestamp: true
});

Order.belongsToMany(User, { through: 'user_orders' });
User.belongsToMany(Order, { through: 'user_orders' });

Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order);

Order.prototype.getItems = function () {
  return this.getOrderItems();
}

Order.prototype.getItemsCount = function () {
  return this.getOrderItems().length;
}

/*Order.prototype.getTotal = async function () {
  var total = 0.0;
  var orderitems = await this.getOrderitems();

  assert(orderitems);

  for(i = 0; i < orderitems.length; i++) 
  {
    total += parseFloat(await orderitems[i].getTotal());
  }
  
  return total;
}*/

Order.prototype.getTotal = async function () {
  // Big possibility for a bug
  // If Order is not complete
  // calculate by current product
  // prices, if the order is ocmplete
  // calculate by it's orderitems
  // prices

  // If not ordered
  if (this.status == 0)
    return parseFloat((await db.query(
      `SELECT SUM(orderitems.quantity * products."discountPrice") FROM orders
      INNER JOIN orderitems ON orders.id = orderitems."orderId"
      INNER JOIN products ON orderitems."productId" = products.id
      WHERE orders.id = ${this.id} AND
      orderitems."deletedAt" is NULL AND
      orders."deletedAt" is NULL;`, {
      type: 'SELECT',
      plain: true,
    })).sum);

  return parseFloat((await db.query(
    `SELECT SUM(orderitems.quantity * orderitems.price) FROM orders
    INNER JOIN orderitems ON orders.id = orderitems."orderId"
    WHERE orders.id = ${this.id} AND
    orderitems."deletedAt" is NULL AND
    orders."deletedAt" is NULL;`, {
    type: 'SELECT',
    plain: true,
  })).sum);
}

Order.prototype.getTotalWithVAT = async function () {
  // Big possibility for a bug
  // If Order is not complete
  // calculate by current product
  // prices, if the order is ocmplete
  // calculate by it's orderitems
  // prices

  // If not ordered
  if (this.status == 0)
    return parseFloat((await db.query(
      `SELECT SUM(orderitems.quantity * (products."discountPrice" +
      ROUND(products."discountPrice" * ${configEcom.SETTINGS.vat}, 2))) FROM orders
      INNER JOIN orderitems ON orders.id = orderitems."orderId"
      INNER JOIN products ON orderitems."productId" = products.id
      WHERE orders.id = ${this.id} AND
      orderitems."deletedAt" is NULL AND
      orders."deletedAt" is NULL;`, {
      type: 'SELECT',
      plain: true,
    })).sum);

  return parseFloat((await db.query(
    `SELECT SUM(orderitems.quantity * (orderitems.price +
    ROUND(orderitems.price * ${configEcom.SETTINGS.vat}, 2))) FROM orders
    INNER JOIN orderitems ON orders.id = orderitems."orderId"
    WHERE orders.id = ${this.id} AND
    orderitems."deletedAt" is NULL AND
    orders."deletedAt" is NULL;`, {
    type: 'SELECT',
    plain: true,
  })).sum);
}

Order.prototype.orderedAtHTML = function() {
  return this.orderedAt.toISOString().substring(0, 19);
}

Order.prototype.getVATSum = async function() {
  if (this.status == 0)
    return parseFloat(
      (await db.query(
        `SELECT SUM(ROUND(products."discountPrice" * ${configEcom.SETTINGS.vat}, 2) * orderitems.quantity)
        FROM orderitems
        INNER JOIN orders ON orders.id = orderitems."orderId"
        INNER JOIN products ON orderitems."productId" = products.id
        WHERE orders.id = ${this.id} AND
        orders."deletedAt" is NULL AND
        orderitems."deletedAt" is NULL`, {
          type: 'SELECT',
          plain: true,
      })).sum);
  
  return parseFloat(
    (await db.query(
      `SELECT SUM(ROUND(orderitems.price * ${configEcom.SETTINGS.vat}, 2) * orderitems.quantity)
      FROM orderitems
      INNER JOIN orders ON orders.id = orderitems."orderId"
      WHERE orders.id = ${this.id} AND
      orders."deletedAt" is NULL AND
      orderitems."deletedAt" is NULL`, {
        type: 'SELECT',
        plain: true,
      })).sum);
}

Order.hasOne(Transaction, {foreignKey: {name: 'orderid'}});
Transaction.belongsTo(Order, {foreignKey: {name: 'orderid'}});

Transaction.hasOne(PayPalTransaction, {foreignKey: {name: 'transactionid'}});
PayPalTransaction.belongsTo(Transaction, {foreignKey: {name: 'transactionid'}});

Transaction.hasOne(CODTransaction, {foreignKey: {name: 'transactionid'}});
CODTransaction.belongsTo(Transaction, {foreignKey: {name: 'transactionid'}});

/* Order statuses
NOT_ORDERED = 0, _('Not Ordered')
PENDING = 1, _('Pending')
SHIPPED = 2, _('Shipped')
DECLINED = 3, _('Declined')
COMPLETED = 4, _('Completed')
NOT_PAYED = 5, _('Not Payed')
PAYER_ACTION_REQUIRED = 6, _('Payer Action Required')
*/

function category() {
  return Category;
}

function product() {
  return Product;
}

function user() {
  return User;
}

function staff() {
  return Staff;
}

function session() {
  return Session;
}

function permission() {
  return Permission;
}

function role() {
  return Role;
}

function order() {
  return Order;
}

function orderitem() {
  return OrderItem;
}

function transaction() {
  return Transaction;
}

function paypaltransacion() {
  return PayPalTransaction;
}

function codtransaction() {
  return CODTransaction;
}

function log() {
  return Log;
}

function settings() {
  return Settings;
}

module.exports = {
  category, product, user, staff, session, permission, role, order, orderitem, transaction,
  paypaltransacion, codtransaction, log, settings
};

// Alter the database
(async () => {
  // await db.sync({ alter: true });

  // Create the roles

  /*
  Role.create({name: 'Admin'});
  Role.create({name: 'Moderator'});
  Role.create({name: 'Vendor'});
  Role.create({name: 'Support'});
  */

  // Create the permissions

  /*
  Permission.create({name: 'orders.create'});
  Permission.create({name: 'orders.read'});
  Permission.create({name: 'orders.update'});
  Permission.create({name: 'orders.delete'});
  Permission.create({name: 'products.create'});
  Permission.create({name: 'products.read'});
  Permission.create({name: 'products.update'});
  Permission.create({name: 'products.delete'});
  Permission.create({name: 'categories.create'});
  Permission.create({name: 'categories.delete'});
  Permission.create({name: 'accounts.create'});
  Permission.create({name: 'accounts.read'});
  Permission.create({name: 'accounts.update'});
  Permission.create({name: 'accounts.delete'});
  Permission.create({name: 'roles.create'});
  Permission.create({name: 'roles.read'});
  Permission.create({name: 'roles.update'});
  Permission.create({name: 'roles.delete'});
  Permission.create({name: 'staff.create'});
  Permission.create({name: 'staff.read'});
  Permission.create({name: 'staff.update'});
  Permission.create({name: 'staff.delete'});
  Permission.create({name: 'report.read'});
  Permission.create({name: 'audit.read'});
  Permission.create({name: 'settings.email'});
  Permission.create({name: 'settings.other'});
  */
  // Create associations

  /*
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'orders.create'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'orders.read'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'orders.update'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'orders.delete'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'products.create'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'products.read'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'products.update'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'products.delete'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'categories.create'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'categories.delete'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'accounts.create'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'accounts.read'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'accounts.update'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'accounts.delete'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'roles.create'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'roles.read'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'roles.update'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'roles.delete'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'staff.create'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'staff.read'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'staff.update'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'staff.delete'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'report.read'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'audit.read'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'settings.other'}}).then(perm => {role.addPermission(perm);})});
  */

  // Staff.findOne({where: {username: 'dakata'}}).then(user => {Role.findOne({where: {name: 'Admin'}}).then(role => {user.addRole(role);})});

  // Make staff

  /*
  Staff.create({
    username: 'dakata',
    email: 'danielgudjenev@gmail.com',
    password: '123456789',
    firstName: 'Daniel',
    lastName: 'Gyudzhenev',
  });
  */

})();