require('dotenv').config();

const Koa = require('koa');
const KoaRouter = require('koa-router');
const KoaBodyParser = require('koa-better-body');
const path = require('path');
const serve = require('koa-static');
const render = require("koa-ejs");
const utilsEcom = require("./utils.js");
const configEcom = require("./config.js");
const loggerEcom = require("./logger.js");
const session = require('koa-session');
const assert = require('assert/strict');
const ExcelJS = require('exceljs');
const favicon = require('koa-favicon');
const { PassThrough } = require("stream");
const { imageHash } = require('image-hash');
const { ClientException, NotEnoughQuantityException } = require('./exceptions.js');
var mv = require('mv');

const { Sequelize, ValidationError, ValidationErrorItem } = require("sequelize");

const models = require("./models.js");
const { parse, resolve } = require('path');
const { bind } = require('koa-route');
const { assert_isValidISODate, assert_notNull, assert_stringLength, assert_regex, assert_isSafeInteger, assert_isNonNegativeNumber, assert_isInteger, assert_isElementInArrayCaseInsensitive, assert_isDateAfter, assert_hasPermission } = require('./asserts.js');
const { AssertionError } = require('assert');
const Staff = models.staff();

const app = new Koa();
const router = new KoaRouter();

const routes = require("./routes.js");

app.keys = [process.env.COOKIE_SECRET];

// Link dispatch table
let linksTable = {
  get: {
    "/": { func: routes.index },
    "/products/:page?": { func: routes.products },
    "/my-account/orders/:page?": { func: routes.myAccount, requireUser: true },
    "/register": { func: routes.register },
    "/verify_account/:token": { func: routes.verifyAccount },
    "/logout": { func: routes.logout },
    "/product-detail/:id": { func: routes.productDetail },
    "/cart": { func: routes.cart },
    "/addToCart": { func: routes.addToCart },
    "/removeFromCart": { func: routes.removeFromCart },
    "/checkout": { func: routes.checkout },

    "/admin": { func: routes.admin, requireStaff: true, requireSession: true },
    "/admin/login": { func: routes.adminLogin },
    "/admin/logout": { func: routes.adminLogout },
    "/admin/products/:page?": { func: routes.adminProducts, requirePermission: {
      arg: "products.read",
      loggerMsg: "Tried to create a product without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/products/edit/:id": { func: routes.adminProductsEdit, requirePermission: {
      arg: "products.update",
      loggerMsg: "Tried to update a product without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/accounts/:page?": { func: routes.adminAccounts, requirePermission: {
      arg: "accounts.read",
      loggerMsg: "Tried to view accounts without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/staff/:page?": { func: routes.adminStaff, requirePermission: {
      arg: "staff.read",
      loggerMsg: "Tried to view staff without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/staff/edit/:id": { func: routes.adminStaffEdit, requirePermission: {
      arg: "staff.update",
      loggerMsg: "Tried to update staff without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/roles/:page?": { func: routes.adminRoles, requirePermission: {
      arg: "roles.read",
      loggerMsg: "Tried to view roles without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/roles/edit/:id": { func: routes.adminRolesEdit, requirePermission: {
      arg: "roles.update",
      loggerMsg: "Tried to update roles without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/orders/:page?": { func: routes.adminOrders, requirePermission: {
      arg: "orders.read",
      loggerMsg: "Tried to view orders without a permission"
    }, requireStaff: true, requireSession: true },
    //  "/admin/orders/edit": { func: routes.adminOrdersEdit, requirePermission: "orders.update", requireStaff: true, requireSession: true },
    "/admin/report/:page?": { func: routes.adminReport, requirePermission: {
      arg: "report.read",
      loggerMsg: "Tried to view report without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/export/report/pdf": { func: routes.adminExportReportPdf, requirePermission: {
      arg: "report.export",
      loggerMsg: "Tried to export report via pdf without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/export/report/excel": { func: routes.adminExportReportExcel, requirePermission: {
      arg: "report.export",
      loggerMsg: "Tried to export report via xlsx without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/export/report/csv": { func: routes.adminExportReportCsv, requirePermission: {
      arg: "report.export",
      loggerMsg: "Tried to export report via csv without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/audit/:page?": { func: routes.adminAudit, requirePermission: {
      arg: "audit.read",
      loggerMsg: "Tried to view audit without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/settings/email": { func: routes.adminSettingsEmail, requirePermission: {
      arg: "settings.email",
      loggerMsg: "Tried to view email settings without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/settings/other": { func: routes.adminSettingsOther, requirePermission: {
      arg: "settings.other",
      loggerMsg: "Tried to view settings without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/promotions/targetgroups/:page?": { func: routes.adminPromotionTargetGroups, requirePermission: {
      arg: "targetgroups.read",
      loggerMsg: "Tried to view target groups without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/promotions/targetgroup/add/:page?": { func: routes.adminPromotionTargetGroupsAdd, requirePermission: {
      arg: "targetgroups.create",
      loggerMsg: "Tried to create a target group without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/promotions/targetgroup/view/:id/:page?": { func: routes.adminPromotionTargetGroupsView, requirePermission: {
      arg: "targetgroups.view",
      loggerMsg: "Tried to view a target group without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/promotions/:page?": { func: routes.adminPromotions, requirePermission: {
      arg: "promotions.read",
      loggerMsg: "Tried to view promotions without a permission"
    }, requireStaff: true, requireSession: true },

    "/api/v0/permissions/get": { func: routes.apiPermissions, requireStaff: true, requireSession: true },
    "/api/v0/accounts/get": { func: routes.apiAccounts, requireStaff: true, requireSession: true },
    "/api/v0/products/get": { func: routes.apiProducts, requireStaff: true, requireSession: true },
  },
  post: {
    "/register": { func: routes.registerPost },
    "/login": { func: routes.login },
    "/captureOrder": { func: routes.captureOrder },
    "/admin/login": { func: routes.adminLoginPost },
    "/admin/products/add": { func: routes.adminProductsAdd, requirePermission: {
      arg: "products.create",
      loggerMsg: "Tried to create a product without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/products/edit/:id": { func: routes.adminProductsEditPost, requirePermission: {
      arg: "products.update",
      loggerMsg: "Tried to update a product without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/products/delete": { func: routes.adminProductsDelete, requirePermission: {
      arg: "products.delete",
      loggerMsg: "Tried to delete a product without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/accounts/add": { func: routes.adminAccountsAdd, requirePermission: {
      arg: "accounts.create",
      loggerMsg: "Tried to create an account without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/accounts/delete": { func: routes.adminAccountsDelete, requirePermission: {
      arg: "products.delete",
      loggerMsg: "Tried to delete an account without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/staff/add": { func: routes.adminStaffAdd, requirePermission: {
      arg: "staff.create",
      loggerMsg: "Tried to create a staff without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/staff/edit/:id": { func: routes.adminStaffEditPost, requirePermission: {
      arg: "staff.update",
      loggerMsg: "Tried to update a staff without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/staff/delete": { func: routes.adminStaffDelete, requirePermission: {
      arg: "staff.delete",
      loggerMsg: "Tried to delete a staff without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/categories/add": { func: routes.adminCategoriesAdd, requirePermission: {
      arg: "categories.create",
      loggerMsg: "Tried to create a category without a permission",
    }, requireStaff: true, requireSession: true },
    "/admin/categories/delete": { func: routes.adminCategoriesDelete, requirePermission: {
      arg: "categories.delete",
      loggerMsg: "Tried to delete a category without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/roles/add": { func: routes.adminRolesAdd, requirePermission: {
      arg: "roles.create",
      loggerMsg: "Tried to create a role without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/roles/edit/:id": { func: routes.adminRolesEditPost, requirePermission: {
      arg: "roles.update",
      loggerMsg: "Tried to update a role without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/roles/delete": { func: routes.adminRolesDelete, requirePermission: {
      arg: "roles.delete",
      loggerMsg: "Tried to delete a role without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/orders/add": { func: routes.adminOrdersAdd, requirePermission: {
      arg: "orders.create",
      loggerMsg: "Tried to create an order without a permission"
    }, requireStaff: true, requireSession: true },
    //  "/admin/orders/edit": { func: routes.adminOrdersEditPost, requirePermission: "orders.update", requireStaff: true, requireSession: true },
    "/admin/orders/delete": { func: routes.adminOrdersDelete, requirePermission: {
      arg: "orders.delete",
      loggerMsg: "Tried to delete an order without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/settings/email": { func: routes.adminSettingsEmailPost, requirePermission: {
      arg: "settings.email",
      loggerMsg: "Tried to change email templates without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/settings/other": { func: routes.adminSettingsOtherPost, requirePermission: {
      arg: "settings.other",
      loggerMsg: "Tried to change settings without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/promotions/targetgroup/add": { func: routes.adminPromotionTargetGroupsAddPost, requirePermission: {
      arg: "targetgroups.create",
      loggerMsg: "Tried to create a targetgroup without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/promotions/targetgroup/delete": { func: routes.adminPromotionTargetGroupsDelete, requirePermission: {
      arg: "targetgroups.delete",
      loggerMsg: "Tried to delete a targetgroup without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/promotion/add": { func: routes.adminPromotionsAdd, requirePermission: {
      arg: "promotions.create",
      loggerMsg: "Tried to create a promotion without a permission"
    }, requireStaff: true, requireSession: true },
    "/admin/promotion/delete": { func: routes.adminPromotionsDelete, requirePermission: {
      arg: "promotions.delete",
      loggerMsg: "Tried to delete a promotion without a permission"
    }, requireStaff: true, requireSession: true },

    "/admin/api/v0/products/import/xlsx": { func: routes.adminApiProductsImportXLSX, requirePermission: {
      arg: "products.import",
      loggerMsg: "Tried to import products without a permission"
    }, requireStaff: true, requireSession: true },
  }
}

// Import paths to router
// Gift from Angel
for (let method in linksTable) {
  switch (method) {
    case "get":
      for (let key in linksTable[method])
        router.get(key, linksTable[method][key].func);
      break;
    case "post":
      for (let key in linksTable[method])
        router.post(key, linksTable[method][key].func);
  }
}

// WARNING: HTTP/1 -> MAX 6 SSE for the browser!
// So if user try to upload 7 files silmuntaniously,
// the browser will reject it!

/* WARNING: 
   The session can be null at any request
   I don't fking know why, but check for empty session
   on each request
*/

app.use(session({
  store: utilsEcom.configPostgreSessions(),
  key: process.env.COOKIE_SECRET,
  maxAge: configEcom.SESSION_MAX_AGE,
  renew: true
}, app));

app.use(serve('./static'));

app.use(KoaBodyParser());
// app.use(bodyClean());

render(app, {
  root: path.join(__dirname, "templates"),
  layout: "base",
  viewExt: "html",
  debug: false,
  cache: true,
  async: true,
});

// Load Dispatch Table checks
app.use(async (ctx, next) => {
  let dispatchTableRoute;
  let path = router.opts.routerPath || ctx.routerPath || ctx.path;

  let routerMatch = router.match(path, ctx.method);
  let routerLayers = routerMatch.pathAndMethod;

  if (routerLayers.length) {
    let routerMostSpecificLayer = routerLayers[routerLayers.length - 1];

    if (routerMostSpecificLayer) {
      let routerPath = routerMostSpecificLayer.path;

      switch (ctx.method) {
        case "GET":
          dispatchTableRoute = linksTable.get[routerPath];
          break;
        case "POST":
          dispatchTableRoute = linksTable.post[routerPath];
          break;
      }

      if (dispatchTableRoute) {
        if (dispatchTableRoute.requireSession || dispatchTableRoute.permission)
          var staff = await Staff.findOne({ where: { username: ctx.session.dataValues.staffUsername } });

        // Require session
        if (dispatchTableRoute.requireSession) {
          if (!utilsEcom.isSessionValid(staff)) {
            utilsEcom.onSessionExpired(ctx);

            return;
          } else {
            await staff.update({
              lastActivity: Sequelize.fn("NOW")
            });
          }
        }

        // Require user
        if (dispatchTableRoute.requireUser) {
          if (!await utilsEcom.isAuthenticatedUser(ctx)) {
            utilsEcom.onNotAuthenticatedUser(ctx);
            return;
          }
        }

        // Require staff
        if (dispatchTableRoute.requireStaff) {
          if (!await utilsEcom.isAuthenticatedStaff(ctx)) {
            utilsEcom.onNotAuthenticatedStaff(ctx);
            return;
          }
        }

        // Require permission
        if (dispatchTableRoute.requirePermission) {
          let permissionObj = dispatchTableRoute.requirePermission;

          await assert_hasPermission(staff, ctx, {
            throwError: "client",
            permission: permissionObj.arg,
            message: `You don't have permission for this action!`,
            loggerMessage: permissionObj.loggerMsg
          });
        }
      }
    }
  }

  return await next();
});

app.use(router.routes()).use(router.allowedMethods());

app.use(favicon(__dirname + '/static/img/favicon.ico'));

// Global Unhandled Error Handler
app.on("error", (err, ctx) => {
  // On error, Koa replaces ctx.status and ctx.body based on err.status and err.message !
  err.expose = true;

  if (err.errors && err.errors[0] instanceof ValidationErrorItem) {
    var message = err.errors[0].message;
  } else {
    var message = err.message;
  }

  if (ctx.request.header.accept.includes("application/json")) {
    err.status = 200;

    err.message = JSON.stringify({ 'error': message });
  } else {
    // Redirect
    err.status = 302;

    // TODO: If ctx.path also throw error it will infinity be redirecting !
    err.headers = { 'Location': ctx.path };

    ctx.session.messages = { 'clientError': message };
  }

  loggerEcom.handleError(err, { ctx: ctx });
});

// app.listen(3210);

// Hack the system, set custom TZ for testing
process.env.TZ = 'America/Argentina/Buenos_Aires';

app.listen(process.env.PORT);