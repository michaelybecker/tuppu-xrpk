// TODO:
// proper caret?

import * as Croquet from "@croquet/croquet";
import PMAEventHandler from "pluto-mae";
import TuppuModel from "./tuppumodel";
import TuppuView from "./tuppuview";

const Tuppu = () => {
  const pmaEventHandler = new PMAEventHandler();
  const xrpkAppId = pmaEventHandler.getAppState().appId;
  const name = xrpkAppId ? xrpkAppId : "tuppuname";

  TuppuModel.register("TuppuModel");

  Croquet.Session.join({
    appId: "com.plutovr.tuppu1",
    name: name,
    password: "secret",
    model: TuppuModel,
    view: TuppuView,
    autoSleep: false,
  });
};
export default Tuppu;
