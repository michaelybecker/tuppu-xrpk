import * as Croquet from "@croquet/croquet";

export default class TuppuModel extends Croquet.Model {
  init() {
    this.subscribe("tuppomodel", "update-text-model", this.updateText);
    this.subscribe("tuppomodel", "set-ownerid", this.setOwnerID);
    this.subscribe("tuppomodel", "reposition", this.reposition);
    this.subscribe("tuppomodel", "reset-height", this.resetHeight);
    this.subscribe("tuppomodel", "update-text-font", this.updateTextFont);
    this.subscribe("tuppomodel", "update-text-size", this.updateTextSize);

    this.textString = "";
    this.fontArrIndex = 0;
    this.fontSize = 0.035;
  }
  updateText(newString) {
    this.textString = newString;
    this.publish("tuppoview", "update-text-view", newString);
  }

  reposition(data) {
    this.posData = data;
    this.publish("tuppoview", "reposition", data);
  }

  resetHeight() {
    this.publish("tuppoview", "reset-height");
  }

  setOwnerID(viewID) {
    if (!this.ownerID) {
      this.ownerID = viewID;
      this.publish("tuppoview", "set-as-owner");
    } else {
      console.log(`tuppu: ownerID is: ${this.ownerID}`);
    }
  }

  updateTextFont(fontArrIndex) {
    this.fontArrIndex = fontArrIndex;
    this.publish("tuppoview", "update-text-font", fontArrIndex);
  }
  updateTextSize(fontSize) {
    this.fontSize = fontSize;
    this.publish("tuppoview", "update-text-size", fontSize);
  }
}
