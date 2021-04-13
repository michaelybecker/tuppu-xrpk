// default scene loaded in src/engine/engine.js
import * as Croquet from "@croquet/croquet";
import PMAEventHandler from "pluto-mae";

import { Text } from "troika-three-text";
import State from "./engine/state";

import { Scene, DirectionalLight, ShaderMaterial, Color } from "three";

const clearSans = require("./fonts/ClearSans/ClearSans-Regular.ttf");
const CURSOR_SPEED_MS = 500;

let isVisible = true;
State.currentText = "";

const scene = new Scene();

window.addEventListener("mousedown", e => {
  e.preventDefault();
});

const UTIL_KEYS = [
  "Shift",
  "Enter",
  "Alt",
  "Control",
  "Escape",
  "Meta",
  "Tab",
  "Volume",
  "AudioVolumeMute",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
];

const GradientMaterial = new ShaderMaterial({
  uniforms: {
    vlak3color1: { value: new Color("#31c7de") },
    vlak3color2: { value: new Color("#de3c31") },
  },
  vertexShader: `
 
    varying vec3 vUv; 

    void main() {
      vUv = position;    
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
     
   uniform vec3 vlak3color1;
    uniform vec3 vlak3color2;

 
    varying vec3 vUv;

    void main() {     
     
      gl_FragColor = vec4(mix(vlak3color1, vlak3color2, vUv.x+vUv.y), 1.0);
    }
`,
});

const light = new DirectionalLight(0xffffff, 3.5);
light.position.set(0, 13, 3);
scene.add(light);

const TextBox = new Text();
scene.add(TextBox);

// Set properties to configure:
const introText = `
tuppu: a simple, networked text editor
--------------------------------------
- Use your keyboard to enter text
- press both triggers to minimize / restore 
- Ctrl+V to paste
- Ctrl+C to copy all text
`;
TextBox.text = introText;
TextBox.font = clearSans;
TextBox.fontSize = 0.01;
TextBox.position.z = -0.25;
TextBox.text = introText;

// if gradient, color and outlinecolor don't take effect
// TextBox.material = GradientMaterial;

TextBox.color = 0x8925fa;
TextBox.outlineColor = 0xc825fa;
TextBox.outlineBlur = "10%";

TextBox.sync();

let cursorVisible = true;
// there *has* to be a less dumb blinking cursor implementation
setInterval(() => {
  if (cursorVisible == true) {
    TextBox.text += "_";
  } else {
    if (TextBox.text[TextBox.text.length - 1] == "_") {
      TextBox.text = TextBox.text.substring(0, TextBox.text.length - 1);
    }
  }

  cursorVisible = !cursorVisible;
}, CURSOR_SPEED_MS);

const UpdateText = e => {
  switch (e.keyCode) {
    case 8: // backspace
      if (State.currentText.length == 0) break;
      State.currentText = State.currentText.slice(0, -1);
      break;

    case 13: // return
      State.currentText += "\n";
      break;

    case 17: // ctrl
      State.ctrlDown = true;

    default:
      // A-Z, nums, etc
      if (UTIL_KEYS.includes(e.key)) {
        return;
      } else {
        if (State.ctrlDown) {
          if (e.keyCode == 67) {
            console.log("Text copied!");

            navigator.clipboard.writeText(State.currentText);
            navigator.clipboard.readText().then(clipText => {
              console.log(clipText);
            });
          } else if (e.keyCode == 86) {
            console.log("paste");
            navigator.clipboard
              .readText()
              .then(clipText => (State.currentText += clipText));
          }
        } else {
          State.currentText += e.key;
        }

        break;
      }
  }
};

window.addEventListener("keydown", e => {
  switch (e.key) {
    case "Enter":
      TextBox.anchorY = "70%";
      break;
    default:
      break;
  }
});

//Croquet

class TuppuModel extends Croquet.Model {
  init() {
    this.subscribe("tuppomodel", "update-text-model", this.updateText);
    this.subscribe("tuppomodel", "set-ownerid", this.setOwnerID);
    this.textString = "";
  }
  updateText(newString) {
    this.textString = newString;
    this.publish("tuppoview", "update-text-view", newString);
  }

  setOwnerID(viewID) {
    if (!this.ownerID) {
      this.ownerID = viewID;
      console.log(`setting viewID to ${viewID}`);
    } else {
      console.log(`ownerID exists: ${this.ownerID}`);
    }
  }
}

TuppuModel.register("TuppuModel");

class TuppuView extends Croquet.View {
  constructor(model) {
    super(model);
    this.sceneModel = model;

    this.initText();
    this.initOwnerID();

    this.subscribe("tuppoview", "update-text-view", this.handleUpdate);
    // countDisplay.onclick = event => this.onclick(event);
    // this.subscribe("counter", "update", this.handleUpdate);

    window.addEventListener("keydown", e => {
      UpdateText(e);
      this.publish("tuppomodel", "update-text-model", State.currentText);
    });
    window.addEventListener("keyup", e => {
      if (e.keyCode == 17) {
        // ctrl
        State.ctrlDown = false;
      }
    });
  }

  handleUpdate(newString) {
    TextBox.text = newString == "" ? introText : newString;
    TextBox.sync();
  }

  initOwnerID() {
    this.publish("tuppomodel", "set-ownerid", this.viewId);
  }
  initText() {
    if (this.sceneModel.textString != "") {
      this.handleUpdate(this.sceneModel.textString);
      State.currentText = this.sceneModel.textString;
    }
  }
}

const pmaEventHandler = new PMAEventHandler();
const xrpkAppId = pmaEventHandler.getAppState().appId;
const name = xrpkAppId ? xrpkAppId : "tupputuppuwritemynameyes";
Croquet.Session.join({
  appId: "com.plutovr.tuppu8",
  name: name,
  password: "secret",
  model: TuppuModel,
  view: TuppuView,
  autoSleep: false,
});

export { scene };
