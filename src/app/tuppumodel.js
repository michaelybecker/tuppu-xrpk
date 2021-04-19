import * as Croquet from "@croquet/croquet";

export default class TuppuModel extends Croquet.Model {
  init() {
    this.subscribe("tuppomodel", "update-text-model", this.updateText);
    this.subscribe("tuppomodel", "reposition", this.reposition);
    this.subscribe("tuppomodel", "reset-height", this.resetHeight);
    this.subscribe("tuppomodel", "update-text-font", this.updateTextFont);
    this.subscribe("tuppomodel", "update-text-size", this.updateTextSize);
    this.subscribe("tuppomodel", "change-focus", this.changeFocus);

    this.textString = "";
    this.fontArrIndex = 0;
    this.fontSize = 0.035;
    this.isFocused = true;
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

  changeFocus(isFocused) {
    this.isFocused = isFocused;
    this.publish("tuppoview", "change-focus", isFocused);
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
