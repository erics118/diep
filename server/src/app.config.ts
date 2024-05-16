import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import { Server } from "colyseus";
import basicAuth from "express-basic-auth";

/**
 * Import your Room files
 */
import { GameRoom } from "./rooms/GameRoom";
import path from "node:path";

let gameServerRef: Server;

export default config({
  options: {
    devMode: true,
  },

  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */
    gameServer.define('part4_room', GameRoom);

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
    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname , "../public/index.html"));
    });

    const basicAuthMiddleware = basicAuth({
      // list of users and passwords
      users: {
        "admin": "admin",
      },
      // sends WWW-Authenticate header, which will prompt the user to fill
      // credentials in
      challenge: true
    });

    app.use("/colyseus", basicAuthMiddleware, monitor());


    app.use("/playground", playground);
  },


  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
  }
});
