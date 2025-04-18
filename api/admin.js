/**
 * |-| [- |_ | /\ ( ~|~ `/ |_
 *
 * Heliactyl 24.0.0
 *
 * This is for the admin side of Heliactyl.
 * @module admin
 */

const settings = require("../settings.json");
const fetch = require("node-fetch");

if (settings.pterodactyl)
  if (settings.pterodactyl.domain) {
    if (settings.pterodactyl.domain.slice(-1) == "/")
      settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
  }

const fs = require("fs");
const indexjs = require("../app.js");
const adminjs = require("./admin.js");
const ejs = require("ejs");
const log = require("../misc/log");

module.exports.load = async function (app, db) {
  app.get("/settings/update", async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
      return res.status(403).send("Unauthorized");
    }

    const setting = req.query.setting;
    const value = req.query.value;

    if (!setting || !value) {
      return res.status(400).send("Missing setting or value parameter");
    }

    try {
      const settingsPath = "./settings.json";
      const settings = JSON.parse(fs.readFileSync(settingsPath));

      const keys = setting.split(".");
      let currentObj = settings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!currentObj[keys[i]]) {
          currentObj[keys[i]] = {};
        }
        currentObj = currentObj[keys[i]];
      }
      currentObj[keys[keys.length - 1]] = value;

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      res.send("Settings updated successfully");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  });
  
  app.get("/setcoins", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetcoins || "/";

    let id = req.query.id;
    let coins = req.query.coins;

    if (!id) return res.redirect(failredirect + "?err=MISSINGID");
    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    if (!coins) return res.redirect(failredirect + "?err=MISSINGCOINS");

    coins = parseFloat(coins);

    if (isNaN(coins))
      return res.redirect(failredirect + "?err=INVALIDCOINNUMBER");

    if (coins < 0 || coins > 999999999999999)
      return res.redirect(`${failredirect}?err=COINSIZE`);

    if (coins == 0) {
      await db.delete("coins-" + id);
    } else {
      await db.set("coins-" + id, coins);
    }

    let successredirect = theme.settings.redirect.setcoins || "/";
    log(
      `set coins`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} set the coins of the user with the ID \`${id}\` to \`${coins}\`.`
    );
    res.redirect(successredirect + "?err=none");
  });

  app.get("/addcoins", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetcoins || "/";

    let id = req.query.id;
    let coins = req.query.coins;

    if (!id) return res.redirect(failredirect + "?err=MISSINGID");
    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    if (!coins) return res.redirect(failredirect + "?err=MISSINGCOINS");

    let currentcoins = (await db.get("coins-" + id)) || 0;

    coins = currentcoins + parseFloat(coins);

    if (isNaN(coins))
      return res.redirect(failredirect + "?err=INVALIDCOINNUMBER");

    if (coins < 0 || coins > 999999999999999)
      return res.redirect(`${failredirect}?err=COINSIZE`);

    if (coins == 0) {
      await db.delete("coins-" + id);
    } else {
      await db.set("coins-" + id, coins);
    }

    let successredirect = theme.settings.redirect.setcoins || "/";
    log(
      `add coins`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} added \`${req.query.coins}\` coins to the user with the ID \`${id}\`'s account.`
    );
    res.redirect(successredirect + "?err=none");
  });

  app.get("/setresources", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetresources || "/";

    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    let successredirect = theme.settings.redirect.setresources || "/";

    if (req.query.ram || req.query.disk || req.query.cpu || req.query.servers) {
      let ramstring = req.query.ram;
      let diskstring = req.query.disk;
      let cpustring = req.query.cpu;
      let serversstring = req.query.servers;
      let id = req.query.id;

      let currentextra = await db.get("extra-" + req.query.id);
      let extra;

      if (typeof currentextra == "object") {
        extra = currentextra;
      } else {
        extra = {
          ram: 0,
          disk: 0,
          cpu: 0,
          servers: 0,
        };
      }

      if (ramstring) {
        let ram = parseFloat(ramstring);
        if (ram < 0 || ram > 999999999999999) {
          return res.redirect(`${failredirect}?err=RAMSIZE`);
        }
        extra.ram = ram;
      }

      if (diskstring) {
        let disk = parseFloat(diskstring);
        if (disk < 0 || disk > 999999999999999) {
          return res.redirect(`${failredirect}?err=DISKSIZE`);
        }
        extra.disk = disk;
      }

      if (cpustring) {
        let cpu = parseFloat(cpustring);
        if (cpu < 0 || cpu > 999999999999999) {
          return res.redirect(`${failredirect}?err=CPUSIZE`);
        }
        extra.cpu = cpu;
      }

      if (serversstring) {
        let servers = parseFloat(serversstring);
        if (servers < 0 || servers > 999999999999999) {
          return res.redirect(`${failredirect}?err=SERVERSIZE`);
        }
        extra.servers = servers;
      }

      if (
        extra.ram == 0 &&
        extra.disk == 0 &&
        extra.cpu == 0 &&
        extra.servers == 0
      ) {
        await db.delete("extra-" + req.query.id);
      } else {
        await db.set("extra-" + req.query.id, extra);
      }

      adminjs.suspend(req.query.id);

      log(
        `set resources`,
        `${req.session.userinfo.username}#${req.session.userinfo.discriminator} set the resources of the user with the ID \`${id}\` to:\`\`\`servers: ${serversstring}\nCPU: ${cpustring}%\nMemory: ${ramstring} MB\nDisk: ${diskstring} MB\`\`\``
      );
      return res.redirect(successredirect + "?err=none");
    } else {
      res.redirect(`${failredirect}?err=MISSINGVARIABLES`);
    }
  });

  app.get("/addresources", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetresources
      ? theme.settings.redirect.failedsetresources
      : "/";

    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    let successredirect = theme.settings.redirect.setresources
      ? theme.settings.redirect.setresources
      : "/";

    if (req.query.ram || req.query.disk || req.query.cpu || req.query.servers) {
      let ramstring = req.query.ram;
      let diskstring = req.query.disk;
      let cpustring = req.query.cpu;
      let serversstring = req.query.servers;

      let currentextra = await db.get("extra-" + req.query.id);
      let extra;

      if (typeof currentextra == "object") {
        extra = currentextra;
      } else {
        extra = {
          ram: 0,
          disk: 0,
          cpu: 0,
          servers: 0,
        };
      }

      if (ramstring) {
        let ram = parseFloat(ramstring);
        if (ram < 0 || ram > 999999999999999) {
          return res.redirect(`${failredirect}?err=RAMSIZE`);
        }
        extra.ram = extra.ram + ram;
      }

      if (diskstring) {
        let disk = parseFloat(diskstring);
        if (disk < 0 || disk > 999999999999999) {
          return res.redirect(`${failredirect}?err=DISKSIZE`);
        }
        extra.disk = extra.disk + disk;
      }

      if (cpustring) {
        let cpu = parseFloat(cpustring);
        if (cpu < 0 || cpu > 999999999999999) {
          return res.redirect(`${failredirect}?err=CPUSIZE`);
        }
        extra.cpu = extra.cpu + cpu;
      }

      if (serversstring) {
        let servers = parseFloat(serversstring);
        if (servers < 0 || servers > 999999999999999) {
          return res.redirect(`${failredirect}?err=SERVERSIZE`);
        }
        extra.servers = extra.servers + servers;
      }

      if (
        extra.ram == 0 &&
        extra.disk == 0 &&
        extra.cpu == 0 &&
        extra.servers == 0
      ) {
        await db.delete("extra-" + req.query.id);
      } else {
        await db.set("extra-" + req.query.id, extra);
      }

      adminjs.suspend(req.query.id);
      return res.redirect(successredirect + "?err=none");
    } else {
      res.redirect(`${failredirect}?err=MISSINGVARIABLES`);
    }
  });

  app.get("/setplan", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetplan || "/";

    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    let successredirect = theme.settings.redirect.setplan || "/";

    if (!req.query.package) {
      await db.delete("package-" + req.query.id);
      adminjs.suspend(req.query.id);

      log(
        `set plan`,
        `${req.session.userinfo.username}#${req.session.userinfo.discriminator} removed the plan of the user with the ID \`${req.query.id}\`.`
      );
      return res.redirect(successredirect + "?err=none");
    } else {
      let newsettings = JSON.parse(
        fs.readFileSync("./settings.json").toString()
      );
      if (!newsettings.api.client.packages.list[req.query.package])
        return res.redirect(`${failredirect}?err=INVALIDPACKAGE`);
      await db.set("package-" + req.query.id, req.query.package);
      adminjs.suspend(req.query.id);

      log(
        `set plan`,
        `${req.session.userinfo.username}#${req.session.userinfo.discriminator} set the plan of the user with the ID \`${req.query.id}\` to \`${req.query.package}\`.`
      );
      return res.redirect(successredirect + "?err=none");
    }
  });

  app.get("/create_coupon", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let code = req.query.code
      ? req.query.code.slice(0, 200)
      : Math.random().toString(36).substring(2, 15);

    if (!code.match(/^[a-z0-9]+$/i))
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONINVALIDCHARACTERS"
      );

    let coins = req.query.coins || 0;
    let ram = req.query.ram * 1024 || 0;
    let disk = req.query.disk * 1024 || 0;
    let cpu = req.query.cpu * 100 || 0;
    let servers = req.query.servers || 0;

    coins = parseFloat(coins);
    ram = parseFloat(ram);
    disk = parseFloat(disk);
    cpu = parseFloat(cpu);
    servers = parseFloat(servers);

    if (coins < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (ram < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (disk < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (cpu < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );
    if (servers < 0)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed +
          "?err=CREATECOUPONLESSTHANONE"
      );

    if (!coins && !ram && !disk && !cpu && !servers)
      return res.redirect(
        theme.settings.redirect.couponcreationfailed + "?err=CREATECOUPONEMPTY"
      );

    await db.set("coupon-" + code, {
      coins: coins,
      ram: ram,
      disk: disk,
      cpu: cpu,
      servers: servers,
    });

    log(
      `create coupon`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} created the coupon code \`${code}\` which gives:\`\`\`coins: ${coins}\nMemory: ${ram} MB\nDisk: ${disk} MB\nCPU: ${cpu}%\nServers: ${servers}\`\`\``
    );
    res.redirect(
      theme.settings.redirect.couponcreationsuccess + "?code=" + code
    );
  });

  app.get("/revoke_coupon", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let code = req.query.code;

    if (!code.match(/^[a-z0-9]+$/i))
      return res.redirect(
        theme.settings.redirect.couponrevokefailed +
          "?err=REVOKECOUPONCANNOTFINDCODE"
      );

    if (!(await db.get("coupon-" + code)))
      return res.redirect(
        theme.settings.redirect.couponrevokefailed +
          "?err=REVOKECOUPONCANNOTFINDCODE"
      );

    await db.delete("coupon-" + code);

    log(
      `revoke coupon`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} revoked the coupon code \`${code}\`.`
    );
    res.redirect(
      theme.settings.redirect.couponrevokesuccess + "?revokedcode=true"
    );
  });

  app.get("/remove_account", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    // This doesn't delete the account and doesn't touch the renewal system.

    if (!req.query.id)
      return res.redirect(
        theme.settings.redirect.removeaccountfailed +
          "?err=REMOVEACCOUNTMISSINGID"
      );

    let discordid = req.query.id;
    let pteroid = await db.get("users-" + discordid);

    // Remove IP.

    let selected_ip = await db.get("ip-" + discordid);

    if (selected_ip) {
      let allips = (await db.get("ips")) || [];
      allips = allips.filter((ip) => ip !== selected_ip);

      if (allips.length == 0) {
        await db.delete("ips");
      } else {
        await db.set("ips", allips);
      }

      await db.delete("ip-" + discordid);
    }

    // Remove user.

    let userids = (await db.get("users")) || [];
    userids = userids.filter((user) => user !== pteroid);

    if (userids.length == 0) {
      await db.delete("users");
    } else {
      await db.set("users", userids);
    }

    await db.delete("users-" + discordid);

    // Remove coins/resources.

    await db.delete("coins-" + discordid);
    await db.delete("extra-" + discordid);
    await db.delete("package-" + discordid);

    log(
      `remove account`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} removed the account with the ID \`${discordid}\`.`
    );
    res.redirect(
      theme.settings.redirect.removeaccountsuccess + "?success=REMOVEACCOUNT"
    );
  });

  app.get("/getip", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedgetip || "/";
    let successredirect = theme.settings.redirect.getip || "/";
    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id)))
      return res.redirect(`${failredirect}?err=INVALIDID`);

    if (!(await db.get("ip-" + req.query.id)))
      return res.redirect(`${failredirect}?err=NOIP`);
    let ip = await db.get("ip-" + req.query.id);
    log(
      `view ip`,
      `${req.session.userinfo.username}#${req.session.userinfo.discriminator} viewed the IP of the account with the ID \`${req.query.id}\`.`
    );
    return res.redirect(successredirect + "?err=NONE&ip=" + ip);
  });

  app.get("/userinfo", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    if (!req.query.id) return res.send({ status: "missing id" });

    if (!(await db.get("users-" + req.query.id)))
      return res.send({ status: "invalid id" });

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());

    if (newsettings.api.client.oauth2.link.slice(-1) == "/")
      newsettings.api.client.oauth2.link =
        newsettings.api.client.oauth2.link.slice(0, -1);

    if (newsettings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
      newsettings.api.client.oauth2.callbackpath =
        "/" + newsettings.api.client.oauth2.callbackpath;

    if (newsettings.pterodactyl.domain.slice(-1) == "/")
      newsettings.pterodactyl.domain = newsettings.pterodactyl.domain.slice(
        0,
        -1
      );

    let packagename = await db.get("package-" + req.query.id);
    let package =
      newsettings.api.client.packages.list[
        packagename ? packagename : newsettings.api.client.packages.default
      ];
    if (!package)
      package = {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0,
      };

    package["name"] = packagename;

    let pterodactylid = await db.get("users-" + req.query.id);
    let userinforeq = await fetch(
      newsettings.pterodactyl.domain +
        "/api/application/users/" +
        pterodactylid +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newsettings.pterodactyl.key}`,
        },
      }
    );
    if ((await userinforeq.statusText) == "Not Found") {
      console.log(
        "App ― An error has occured while attempting to get a user's information"
      );
      console.log("- Discord ID: " + req.query.id);
      console.log("- Pterodactyl Panel ID: " + pterodactylid);
      return res.send({ status: "could not find user on panel" });
    }
    let userinfo = await userinforeq.json();

    res.send({
      status: "success",
      package: package,
      extra: (await db.get("extra-" + req.query.id))
        ? await db.get("extra-" + req.query.id)
        : {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0,
          },
      userinfo: userinfo,
      coins:
        newsettings.api.client.coins.enabled == true
          ? (await db.get("coins-" + req.query.id))
            ? await db.get("coins-" + req.query.id)
            : 0
          : null,
    });
  });

  // Get user by Discord ID
  app.get("/api/admin/users", async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const discordId = req.query.discordId;
    if (!discordId) {
      return res.status(400).json({ error: "Discord ID is required" });
    }

    try {
      const user = await db.get("discord-" + discordId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = await db.get("users-" + user);
      if (!userData) {
        return res.status(404).json({ error: "User data not found" });
      }

      res.json([{
        id: user,
        discordId: discordId,
        username: userData.username,
        avatar: userData.avatar,
        ram: userData.ram || 0,
        cpu: userData.cpu || 0,
        disk: userData.disk || 0,
        servers: userData.servers || 0,
        coins: (await db.get("coins-" + user)) || 0
      }]);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user resources
  app.post("/api/admin/users/:userId/resources", async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const userId = req.params.userId;
    const { ram, cpu, disk, servers, coins } = req.body;

    if (!userId || !ram || !cpu || !disk || !servers || coins === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const userData = await db.get("users-" + userId);
      if (!userData) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user resources
      userData.ram = parseInt(ram);
      userData.cpu = parseInt(cpu);
      userData.disk = parseInt(disk);
      userData.servers = parseInt(servers);
      await db.set("users-" + userId, userData);

      // Update coins separately
      await db.set("coins-" + userId, parseInt(coins));

      log(
        `update resources`,
        `${req.session.userinfo.username}#${req.session.userinfo.discriminator} updated resources for user ${userId}: RAM=${ram}, CPU=${cpu}, Disk=${disk}, Servers=${servers}, Coins=${coins}`
      );

      res.json({ success: true, message: "Resources updated successfully" });
    } catch (error) {
      console.error("Error updating resources:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Resources page route
  app.get("/admin/resources", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let renderData = {
      req: req,
      settings: settings,
      userinfo: req.session.userinfo,
      pterodactyl: req.session.pterodactyl,
      extra: {},
      db: db
    };

    try {
      res.render("admin/resources", renderData);
    } catch (error) {
      console.error("Error rendering resources page:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.get("/api/admin/users/all", async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      console.log("Fetching users from Pterodactyl...");
      const response = await fetch(
        `${settings.pterodactyl.domain}/api/application/users?include=servers`,
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Pterodactyl API error:", await response.text());
        throw new Error("Failed to fetch users from Pterodactyl");
      }

      const data = await response.json();
      console.log(`Found ${data.data.length} users in Pterodactyl`);
      
      // Get all users from our database
      console.log("Fetching users from database...");
      const dbUsers = await db.get("users") || [];
      console.log(`Found ${dbUsers.length} users in database`);

      // Transform the data to include Discord IDs and coins
      const users = await Promise.all(data.data.map(async (user) => {
        try {
          const pteroId = user.attributes.id;
          const discordId = user.attributes.external_id;
          
          // Get user's resources from our database
          const userData = await db.get("users-" + pteroId) || {
            ram: 0,
            cpu: 0,
            disk: 0,
            servers: 0
          };
          
          // Get user's coins
          const coins = await db.get("coins-" + pteroId) || 0;

          // Get user's extra resources if they exist
          const extra = await db.get("extra-" + pteroId) || {
            ram: 0,
            cpu: 0,
            disk: 0,
            servers: 0
          };

          return {
            id: pteroId,
            discordId: discordId,
            username: user.attributes.username,
            avatar: user.attributes.avatar,
            ram: (userData.ram || 0) + (extra.ram || 0),
            cpu: (userData.cpu || 0) + (extra.cpu || 0),
            disk: (userData.disk || 0) + (extra.disk || 0),
            servers: (userData.servers || 0) + (extra.servers || 0),
            coins: coins
          };
        } catch (error) {
          console.error(`Error processing user ${user.attributes.id}:`, error);
          return null;
        }
      }));

      // Filter out any null entries from failed processing
      const validUsers = users.filter(user => user !== null);
      console.log(`Successfully processed ${validUsers.length} users`);

      res.json(validUsers);
    } catch (error) {
      console.error("Error in /api/admin/users/all:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  app.get("/admin/edituser", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        (await db.get("users-" + req.session.userinfo.id)) +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true)
      return four0four(req, res, theme);

    let id = req.query.id;
    if (!id) return res.redirect("/admin?err=MISSINGID");

    let userCoins = (await db.get("coins-" + id)) || 0;
    let userExtra = (await db.get("extra-" + id)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };

    // If this is a POST request (form submission)
    if (Object.keys(req.query).length > 1) {
      let coins = req.query.coins;
      let ram = req.query.ram;
      let disk = req.query.disk;
      let cpu = req.query.cpu;
      let servers = req.query.servers;

      // Validate coins
      if (coins !== undefined) {
        coins = parseFloat(coins);
        if (isNaN(coins)) {
          return res.redirect(`/admin/edituser?id=${id}&err=INVALIDCOINNUMBER`);
        }
        if (coins < 0 || coins > 999999999999999) {
          return res.redirect(`/admin/edituser?id=${id}&err=COINSIZE`);
        }
        if (coins == 0) {
          await db.delete("coins-" + id);
        } else {
          await db.set("coins-" + id, coins);
        }
      }

      // Update extra resources
      let newExtra = {
        ram: parseInt(ram) || 0,
        disk: parseInt(disk) || 0,
        cpu: parseInt(cpu) || 0,
        servers: parseInt(servers) || 0,
      };

      await db.set("extra-" + id, newExtra);

      log(
        `edit user`,
        `${req.session.userinfo.username}#${req.session.userinfo.discriminator} edited the user with ID \`${id}\` with the following changes:\n\`\`\`Coins: ${coins}\nExtra RAM: ${newExtra.ram}MB\nExtra Disk: ${newExtra.disk}MB\nExtra CPU: ${newExtra.cpu}%\nExtra Servers: ${newExtra.servers}\`\`\``
      );

      return res.redirect(`/admin/edituser?id=${id}&err=none`);
    }

    // Render the edit page
    res.render("admin/edituser", {
      settings: settings,
      req: req,
      userCoins: userCoins,
      userExtra: userExtra,
    });
  });

  async function four0four(req, res, theme) {
    ejs.renderFile(
      `./views/${theme.settings.notfound}`,
      await eval(indexjs.renderdataeval),
      null,
      function (err, str) {
        delete req.session.newaccount;
        if (err) {
          console.log(
            `App ― An error has occured on path ${req._parsedUrl.pathname}:`
          );
          console.log(err);
          return res.send("Internal Server Error");
        }
        res.status(404);
        res.send(str);
      }
    );
  }

  module.exports.suspend = async function (discordid) {
    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.overresourcessuspend !== true) return;

    let canpass = await indexjs.islimited();
    if (canpass == false) {
      setTimeout(async function () {
        adminjs.suspend(discordid);
      }, 1);
      return;
    }

    indexjs.ratelimits(1);
    let pterodactylid = await db.get("users-" + discordid);
    let userinforeq = await fetch(
      settings.pterodactyl.domain +
        "/api/application/users/" +
        pterodactylid +
        "?include=servers",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await userinforeq.statusText) == "Not Found") {
      console.log(
        "App ― An error has occured while attempting to check if a user's server should be suspended."
      );
      console.log("- Discord ID: " + discordid);
      console.log("- Pterodactyl Panel ID: " + pterodactylid);
      return;
    }
    let userinfo = JSON.parse(await userinforeq.text());

    let packagename = await db.get("package-" + discordid);
    let package =
      newsettings.api.client.packages.list[
        packagename || newsettings.api.client.packages.default
      ];

    let extra = (await db.get("extra-" + discordid)) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };

    let plan = {
      ram: package.ram + extra.ram,
      disk: package.disk + extra.disk,
      cpu: package.cpu + extra.cpu,
      servers: package.servers + extra.servers,
    };

    let current = {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: userinfo.attributes.relationships.servers.data.length,
    };
    for (
      let i = 0, len = userinfo.attributes.relationships.servers.data.length;
      i < len;
      i++
    ) {
      current.ram =
        current.ram +
        userinfo.attributes.relationships.servers.data[i].attributes.limits
          .memory;
      current.disk =
        current.disk +
        userinfo.attributes.relationships.servers.data[i].attributes.limits
          .disk;
      current.cpu =
        current.cpu +
        userinfo.attributes.relationships.servers.data[i].attributes.limits.cpu;
    }

    indexjs.ratelimits(userinfo.attributes.relationships.servers.data.length);
    if (
      current.ram > plan.ram ||
      current.disk > plan.disk ||
      current.cpu > plan.cpu ||
      current.servers > plan.servers
    ) {
      for (
        let i = 0, len = userinfo.attributes.relationships.servers.data.length;
        i < len;
        i++
      ) {
        let suspendid =
          userinfo.attributes.relationships.servers.data[i].attributes.id;
        await fetch(
          settings.pterodactyl.domain +
            "/api/application/servers/" +
            suspendid +
            "/suspend",
          {
            method: "post",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${settings.pterodactyl.key}`,
            },
          }
        );
      }
    } else {
      if (settings.api.client.allow.renewsuspendsystem.enabled == true) return;
      for (
        let i = 0, len = userinfo.attributes.relationships.servers.data.length;
        i < len;
        i++
      ) {
        let suspendid =
          userinfo.attributes.relationships.servers.data[i].attributes.id;
        await fetch(
          settings.pterodactyl.domain +
            "/api/application/servers/" +
            suspendid +
            "/unsuspend",
          {
            method: "post",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${settings.pterodactyl.key}`,
            },
          }
        );
      }
    }
  };
};