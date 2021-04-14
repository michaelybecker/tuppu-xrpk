// TODO:
// proper caret?

import * as Croquet from "@croquet/croquet";
import PMAEventHandler from "pluto-mae";

import TuppuModel from "./tuppumodel";
import TuppuView from "./tuppuview";

const Tuppu = () => {
  TuppuModel.register("TuppuModel");

  const pmaEventHandler = new PMAEventHandler();
  const xrpkAppId = pmaEventHandler.getAppState().appId;
  const name = xrpkAppId ? xrpkAppId : "tupputuppuwritemynameyes";
  console.log(`name is: ${name}`);

  Croquet.Session.join({
    appId: "com.plutovr.tuppu2",
    name: name,
    password: "secret",
    model: TuppuModel,
    view: TuppuView,
    autoSleep: false,
  });
};

export default Tuppu;
