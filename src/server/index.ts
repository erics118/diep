import { listen } from "@colyseus/tools";

// import arena config
import appConfig from "./app.config";

// listen on port 2567 or process.env.PORT
listen(appConfig);
