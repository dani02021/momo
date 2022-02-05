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
User.prototype.ecomDelete = async function(varSave) 
{
  deleted = true;
  if (varSave) 
  {
    await this.save();
  }
};

User.prototype.authenticate = function(varPass) 
{
  return bcrypt.compareSync(varPass, this.password);
};

const Permission = db.define('permission', {
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  }
});

const Role = db.define("role", {
  name: {
    type: DataTypes.STRING(25),
    allowNull: false,
    unique: true
  }
});

Role.belongsToMany(Permission, {through: 'role_permissions'});
Permission.belongsToMany(Role, {through: 'role_permissions'});

Role.belongsToMany(User, {through: 'user_role'});
User.belongsToMany(Role, {through: 'user_role'});

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
  }
},
{
  paranoid: false,
  timestamp: false
});

Product.belongsTo(Category, {
  foreignKey: 'categoryId'
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

OrderItem.prototype.getTotal = function() {
  return this.getProduct().discountPrice * this.quantity;
};

const Order = db.define("order", {
  
});
    def __str__(self) -> str:
        return 'Order ID: ' + str(self.id)
    def get_items(self):
        return self.items.all()
    def get_items_count(self):
        return len(self.get_items())
    def get_total(self):
        return sum([item.get_total() for item in self.items.all()])
    def datetimeHTML(self):
        if self.ordered_at is None:
            return ''
        return self.ordered_at.strftime('%Y-%m-%dT%H:%M')
    def ecom_delete(self):
        self.deleted = True
        for item in self.items.all():
            item.ecom_delete()
        self.save()
    
    class OrderStatus(models.IntegerChoices):
        NOT_ORDERED = 0, _('Not Ordered')
        PENDING = 1, _('Pending')
        SHIPPED = 2, _('Shipped')
        REFUSED = 3, _('Refused')
        DECLINED = 4, _('Declined')
        COMPLETED = 5, _('Completed')
        NOT_PAYED = 6, _('Not Payed')
        PAYER_ACTION_REQUIRED = 7, _('Payer Action Required')

        # __empty__ = _('(Unknown)')
    
    id = models.BigAutoField(primary_key=True)
    items = models.ManyToManyField(OrderItem)
    user = models.ForeignKey(EcomUser, on_delete=models.DO_NOTHING)
    ordered_at = models.DateTimeField(blank=True, null=True)
    status = models.IntegerField(choices=OrderStatus.choices, default=OrderStatus.NOT_PAYED)
    transaction_id = models.ForeignKey(PayPalTransaction, on_delete=DO_NOTHING, null=True, blank=True) # Remove nullable, if there are no auto-generated orders
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    deleted = models.BooleanField(default=False)

function category() {
  return Category;
}

function product() {
  return Product;
}

function user() {
  return User;
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

module.exports.category = category;
module.exports.product = product;
module.exports.user = user;
module.exports.session = session;
module.exports.permission = permission;
module.exports.role = role;

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

    // User.findOne({where: {username: 'dakata2'}}).then(user => {Role.findOne({where: {name: 'Admin'}}).then(role => {user.addRole(role);})});
    
})();