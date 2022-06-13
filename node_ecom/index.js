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
const { assert_isValidISODate, assert_notNull, assert_stringLength, assert_regex, assert_isSafeInteger, assert_isNonNegativeNumber, assert_isInteger, assert_isElementInArrayCaseInsensitive, assert_isDateAfter } = require('./asserts.js');
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
    "/admin/products/:page?": { func: routes.adminProducts, permission: "products.read", requireStaff: true, requireSession: true },
    "/admin/products/edit": { func: routes.adminProductsEdit, permission: "products.update", requireStaff: true, requireSession: true },
    "/admin/accounts/:page?": { func: routes.adminAccounts, permission: "accounts.read", requireStaff: true, requireSession: true },
    "/admin/staff/:page?": { func: routes.adminStaff, permission: "staff.read", requireStaff: true, requireSession: true },
    "/admin/staff/edit/:id": { func: routes.adminStaffEdit, permission: "staff.update", requireStaff: true, requireSession: true },
    "/admin/roles/:page?": { func: routes.adminRoles, permission: "roles.read", requireStaff: true, requireSession: true },
    "/admin/roles/edit/:id": { func: routes.adminRolesEdit, permission: "roles.update", requireStaff: true, requireSession: true },
    "/admin/orders/:page?": { func: routes.adminOrders, permission: "orders.read", requireStaff: true, requireSession: true },
//  "/admin/orders/edit": { func: routes.adminOrdersEdit, permission: "orders.update", requireStaff: true, requireSession: true },
    "/admin/report/:page?": { func: routes.adminReport, permission: "report.read", requireStaff: true, requireSession: true },
    "/admin/export/report/pdf": { func: routes.adminExportReportPdf, permission: "report.export", requireStaff: true, requireSession: true },
    "/admin/export/report/excel": { func: routes.adminExportReportExcel, permission: "report.export", requireStaff: true, requireSession: true },
    "/admin/export/report/csv": { func: routes.adminExportReportCsv, permission: "report.export", requireStaff: true, requireSession: true },
    "/admin/audit/:page?": { func: routes.adminAudit, permission: "audit.read", requireStaff: true, requireSession: true },
    "/admin/settings/email": { func: routes.adminSettingsEmail, permission: "settings.email", requireStaff: true, requireSession: true },
    "/admin/settings/other": { func: routes.adminSettingsOther, permission: "settings.other", requireStaff: true, requireSession: true },
    "/admin/promotions/targetgroups/:page?": { func: routes.adminPromotionTargetGroups, permission: "targetgroups.read", requireStaff: true, requireSession: true },
    "/admin/promotions/targetgroup/add/:page?": { func: routes.adminPromotionTargetGroupsAdd, permission: "targetgroups.create", requireStaff: true, requireSession: true },
    "/admin/promotions/targetgroup/view/:page?": { func: routes.adminPromotionTargetGroupsView, permission: "targetgroups.view", requireStaff: true, requireSession: true },
    "/admin/promotions/:page?": { func: routes.adminPromotions, permission: "promotions.read", requireStaff: true, requireSession: true },

    "/api/v0/permissions/get": { func: routes.apiPermissions, requireStaff: true, requireSession: true },
    "/api/v0/accounts/get": { func: routes.apiAccounts, requireStaff: true, requireSession: true },
    "/api/v0/products/get": { func: routes.apiProducts, requireStaff: true, requireSession: true },
  },
  post: {
    "/register": { func: routes.registerPost },
    "/login": { func: routes.login },
    "/captureOrder": { func: routes.captureOrder },

    "/admin/login": { func: routes.adminLoginPost },
    "/admin/products/add": { func: routes.adminProductsAdd, permission: "products.create", requireStaff: true, requireSession: true },
    "/admin/products/edit/:id": { func: routes.adminProductsEditPost, permission: "products.update", requireStaff: true, requireSession: true },
    "/admin/products/delete": { func: routes.adminProductsDelete, permission: "products.delete", requireStaff: true, requireSession: true },
    "/admin/accounts/add": { func: routes.adminAccountsAdd, permission: "accounts.create", requireStaff: true, requireSession: true },
    "/admin/accounts/delete": { func: routes.adminAccountsDelete, permission: "accounts.delete", requireStaff: true, requireSession: true },
    "/admin/staff/add": { func: routes.adminStaffAdd, permission: "staff.create", requireStaff: true, requireSession: true },
    "/admin/staff/edit/:id": { func: routes.adminStaffEditPost, permission: "staff.update", requireStaff: true, requireSession: true },
    "/admin/staff/delete": { func: routes.adminStaffDelete, permission: "staff.delete", requireStaff: true, requireSession: true },
    "/admin/categories/add": { func: routes.adminCategoriesAdd, permission: "categories.create", requireStaff: true, requireSession: true },
    "/admin/categories/delete": { func: routes.adminCategoriesDelete, permission: "categories.delete", requireStaff: true, requireSession: true },
    "/admin/roles/add": { func: routes.adminRolesAdd, permission: "roles.create", requireStaff: true, requireSession: true },
    "/admin/roles/edit/:id": { func: routes.adminRolesEditPost, permission: "roles.update", requireStaff: true, requireSession: true },
    "/admin/roles/delete": { func: routes.adminRolesDelete, permission: "roles.delete", requireStaff: true, requireSession: true },
    "/admin/orders/add": { func: routes.adminOrdersAdd, permission: "orders.create", requireStaff: true, requireSession: true },
//  "/admin/orders/edit": { func: routes.adminOrdersEditPost, permission: "orders.update", requireStaff: true, requireSession: true },
    "/admin/orders/delete": { func: routes.adminOrdersDelete, permission: "orders.delete", requireStaff: true, requireSession: true },
    "/admin/settings/email": { func: routes.adminSettingsEmailPost, permission: "settings.email", requireStaff: true, requireSession: true },
    "/admin/settings/other": { func: routes.adminSettingsOtherPost, permission: "settings.other", requireStaff: true, requireSession: true },
    "/admin/promotions/targetgroup/add": { func: routes.adminPromotionTargetGroupsAddPost, permission: "targetgroups.create", requireStaff: true, requireSession: true },
    "/admin/promotions/targetgroup/delete": { func: routes.adminPromotionsTargetgroupsDelete, permission: "targetgroups.delete", requireStaff: true, requireSession: true },
    "/admin/promotion/add": { func: routes.adminPromotionsAdd, permission: "promotions.create", requireStaff: true, requireSession: true },
    "/admin/promotion/delete": { func: routes.adminPromotionsDelete, permission: "promotions.delete", requireStaff: true, requireSession: true },

    "/admin/api/v0/products/import/xlsx": { func: routes.adminApiProductsImportXLSX, permission: "products.import", requireStaff: true, requireSession: true },
  }
}

// Import paths to router
// Gift from Angel
for (let method in linksTable) {
  switch (method) {
    case "get":
      for (let key in linksTable[method])
        if (linksTable[method][key].func) // DELETE WHEN EVERY FUNCTION IS OK
          router.get(key, linksTable[method][key].func);
      break;
    case "post":
      for (let key in linksTable[method])
        if (linksTable[method][key].func)
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

        // Require permission
        if (dispatchTableRoute.permission) {
          if (!await utilsEcom.hasPermission(staff, dispatchTableRoute.permission)) {
            utilsEcom.onNoPermission(ctx,
              "You don\'t have permission to see products",
              {
                level: "info",
                message: `Staff ${ctx.session.dataValues.staffUsername} tried to see products without rights`,
                options:
                {
                  user: ctx.session.dataValues.staffUsername,
                  isStaff: true
                }
              });
            return;
          }
        }

        console.log(dispatchTableRoute);
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

    // TODO: If ctx.path also throw error it will be infinity redirect !
    err.headers = { 'Location': ctx.path };

    ctx.session.messages = { 'clientError': message };
  }

  loggerEcom.handleError(err, { ctx: ctx });
});

// app.listen(3210);

// Hack the system, set custom TZ for testing
process.env.TZ = 'America/Argentina/Buenos_Aires';

app.listen(process.env.PORT);