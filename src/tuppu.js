// TODO:
// Bump lines as networked event
// proper caret?

import * as Croquet from "@croquet/croquet";
import PMAEventHandler from "pluto-mae";

import { Text } from "troika-three-text";
import State from "./engine/state";
import Camera from "./engine/camera";
import {
  Scene,
  DirectionalLight,
  ShaderMaterial,
  Color,
  Object3D,
  Vector3,
  Quaternion,
} from "three";

const clearSans = require("./fonts/ClearSans/ClearSans-Regular.ttf");
const CURSOR_SPEED_MS = 500;

let isOwner;
State.currentText = "";
State.debugMode = false;

const scene = new Scene();

const frontAnchor = new Object3D();
frontAnchor.position.z -= 1;
setTimeout(() => {
  Camera.add(frontAnchor);
  Camera.position.z += 1;
}, 300);

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
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
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
- Ctrl+X to CUT all text
- Ctrl+C to COPY all text
- Ctrl+V to PASTE from clipboard
`;
TextBox.text = introText;
TextBox.font = clearSans;
TextBox.fontSize = 0.035;
TextBox.position.z = -0.25;
TextBox.text = introText;

// if gradient, color and outlinecolor don't take effect
TextBox.material = GradientMaterial;

TextBox.color = 0xffffff;
// TextBox.outlineColor = 0xc825fa;
TextBox.outlineColor = 0x8925fa;
TextBox.outlineBlur = "5%";

TextBox.maxWidth = 1;
TextBox.sync();

let cursorVisible = true;
// there *has* to be a less dumb blinking cursor implementation
setInterval(() => {
  if (cursorVisible == true) {
    TextBox.text += "|";
  } else {
    if (TextBox.text[TextBox.text.length - 1] == "|") {
      TextBox.text = TextBox.text.substring(0, TextBox.text.length - 1);
    }
  }

  cursorVisible = !cursorVisible;
}, CURSOR_SPEED_MS);

const ResetTextPos = () => {
  const tempCamVec = new Vector3();
  const tempFrontVec = new Vector3();
  const tempQuat = new Quaternion();
  const tempScale = new Vector3();
  const camProxy = new Object3D();

  frontAnchor.matrixWorld.decompose(tempFrontVec, tempQuat, tempScale);
  TextBox.position.copy(tempFrontVec);
  Camera.matrixWorld.decompose(tempCamVec, tempQuat, tempScale);
  camProxy.position.copy(tempCamVec);
  TextBox.lookAt(camProxy.position);
};

const UpdateText = e => {
  return new Promise(resolve => {
    switch (e.keyCode) {
      case 8: // backspace
        if (State.currentText.length == 0) break;
        State.currentText = State.currentText.slice(0, -1);
        resolve();
        break;

      case 13: // return
        State.currentText += "\n";
        TextBox.anchorY = "70%";
        resolve();
        break;

      case 17: // ctrl
        resolve();
        State.ctrlDown = true;

      default:
        // A-Z, nums, etc
        if (UTIL_KEYS.includes(e.key)) {
          resolve();
          return;
        } else {
          if (State.ctrlDown) {
            if (e.key == "c") {
              navigator.clipboard
                .writeText(State.currentText)
                .then(console.warn("tuppu: copied text"));
            } else if (e.key == "x") {
              navigator.clipboard.writeText(State.currentText);
              navigator.clipboard.readText().then(clipText => {
                State.currentText = "";
                console.warn("tuppu: cut text");
                resolve();
              });
            } else if (e.key == "v") {
              navigator.clipboard.readText().then(clipText => {
                State.currentText += clipText;
                console.warn("tuppu: paste complete");
                resolve();
              });
            }
          } else {
            State.currentText += e.key;
            resolve();
          }
          break;
        }
    }
  });
};

State.eventHandler.addEventListener("selectstart", e => {
  if (!isOwner) return;

  if (!State._dblClick) {
    State._dblClick = true;
    setTimeout(
      function () {
        State._dblClick = false;
      }.bind(this),
      300
    );
  } else {
    ResetTextPos();
    State._dblClick = false;
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
      this.publish("tuppoview", "set-as-owner");
    } else {
      console.log(`tuppu: ownerID is: ${this.ownerID}`);
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
    this.subscribe("tuppoview", "set-as-owner", this.setAsOwner);

    window.addEventListener("keydown", this.asyncUpdateText.bind(this));

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

  setAsOwner() {
    console.log(`tuppu: setting this instance as owner, ${this.viewId}`);
    isOwner = true;
  }

  async asyncUpdateText(e) {
    if (!isOwner) return; // only owner can write

    await UpdateText(e);
    this.publish("tuppomodel", "update-text-model", State.currentText);
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
  appId: "com.plutovr.tuppu12",
  name: name,
  password: "secret",
  model: TuppuModel,
  view: TuppuView,
  autoSleep: false,
});

export { scene };
