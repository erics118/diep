import path from "node:path";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import config from "@colyseus/tools";
import basicAuth from "express-basic-auth";
import { GameRoom } from "./rooms/GameRoom";

export default config({
  options: {
    devMode: process.env.NODE_ENV === "development",
  },

  initializeGameServer: (gameServer) => {
    gameServer.define("diep_room", GameRoom);
  },

  initializeExpress: (app) => {
    // custom express routes
    app.get("/", (_req, res) => {
      res.sendFile(path.join(__dirname, "../../public/server.html"));
    });

    const basicAuthMiddleware = basicAuth({
      // list of users and passwords
      users: {
        admin: "admin",
      },
      // send WWW-Authenticate header to prompt user to fill in credentials
      challenge: true,
    });

    app.use("/colyseus", basicAuthMiddleware, monitor());

    app.use("/playground", playground);
  },
});
