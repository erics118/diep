import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import config from "@colyseus/tools";
import type { Server } from "colyseus";
import basicAuth from "express-basic-auth";

import path from "node:path";
/**
 * Import your Room files
 */
import { GameRoom } from "./rooms/GameRoom";

let gameServerRef: Server;

export default config({
  options: {
    devMode: process.env.NODE_ENV === "development",
  },

  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */
    gameServer.define("diep_room", GameRoom);

    //
    // keep gameServer reference, so we can
    // call `.simulateLatency()` later through an http route
    //
    gameServerRef = gameServer;
  },

  initializeExpress: (app) => {
    /**
     * Bind your custom express routes here:
     */
    app.get("/", (_req, res) => {
      res.sendFile(path.join(__dirname, "../public/index.html"));
    });

    const basicAuthMiddleware = basicAuth({
      // list of users and passwords
      users: {
        admin: "admin",
      },
      // sends WWW-Authenticate header, which will prompt the user to fill
      // credentials in
      challenge: true,
    });

    app.use("/colyseus", basicAuthMiddleware, monitor());

    app.use("/playground", playground);
  },

  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
  },
});
