const db = require("./db.js");
const { Sequelize, Model, DataTypes } = require("sequelize");

const User = db.define("user", {
    name: DataTypes.TEXT,
    favoriteColor: {
      type: DataTypes.TEXT,
      defaultValue: 'green'
    },
    age: DataTypes.INTEGER,
    cash: DataTypes.INTEGER
});

(async () => {
    // await db.sync({ force: true });
    const jane = await User.create({ name: "Yes" });
})();