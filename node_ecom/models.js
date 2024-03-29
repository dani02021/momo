const {
  Sequelize, Model, DataTypes, ValidationError, STRING,
} = require('sequelize');
const bcrypt = require('bcrypt');
const assert = require('assert/strict');
const { AssertionError } = require('assert');
const configEcom = require('./config');
const db = require('./db');

const Settings = db.define(
  'settings',
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: false,
    paranoid: false,
  },
);

const Log = db.define(
  'log',
  {
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
    user: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: '',
      validate: {
        len: {
          args: [0, 50],
          msg: 'Username must be within range [0-50]',
        },
      },
    },
    level: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      validate: {
        stringTruncate() {
          Object.keys(this._changed).forEach((element) => {
            const temp = Object.getPrototypeOf(this).rawAttributes[element];
            if (Object.getPrototypeOf(Object.getPrototypeOf(temp.type)).key === 'STRING') {
              if (this[element]) {
                if (this[element].length > temp.type._length) {
                  this[element] = this[element].substring(0, temp.type._length);
                }
              }
            }
          });
        },
      },
    },
    longMessage: {
      type: DataTypes.STRING(3096),
      allowNull: true,
      validate: {
        stringTruncate() {
          Object.keys(this._changed).forEach((element) => {
            const temp = Object.getPrototypeOf(this).rawAttributes[element];
            if (Object.getPrototypeOf(Object.getPrototypeOf(temp.type)).key === 'STRING') {
              if (this[element]) {
                if (this[element].length > temp.type._length) {
                  this[element] = this[element].substring(0, temp.type._length);
                }
              }
            }
          });
        },
      },
    },
    isStaff: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      default: false
    },
  },
  {
    paranoid: true,
    timestamps: false,
  },
);

const User = db.define(
  'user',
  {
    username: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      validate: {
        is: {
          args: /^([a-zA-Z0-9]{4,14})$/i,
          msg: 'Username must contains only Latin symbols or numbers and should be of size 4-14',
        },
        notNull: {
          msg: 'Username cannot be null!',
        },
      },
    },
    email: {
      type: DataTypes.STRING(100),
      unique: {
        msg: 'This email already exists!',
      },
      allowNull: false,
      validate: {
        isEmail: {
          msg: 'Email is not in valid format!',
        },
        len: {
          args: [1, 50],
          msg: 'Email length must be within range [1-50]',
        },
        notNull: {
          msg: 'Email cannot be null!',
        },
      },
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        is: {
          args: /^[a-zA-Zа-яА-Я]{2,50}$/i,
          msg: 'First name should contain only latin or cyrillic symbols with length 2-50',
        },
        notNull: {
          msg: 'First name cannot be null!',
        },
      },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        is: {
          args: /^[a-zA-Zа-яА-Я]{2,50}$/i,
          msg: 'Last name should contain only latin or cyrillic symbols with length 2-50',
        },
        notNull: {
          msg: 'Last name cannot be null!',
        },
      },
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
      set(pass) {
        if (!pass) {
          throw new ValidationError('Password is invalid!');
        }

        if (/^(?=.*[0-9])(?=.*[a-zA-Z])(?!.*\s).{8,32}$/i.exec(pass) == null) {
          throw new ValidationError('Password must contain a digit and a character, with size 8-32!');
        }

        const hash = bcrypt.hashSync(pass, configEcom.DEFAULT_SALT_ROUNDS);
        this.setDataValue('password', hash);
      },
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [0, 200],
          msg: 'Address length must be within range [0-200]',
        },
      },
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          args: true,
          msg: 'Country name cannot be empty!',
        },
        len: {
          args: [1, 200],
          msg: 'Country name length must be within range [1-200]!',
        },
        notNull: {
          msg: 'County cannot be null!',
        },
      },
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [1, 100],
          msg: 'Gender length must be within range [1-100]',
        },
        notNull: {
          msg: 'Gender cannot be null!',
        },
        isIn: {
          args: [configEcom.VALID_GENDERS],
          msg: 'Gender is not valid!',
        },
      },
    },
    birthday: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Birthday cannot be null!',
        },

        isOldEnough(value) {
          const today = new Date();
          const birthDate = new Date(value);
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age -= 1;
          }

          if (age < 18) { throw new AssertionError('You have to be at least 18 years old!'); }

          if (age > 120) { throw new AssertionError('Invalid age!'); }
        },
      },
    },
    emailConfirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    timestamp: true,
  },
);

// Add custom methods
User.prototype.authenticate = function (varPass) {
  return bcrypt.compareSync(varPass, this.password);
};

const Staff = db.define(
  'staff',
  {
    username: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      validate: {
        is: {
          args: /^([a-zA-Z0-9]{4,14})$/i,
          msg: 'Username must contains only Latin symbols or numbers and should be of size 4-14',
        },
        notNull: {
          msg: 'Username cannot be null!',
        },
      },
    },
    email: {
      type: DataTypes.STRING(50),
      unique: {
        msg: 'This email already exists!',
      },
      allowNull: true,
      validate: {
        isEmail: {
          msg: 'Email is not in valid format!',
        },
      },
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      is: {
        args: /^[a-zA-Zа-яА-Я]{2,50}$/i,
        msg: 'First name should contain only latin or cyrillic symbols with length 2-50',
      },
      notNull: {
        msg: 'First name cannot be null!',
      },
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      is: {
        args: /^[a-zA-Zа-яА-Я]{2,50}$/i,
        msg: 'Last name should contain only latin or cyrillic symbols with length 2-50',
      },
      notNull: {
        msg: 'Last name cannot be null!',
      },
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
      set(pass) {
        if (!pass) {
          throw new ValidationError('Password is invalid!');
        }

        if (/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{7,32}$/i.exec(pass) == null) {
          throw new ValidationError('Password must contain at least 1 digit, 1 uppercase and 1 lowercase character, with size 7-32');
        }

        const salt = bcrypt.genSaltSync(5);
        const hash = bcrypt.hashSync(pass, salt, 5);
        this.setDataValue('password', hash);
      },
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastActivity: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    timestamp: true,
  },
);

// Add custom methods
Staff.prototype.authenticate = function (varPass) {
  return bcrypt.compareSync(varPass, this.password);
};

const Permission = db.define(
  'permission',
  {
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: {
          args: [1, 50],
          msg: 'Permission length must be within range [1-50]',
        },
      },
    },
  },
  {
    paranoid: true,
    timestamp: true,
  },
);

const Role = db.define(
  'role',
  {
    name: {
      type: DataTypes.STRING(25),
      allowNull: false,
      unique: {
        msg: 'Role name must be unique',
      },
      validate: {
        len: {
          args: [1, 25],
          msg: 'Role name length must be within range [1-25]',
        },
      },
    },
  },
  {
    paranoid: true,
    timestamp: true,
  },
);

Role.belongsToMany(Permission, { through: 'role_permissions' });
Permission.belongsToMany(Role, { through: 'role_permissions' });

Role.belongsToMany(Staff, { through: 'staff_role' });
Staff.belongsToMany(Role, { through: 'staff_role' });

const Category = db.define(
  'category',
  {
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    imageCss: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    paranoid: true,
    timestamp: true,
  },
);

const Product = db.define(
  'product',
  {
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: {
        msg: 'Product name must be unique!',
      },
      validate: {
        len: {
          args: [3, 255],
          msg: 'Product name length must be within range [3-255]',
        },
      },
    },
    price: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: false,
    },
    discountPrice: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: false,
      validate: {
        min: {
          args: 0.01,
          msg: 'Price must be minimum 0.01',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING(600),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Product's quantity must not be null",
        },
        isInt: {
          msg: "Product's quantity must be integer",
        },
      },
    },
    hide: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    paranoid: true,
    timestamp: true,
  },
);

const Session = db.define(
  'session',
  {
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    maxAge: {
      type: DataTypes.INTEGER,
      validate: {
        isInt: {
          msg: "Session's max age must be integer",
        },
      },
    },
    expire: {
      type: DataTypes.DATE,
    },
    messages: {
      type: DataTypes.JSONB,
    },
    username: {
      type: DataTypes.STRING(50),
    },
    staffUsername: {
      type: DataTypes.STRING(50),
    },
  },
  {
    paranoid: false,
    timestamp: false,
  },
);

const TargetGroupFilters = db.define(
  'targetgroup_filters',
  {
    filter: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    paranoid: true,
    timestamp: false,
  },
);

const TargetGroup = db.define(
  'targetgroup',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'Target group name must be unique',
      },
      validate: {
        notNull: {
          msg: 'Target group name should not be empty',
        },
      },
    },
  },
  {
    paranoid: true,
    timestamp: false,
  },
);

TargetGroupFilters.belongsTo(TargetGroup);

TargetGroup.hasMany(TargetGroupFilters);

TargetGroup.belongsToMany(User, { through: 'targetgroup_users', allowNull: false, timestamps: false });
User.belongsToMany(TargetGroup, { through: 'targetgroup_users', allowNull: false, timestamps: false });

const Promotion = db.define('promotion', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'Promotion name must be unique',
    },
    validate: {
      notNull: {
        msg: "Promotion's name is required",
      },
      len: {
        args: [3, 100],
        msg: "Promotion's name must be within range [3 - 100]",
      },
    },
  },
  status: {
    // type: DataTypes.ENUM('pending', 'active', 'expired'), -> SEQUELIZE BUG
    type: DataTypes.SMALLINT,
    allowNull: false,
    defaultValue: 0,
    validate: {
      notNull: {
        msg: 'Promotion status should not be empty',
      },
      isIn: {
        args: [Array.from(Array(configEcom.PROMOTION_STATUSES.length).keys())],
        msg: 'Promotion status is invalid',
      },
      isInt: {
        msg: 'Status is invalid',
      },
    },
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: Sequelize.fn('NOW'),
    validate: {
      notNull: {
        msg: 'Promotion start date should not be empty',
      },
    },
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Promotion end date should not be empty',
      },
    },
  },
}, {
  paranoid: true,
});

const Voucher = db.define('voucher', {
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Voucher end date should not be empty',
      },
    },
  },
  value: {
    type: DataTypes.DECIMAL(7, 2),
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Voucher value should not be empty',
      },
      min: {
        args: 0.01,
        msg: "Voucher's price must be a non-negative number",
      },
    },
  },
}, {
  paranoid: true,
});

const UserVoucher = db.define('user_voucher', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: {
        notNull: {
          msg: "User's voucher token cannot be null!",
        },
      },
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  paranoid: true,
  timestamps: false,
});

const UserVoucherStatus = db.define('user_voucher_status', {
  name: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: {
      notNull: {
        msg: "User's voucher status name cannot be null!",
      },
    },
  },
}, {
  paranoid: false,
  timestamps: false,
});

UserVoucher.belongsTo(UserVoucherStatus, {foreignKey: {name: "status"}});

User.belongsToMany(Voucher, { through: UserVoucher });
Voucher.belongsToMany(User, { through: UserVoucher });

Promotion.hasOne(Voucher);
Voucher.belongsTo(Promotion);

Promotion.belongsTo(TargetGroup);
TargetGroup.hasOne(Promotion);

Promotion.prototype.getTotalValue = async function () {
  return parseFloat(await this.getTotalValueStr());
};

Promotion.prototype.getTotalValueStr = async function () {
  return (await db.query(
    `SELECT
      COUNT("userId") * vouchers.value AS total
    FROM promotions
    INNER JOIN targetgroups ON
      "targetgroupId" = targetgroups.id
    INNER JOIN targetgroup_users ON
      targetgroup_users."targetgroupId" = targetgroups.id
    INNER JOIN vouchers ON
      "promotionId" = promotions.id
    WHERE "promotionId" = ${this.id}
    GROUP BY vouchers.value`,
    {
      type: 'SELECT',
      plain: true,
    },
  )).total;
};

Product.prototype.getPriceWithVAT = async function () {
  return parseFloat(await this.getPriceWithVATStr());
};

Product.prototype.getPriceWithVATStr = async function () {
  return (await db.query(
    `SELECT
      ROUND(price * ( 1 + ${configEcom.SETTINGS.vat} ), 2) AS total
    FROM products
    WHERE id = ${this.id}
      AND "deletedAt" is NULL
      AND hide = false`,
    {
      type: 'SELECT',
      plain: true,
    },
  )).total;
};

Product.prototype.getDiscountPriceWithVAT = async function () {
  return parseFloat(await this.getDiscountPriceWithVATStr());
};

Product.prototype.getDiscountPriceWithVATStr = async function () {
  return (await db.query(
    `SELECT
      ROUND("discountPrice" * ( 1 + ${configEcom.SETTINGS.vat} ), 2) AS total
    FROM products
    WHERE id = ${this.id}
      AND "deletedAt" is NULL
      AND hide = false`,
    {
      type: 'SELECT',
      plain: true,
    },
  )).total;
};

Product.belongsTo(Category, {
  foreignKey: 'categoryId',
});

const Transaction = db.define(
  'transacion',
  {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'paypal',
    },
  },
  {
    paranoid: false,
    timestamp: false,
  },
);

const PayPalTransaction = db.define(
  'paypaltransacion',
  {
    transactionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    emailAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    grossAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    paypalFee: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
    },
  },
  {
    paranoid: false,
    timestamp: false,
  },
);

// Cash On Delivery
const CODTransaction = db.define(
  'codtransaction',
  {},
  {
    paranoid: false,
    timestamp: false,
  },
);

const OrderItem = db.define(
  'orderitem',
  {
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        isInt: {
          msg: "Order's product quantity must be integer",
        },
      },
    },
    price: {
      type: DataTypes.DECIMAL(7, 2),
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    paranoid: true,
    timestamp: true,
  },
);

OrderItem.belongsTo(Product, {
  foreignKey: 'productId',
  allowNull: false,
});

OrderItem.prototype.getTotal = async function () {
  return parseFloat(await this.getTotalStr());
};

OrderItem.prototype.getTotalStr = async function () {
  if (this.price !== 0) {
    return (await db.query(
      `SELECT
       ROUND(price * quantity, 2) AS total
     FROM orderitems
     WHERE orderitems.id = ${this.id}
       AND orderitems."deletedAt" is NULL`,
      {
        type: 'SELECT',
        plain: true,
      },
    )).total;
  }

  const product = await this.getProduct();

  assert(product);

  return (await db.query(
    `SELECT
      ROUND("discountPrice" * orderitems.quantity, 2) AS total
    FROM products, orderitems
    WHERE products.id = ${product.id}
      AND orderitems.id = ${this.id}
      AND products.id = orderitems."productId"
      AND orderitems."deletedAt" is NULL
      AND products."deletedAt" is NULL
      AND hide = false`,
    {
      type: 'SELECT',
      plain: true,
    },
  )).total;
};

OrderItem.prototype.getTotalWithVAT = async function () {
  return parseFloat(await this.getTotalWithVATStr());
};

OrderItem.prototype.getTotalWithVATStr = async function () {
  if (this.price != 0) {
    return (await db.query(
      `SELECT
        calculate_vat(price * quantity,
          ${configEcom.SETTINGS.vat}) AS total
      FROM orderitems
      WHERE orderitems.id = ${this.id}
        AND "deletedAt" is NULL`,
      {
        type: 'SELECT',
        plain: true,
      },
    )).total;
  }

  const product = await this.getProduct();

  assert(product);

  return (await db.query(
    `SELECT
      calculate_vat("discountPrice" * orderitems.quantity,
        ${configEcom.SETTINGS.vat}) AS total
    FROM products, orderitems
    WHERE products.id = ${product.id}
      AND orderitems.id = ${this.id}
      AND products.id = orderitems."productId"
      AND orderitems."deletedAt" is NULL
      AND products."deletedAt" is NULL
      AND hide = false`,
    {
      type: 'SELECT',
      plain: true,
    },
  )).total;
};

const Order = db.define(
  'order',
  {
    orderedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Order's status cannot be null",
        },
      },
      defaultValue: 0,
    },
  },
  {
    paranoid: true,
    timestamp: true,
  },
);

Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order);

Order.belongsTo(User, {
  foreignKey: 'userId',
  allowNull: false,
});

Order.prototype.getItems = function () {
  return this.getOrderItems();
};

Order.prototype.getItemsCount = function () {
  return this.getOrderItems().length;
};

/* Order.prototype.getTotal = async function () {
  var total = 0.0;
  var orderitems = await this.getOrderitems();

  assert(orderitems);

  for(i = 0; i < orderitems.length; i++)
  {
    total += parseFloat(await orderitems[i].getTotal());
  }

  return total;
} */

Order.prototype.getTotal = async function () {
  return parseFloat(await this.getTotalStr());
};

Order.prototype.getTotalStr = async function () {
  // Big possibility for a bug
  // If Order is not complete
  // calculate by current product
  // prices, if the order is ocmplete
  // calculate by it's orderitems
  // prices

  // If not ordered
  if (this.status == 0) {
    return (await db.query(
      `SELECT
        COALESCE( ROUND( SUM(orderitems.quantity *
          products."discountPrice" ), 2), 0.00 ) AS total
      FROM orders
      INNER JOIN orderitems ON orders.id = orderitems."orderId"
      INNER JOIN products ON orderitems."productId" = products.id
      WHERE orders.id = ${this.id}
        AND orderitems."deletedAt" is NULL
        AND orders."deletedAt" is NULL;`,
      {
        type: 'SELECT',
        plain: true,
      },
    )).total;
  }

  return (await db.query(
    `SELECT
      COALESCE(ROUND( SUM( orderitems.quantity *
        orderitems.price ), 2), 0.00 ) AS total
    FROM orders
    INNER JOIN orderitems ON orders.id = orderitems."orderId"
    WHERE orders.id = ${this.id}
      AND orderitems."deletedAt" is NULL
      AND orders."deletedAt" is NULL;`,
    {
      type: 'SELECT',
      plain: true,
    },
  )).total;
};

Order.prototype.getTotalWithVAT = async function () {
  return parseFloat(await this.getTotalWithVATStr());
};

Order.prototype.getTotalWithVATStr = async function () {
  // Big possibility for a bug
  // If Order is not complete
  // calculate by current product
  // prices, if the order is ocmplete
  // calculate by it's orderitems
  // prices

  // If not ordered
  if (this.status == 0) {
    return (await db.query(
      `SELECT
        COALESCE( SUM( ROUND( orderitems.quantity * products."discountPrice" *
          ( 1 + ${configEcom.SETTINGS.vat} ), 2 )), 0.00) AS total
      FROM orders
      INNER JOIN orderitems ON orders.id = orderitems."orderId"
      INNER JOIN products ON orderitems."productId" = products.id
      WHERE orders.id = ${this.id}
        AND orderitems."deletedAt" is NULL
        AND orders."deletedAt" is NULL;`,
      {
        type: 'SELECT',
        plain: true,
      },
    )).total;
  }

  return (await db.query(
    `SELECT
      COALESCE( SUM( ROUND( orderitems.quantity * orderitems.price *
         ( 1 + ${configEcom.SETTINGS.vat} ), 2 )), 0.00) AS total
    FROM orders
    INNER JOIN orderitems ON orders.id = orderitems."orderId"
    WHERE orders.id = ${this.id}
      AND orderitems."deletedAt" is NULL
      AND orders."deletedAt" is NULL;`,
    {
      type: 'SELECT',
      plain: true,
    },
  )).total;
};

Order.prototype.getVouchers = async function () {
  return parseFloat(await this.getVouchersStr());
}

Order.prototype.getVouchersStr = async function () {
  // If not ordered
  // Not supported
  if (this.status == 0)
    throw new AssertionError("Operation not supported!");

  return (await db.query(
    `SELECT
        SUM("voucherValue")     AS total
      FROM orders
      INNER JOIN (
        SELECT orders.id, COALESCE(SUM(value), 0.00)    AS "voucherValue"
        FROM orders
        LEFT JOIN order_vouchers                        ON order_vouchers."orderId" = orders.id
          LEFT JOIN user_vouchers                       ON user_vouchers.id = order_vouchers."userVoucherId" LEFT JOIN vouchers                          ON user_vouchers."voucherId" = vouchers.id
        GROUP BY orders.id
      ) ord_vch               ON orders.id = ord_vch.id
      WHERE orders.id = ${this.id}
        AND orders."deletedAt" is NULL;`,
    {
      type: 'SELECT',
      plain: true,
    },
  )).total;
};

Order.prototype.getTotalWithVATWithVouchers = async function () {
  return parseFloat(await this.getTotalWithVATWithVouchersStr());
}

Order.prototype.getTotalWithVATWithVouchersStr = async function () {
  // If not ordered
  // Not supported
  if (this.status == 0)
    throw new AssertionError("Operation not supported!");

  return (await db.query(
    `SELECT
        GREATEST( SUM( ROUND( ( orderitems.quantity * orderitems.price *
          ( 1 + ${configEcom.SETTINGS.vat}) ) - "voucherValue", 2 )), 0.00) AS total
    FROM orders
      INNER JOIN (
        SELECT orders.id, COALESCE(SUM(value), 0.00)    AS "voucherValue"
        FROM orders
        LEFT JOIN order_vouchers                        ON order_vouchers."orderId" = orders.id
          LEFT JOIN user_vouchers                       ON user_vouchers.id = order_vouchers."userVoucherId" LEFT JOIN vouchers                          ON user_vouchers."voucherId" = vouchers.id
        GROUP BY orders.id
      ) ord_vch               ON orders.id = ord_vch.id
      INNER JOIN orderitems   ON orderitems."orderId" = orders.id
      WHERE orders.id = ${this.id}
        AND orderitems."deletedAt" is NULL
        AND orders."deletedAt" is NULL;`,
    {
      type: 'SELECT',
      plain: true,
    },
  )).total;
};

Order.prototype.orderedAtHTML = function () {
  return this.orderedAt.toISOString().substring(0, 19);
};

Order.prototype.getVATSum = async function () {
  return parseFloat(this.getVATSumStr());
};

Order.prototype.getVATSumStr = async function () {
  if (this.status == 0) {
    return (await db.query(
      `SELECT
          COALESCE( SUM( ROUND(
            products."discountPrice" * orderitems.quantity *
            ${configEcom.SETTINGS.vat}, 2)), 0.00) AS total
        FROM orderitems
        INNER JOIN orders ON orders.id = orderitems."orderId"
        INNER JOIN products ON orderitems."productId" = products.id
        WHERE orders.id = ${this.id}
          AND orders."deletedAt" is NULL
          AND orderitems."deletedAt" is NULL`,
      {
        type: 'SELECT',
        plain: true,
      },
    )).total;
  }

  return (await db.query(
    `SELECT
        COALESCE( SUM( ROUND( orderitems.price * orderitems.quantity *
          ${configEcom.SETTINGS.vat}, 2)), 0.00) AS total
      FROM orderitems
      INNER JOIN orders ON orders.id = orderitems."orderId"
      WHERE orders.id = ${this.id}
        AND orders."deletedAt" is NULL
        AND orderitems."deletedAt" is NULL`,
    {
      type: 'SELECT',
      plain: true,
    },
  )).total;
};

Order.hasOne(Transaction, { foreignKey: { name: 'orderid' } });
Transaction.belongsTo(Order, { foreignKey: { name: 'orderid' } });

UserVoucher.belongsToMany(Order, { through: 'order_vouchers', allowNull: false, timestamps: false });
Order.belongsToMany(UserVoucher, { through: 'order_vouchers', allowNull: false, timestamps: false });

Transaction.hasOne(PayPalTransaction, { foreignKey: { name: 'transactionid' } });
PayPalTransaction.belongsTo(Transaction, { foreignKey: { name: 'transactionid' } });

Transaction.hasOne(CODTransaction, { foreignKey: { name: 'transactionid' } });
CODTransaction.belongsTo(Transaction, { foreignKey: { name: 'transactionid' } });

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

function targetgroups() {
  return TargetGroup;
}

function targetgroupfilters() {
  return TargetGroupFilters;
}

function promotions() {
  return Promotion;
}

function vouchers() {
  return Voucher;
}

function uservouchers() {
  return UserVoucher;
}

module.exports = {
  category,
  product,
  user,
  staff,
  session,
  permission,
  role,
  order,
  orderitem,
  transaction,
  paypaltransacion,
  codtransaction,
  log,
  settings,
  targetgroups,
  targetgroupfilters,
  promotions,
  vouchers,
  uservouchers,
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

  const permissions = [
    'orders.create',
    'orders.read',
    'orders.update',
    'orders.delete',
    'products.create',
    'products.read',
    'products.update',
    'products.delete',
    'categories.create',
    'categories.delete',
    'account.create',
    'account.read',
    'account.update',
    'account.delete',
    'roles.create',
    'roles.read',
    'roles.update',
    'roles.delete',
    'staff.create',
    'staff.read',
    'staff.update',
    'staff.delete',
    'reports.read',
    'audit.read',
    'settings.email',
    'settings.other',
    'targetgroups.create',
    'targetgroups.read',
    'targetgroups.update',
    'targetgroups.view',
    'targetgroups.delete',
    'promotions.create',
    'promotions.read',
    'promotions.update',
    'promotions.delete',
  ];

  // for (let i = 0; i < permissions.length; i++) {
  //   Permission.findOrCreate({ where: { name: permissions[i] } }).then(perm => {
  //     Role.findOne({ where: { name: 'Admin' } }).then(role => {
  //       role.addPermission(perm[0]);
  //     })
  //   });
  // };

  // Create statuses
  let voucher_statuses = [
    "Not sent",
    "Not activated",
    "Activated",
    "Used"
  ];

  for (let i = 0; i < voucher_statuses.length; i++) {
    UserVoucherStatus.findOrCreate({where: {name: voucher_statuses[i]}});
  }

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
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'targetgroups.read'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'targetgroups.create'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'targetgroups.view'}}).then(perm => {role.addPermission(perm);})});
  Role.findOne({where: {name: 'Admin'}}).then(role => {Permission.findOne({where: {name: 'targetgroups.delete'}}).then(perm => {role.addPermission(perm);})});
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
