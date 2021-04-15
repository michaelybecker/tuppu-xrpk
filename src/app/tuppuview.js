import * as Croquet from "@croquet/croquet";
import {
  Object3D,
  Vector3,
  Quaternion,
  Scene,
  ShaderMaterial,
  Color,
  Matrix4,
  DoubleSide,
} from "three";
import { Text } from "troika-three-text";
import Camera from "../engine/camera";
import { loadScene } from "../engine/engine";
import State from "../engine/state";

const clearSans = require("../fonts/ClearSans/ClearSans-Regular.ttf");
const CedarvilleCursive = require("../fonts/CedarvilleCursive-Regular.ttf");
const Gruppo = require("../fonts/Gruppo-Regular.ttf");
const MerriweatherItalic = require("../fonts/Merriweather-Italic.ttf");
const MerriweatherLight = require("../fonts/Merriweather-Light.ttf");
const Parisienne = require("../fonts/Parisienne-Regular.ttf");
const PirataOne = require("../fonts/PirataOne-Regular.ttf");
const PoiretOne = require("../fonts/PoiretOne-Regular.ttf");
const PressStart2P = require("../fonts/PressStart2P-Regular.ttf");
const Quicksand = require("../fonts/Quicksand-VariableFont_wght.ttf");
const RobotoMono = require("../fonts/RobotoMono-Italic-VariableFont_wght.ttf");
const Sail = require("../fonts/Sail-Regular.ttf");
const SpecialElite = require("../fonts/SpecialElite-Regular.ttf");
const ZenDots = require("../fonts/ZenDots-Regular.ttf");
const ZillaSlabHighlightBold = require("../fonts/ZillaSlabHighlight-Bold.ttf");
const ZillaSlabHighlight = require("../fonts/ZillaSlabHighlight-Regular.ttf");

const fontArr = [
  clearSans,
  CedarvilleCursive,
  Gruppo,
  MerriweatherItalic,
  MerriweatherLight,
  Parisienne,
  PirataOne,
  PoiretOne,
  PressStart2P,
  Quicksand,
  RobotoMono,
  Sail,
  SpecialElite,
  ZenDots,
  ZillaSlabHighlight,
  ZillaSlabHighlightBold,
];
State.fontArrIndex = 0;
State.fontSize = 0.035;
State.currentText = "";

State.isOwner = false;
State.debugMode = false;

const CURSOR_SPEED_MS = 500;
const INTRO_TEXT = `
tuppu: a simple, networked text editor
--------------------------------------
- hit both triggers to RESET editor position 
- Ctrl+left/right arrow keys to CHANGE FONT
- Ctrl+up/down arrow keys to CHANGE SIZE
- Ctrl+X to CLEAR all text
- Ctrl+C to COPY all textew
- Ctrl+V to PASTE from clipboard
`;

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
GradientMaterial.side = DoubleSide;
export default class TuppuView extends Croquet.View {
  constructor(model) {
    super(model);

    this.scene = new Scene();
    loadScene(this.scene);
    this.sceneModel = model;

    this.frontAnchor = new Object3D();
    this.frontAnchor.position.z -= 1;
    setTimeout(() => {
      Camera.add(this.frontAnchor);
      Camera.position.z += 1;
    }, 300);
    this.camProxy = new Object3D();

    this.initOwnerID();
    this.createTextbox();
    this.syncState();
    this.initInputs();

    this.subscribe("tuppoview", "update-text-view", this.handleUpdate);
    this.subscribe("tuppoview", "set-as-owner", this.setAsOwner);
    this.subscribe("tuppoview", "reposition", this.reposition);
    this.subscribe("tuppoview", "reset-height", this.resetHeight);
    this.subscribe("tuppoview", "update-text-font", this.updateTextFont);
    this.subscribe("tuppoview", "update-text-size", this.updateTextSize);
  }

  resetHeight() {
    this.TextBox.anchorY = "70%";
  }
  createTextbox() {
    this.TextBox = new Text();
    this.scene.add(this.TextBox);
    this.TextBox.text = INTRO_TEXT;
    this.TextBox.font = fontArr[State.fontArrIndex];
    this.TextBox.fontSize = State.fontSize;
    this.TextBox.position.z = -0.25;
    this.TextBox.curveRadius = 0.75;

    // if gradient, color and outlinecolor don't take effect
    this.TextBox.material = GradientMaterial;

    this.TextBox.color = 0xffffff;
    // this.TextBox.outlineColor = 0xc825fa;
    this.TextBox.outlineColor = 0x8925fa;
    this.TextBox.outlineBlur = "5%";

    this.TextBox.maxWidth = 1;
    this.TextBox.sync();

    let cursorVisible = true;
    // there *has* to be a less dumb blinking cursor implementation
    setInterval(() => {
      if (cursorVisible == true) {
        this.TextBox.text += "|";
      } else {
        if (this.TextBox.text[this.TextBox.text.length - 1] == "|") {
          this.TextBox.text = this.TextBox.text.substring(
            0,
            this.TextBox.text.length - 1
          );
        }
      }
      cursorVisible = !cursorVisible;
    }, CURSOR_SPEED_MS);
  }
  handleUpdate(newString) {
    this.TextBox.text = newString == "" ? INTRO_TEXT : newString;
    this.TextBox.sync();
  }

  setAsOwner() {
    console.log(`tuppu: setting this instance as owner, ${this.viewId}`);
    State.isOwner = true;
    this.resetTextPos(); // first time setup
  }

  reposition(data) {
    const tempCamVec = new Vector3().fromArray(data.tempCamVecArr);
    const tempFrontVec = new Vector3().fromArray(data.tempFrontVecArr);

    this.camProxy.position.copy(tempCamVec);
    this.TextBox.position.copy(tempFrontVec);
    this.TextBox.lookAt(this.camProxy.position);
    this.TextBox.anchorX = "center";
  }
  async asyncUpdateText(e) {
    if (!State.isOwner) return; // only owner can write
    await this.handleLocalInput(e);
    this.publish("tuppomodel", "update-text-model", State.currentText);
  }

  initOwnerID() {
    console.log(`tuppu: your ownerID: ${this.viewId}`);
    this.publish("tuppomodel", "set-ownerid", this.viewId);
  }
  syncState() {
    if (this.sceneModel.textString != "") {
      this.handleUpdate(this.sceneModel.textString);
      State.currentText = this.sceneModel.textString;
    }

    if (this.sceneModel.posData) {
      this.reposition(this.sceneModel.posData);
    }

    if (this.sceneModel.fontArrIndex != State.fontArrIndex) {
      State.fontArrIndex = this.sceneModel.fontArrIndex;
      this.updateTextFont(State.fontArrIndex);
    }
    if (this.sceneModel.fontSize != State.fontSize) {
      State.fontSize = this.sceneModel.fontSize;
      this.updateTextSize(State.fontSize);
    }
  }

  broadcastFontArrIndexUpdate(dir) {
    if (State.fontArrIndex + dir > fontArr.length - 1) {
      State.fontArrIndex = 0;
    } else if (State.fontArrIndex + dir < 0) {
      State.fontArrIndex = fontArr.length - 1;
    } else State.fontArrIndex += dir;
    this.publish("tuppomodel", "update-text-font", State.fontArrIndex);
  }

  broadcastFontSizeUpdate(dir) {
    switch (dir) {
      case 1:
        State.fontSize += 0.005;
        break;
      case -1:
        State.fontSize -= 0.005;
        break;
      default:
        break;
    }
    this.publish("tuppomodel", "update-text-size", State.fontSize);
  }

  updateTextFont(fontArrIndex) {
    this.TextBox.font = fontArr[fontArrIndex];
    this.TextBox.sync();
  }
  updateTextSize(fontSize) {
    this.TextBox.fontSize = fontSize;
    this.TextBox.sync();
  }
  handleLocalInput(e) {
    return new Promise(resolve => {
      switch (e.keyCode) {
        case 8: // backspace
          if (State.currentText.length == 0) break;
          State.currentText = State.currentText.slice(0, -1);
          resolve();
          break;

        case 13: // enter
          State.currentText += "\n";
          this.publish("tuppomodel", "reset-height");
          resolve();
          break;

        case 17: // ctrl
          State.ctrlDown = true;
          resolve();

        default:
          // A-Z, nums, etc
          if (State.ctrlDown) {
            if (e.key == "c") {
              navigator.clipboard.writeText(State.currentText).then(e => {
                console.warn("tuppu: copied text");
                resolve();
              });
            } else if (e.key == "x") {
              //   navigator.clipboard.writeText(State.currentText);
              //   navigator.clipboard.readText().then(clipText => {
              State.currentText = "";
              console.warn("tuppu: clear text");
              resolve();
              //   });
            } else if (e.key == "v") {
              navigator.clipboard.readText().then(clipText => {
                State.currentText += clipText;
                console.warn("tuppu: pasted clipboard");
                resolve();
              });
            } else if (e.key == "ArrowLeft") {
              this.broadcastFontArrIndexUpdate(-1);
            } else if (e.key == "ArrowRight") {
              this.broadcastFontArrIndexUpdate(1);
            } else if (e.key == "ArrowUp") {
              this.broadcastFontSizeUpdate(1);
            } else if (e.key == "ArrowDown") {
              this.broadcastFontSizeUpdate(-1);
            }
          } else if (UTIL_KEYS.includes(e.key)) {
            resolve();
            return;
          } else {
            State.currentText += e.key;
            resolve();
          }
          break;
      }
    });
  }

  resetTextPos() {
    const tempCamVec = new Vector3();
    const tempFrontVec = new Vector3();
    const tempQuat = new Quaternion();
    const tempScale = new Vector3();

    this.frontAnchor.matrixWorld.decompose(tempFrontVec, tempQuat, tempScale);
    Camera.matrixWorld.decompose(tempCamVec, tempQuat, tempScale);
    const tempCamVecArr = tempCamVec.toArray();
    const tempFrontVecArr = tempFrontVec.toArray();
    const data = { tempCamVecArr, tempFrontVecArr };
    this.publish("tuppomodel", "reposition", data);
  }

  initInputs() {
    window.addEventListener("keydown", this.asyncUpdateText.bind(this));
    window.addEventListener("mousedown", e => {
      e.preventDefault();
    });
    window.addEventListener("keyup", e => {
      if (e.key == "Control") {
        // ctrl
        State.ctrlDown = false;
      }
    });

    State.eventHandler.addEventListener("selectstart", e => {
      if (!State.isOwner) return;

      if (!State._dblClick) {
        State._dblClick = true;
        setTimeout(
          function () {
            State._dblClick = false;
          }.bind(this),
          300
        );
      } else {
        this.resetTextPos();
        State._dblClick = false;
      }
    });
    State.eventHandler.addEventListener("xrsessionstarted", e => {
      // hack campos bug
      setTimeout(() => {
        this.resetTextPos();
      }, 10);
    });
  }
}
