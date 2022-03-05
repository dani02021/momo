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
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verificationToken: {
    type: DataTypes.STRING
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
  lastLogin: {
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
    unique: true
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
    unique: true
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
  isStaff: {
    type: DataTypes.BOOLEAN
  },
},
  {
    paranoid: false,
    timestamp: false
  });

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
  }
},
  {
    paranoid: true,
    timestamp: true
  });

OrderItem.belongsTo(Product, {
  foreignKey: 'productId'
});

OrderItem.prototype.getTotal = async function () {
  let product = await this.getProduct();

  return parseFloat(product.discountPrice) * parseFloat(this.quantity);
};

const Order = db.define("order", {
  orderedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.SMALLINT,
    defaultValue: 0
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  }
},
{
  paranoid: false,
  timestamp: false
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

Order.prototype.getTotal = async function () {
  var total = 0.0;
  var orderitems = await this.getOrderitems();

  for(i = 0; i < orderitems.length; i++) 
  {
    total += parseFloat(await orderitems[i].getTotal());
  }
  
  return total;
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

module.exports = {
  category, product, user, staff, session, permission, role, order, orderitem, transaction,
  paypaltransacion, codtransaction
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