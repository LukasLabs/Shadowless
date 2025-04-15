const indexjs = require("../app.js");
const adminjs = require("./admin.js");
const fs = require("fs");
const ejs = require("ejs");
const log = require("../misc/log");

module.exports.load = async function (app, db) {
  app.get("/buy", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let newsettings = await enabledCheck(req, res);
    if (!newsettings) return;

    const { type, amount, id } = req.query;
    if (!type) return res.send("Missing type");

    // Handle bundle purchases
    if (type === "bundle") {
      if (!id) return res.send("Missing bundle ID");
      
      const bundle = newsettings.api.client.coins.store.bundles[id];
      if (!bundle) return res.send("Invalid bundle ID");

      const theme = indexjs.get(req);
      const failedCallbackPath = theme.settings.redirect.failedpurchasebundle || "/";

      const userCoins = (await db.get(`coins-${req.session.userinfo.id}`)) || 0;
      if (userCoins < bundle.cost) {
        return res.redirect(`${failedCallbackPath}?err=CANNOTAFFORD`);
      }

      // Update user coins
      const newUserCoins = userCoins - bundle.cost;
      if (newUserCoins === 0) {
        await db.delete(`coins-${req.session.userinfo.id}`);
      } else {
        await db.set(`coins-${req.session.userinfo.id}`, newUserCoins);
      }

      // Update user resources
      let extra = (await db.get(`extra-${req.session.userinfo.id}`)) || {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
      };

      extra.ram += bundle.resources.ram;
      extra.disk += bundle.resources.disk;
      extra.cpu += bundle.resources.cpu;
      extra.servers += bundle.resources.servers;

      await db.set(`extra-${req.session.userinfo.id}`, extra);
      adminjs.suspend(req.session.userinfo.id);

      log(
        `Bundle Purchased`,
        `${req.session.userinfo.username}#${req.session.userinfo.discriminator} bought the ${bundle.name} bundle for \`${bundle.cost}\` coins.`
      );

      res.redirect(
        (theme.settings.redirect.purchasebundle || "/") + "?err=none"
      );
      return;
    }

    // Handle individual resource purchases
    if (!amount) return res.send("Missing amount");

    const validTypes = ["ram", "disk", "cpu", "servers"];
    if (!validTypes.includes(type)) return res.send("Invalid type");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 1 || parsedAmount > 10)
      return res.send("Amount must be a number between 1 and 10");

    const theme = indexjs.get(req);
    const failedCallbackPath =
      theme.settings.redirect[`failedpurchase${type}`] || "/";

    const userCoins = (await db.get(`coins-${req.session.userinfo.id}`)) || 0;
    const resourceCap =
      (await db.get(`${type}-${req.session.userinfo.id}`)) || 0;

    const { per, cost } = newsettings.api.client.coins.store[type];
    const purchaseCost = cost * parsedAmount;

    if (userCoins < purchaseCost)
      return res.redirect(`${failedCallbackPath}?err=CANNOTAFFORD`);

    const newUserCoins = userCoins - purchaseCost;
    const newResourceCap = resourceCap + parsedAmount;
    const extraResource = per * parsedAmount;

    if (newUserCoins === 0) {
      await db.delete(`coins-${req.session.userinfo.id}`);
      await db.set(`${type}-${req.session.userinfo.id}`, newResourceCap);
    } else {
      await db.set(`coins-${req.session.userinfo.id}`, newUserCoins);
      await db.set(`${type}-${req.session.userinfo.id}`, newResourceCap);
    }

    let extra = (await db.get(`extra-${req.session.userinfo.id}`)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };

    extra[type] += extraResource;

    if (Object.values(extra).every((v) => v === 0)) {
      await db.delete(`extra-${req.session.userinfo.id}`);
    } else {
      await db.set(`extra-${req.session.userinfo.id}`, extra);
    }

    adminjs.suspend(req.session.userinfo.id);

    log(
      `Resources Purchased`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} bought ${extraResource} ${type} from the store for \`${purchaseCost}\` coins.`
    );

    res.redirect(
      (theme.settings.redirect[`purchase${type}`]
        ? theme.settings.redirect[`purchase${type}`]
        : "/") + "?err=none"
    );
  });

  async function enabledCheck(req, res) {
    const newsettings = JSON.parse(
      fs.readFileSync("./settings.json").toString()
    );
    if (newsettings.api.client.coins.store.enabled) return newsettings;

    const theme = indexjs.get(req);
    ejs.renderFile(
      `./views/${theme.settings.notfound}`,
      await eval(indexjs.renderdataeval),
      null,
      function (err, str) {
        delete req.session.newaccount;
        if (err) {
          console.log(
            `App ― An error has occurred on path ${req._parsedUrl.pathname}:`
          );
          console.log(err);
          return res.send(
            "An error has occurred while attempting to load this page. Please contact an administrator to fix this."
          );
        }
        res.status(200);
        res.send(str);
      }
    );
    return null;
  }
};
