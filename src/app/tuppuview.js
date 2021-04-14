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

State.isOwner = false;
State.currentText = "";
State.debugMode = false;

const CURSOR_SPEED_MS = 500;
const INTRO_TEXT = `
tuppu: a simple, networked text editor
--------------------------------------
- keyboard to enter text
- hit both triggers to reset editor position 
- Ctrl+X to CUT all text
- Ctrl+C to COPY all text
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
  }

  resetHeight() {
    this.TextBox.anchorY = "70%";
  }
  createTextbox() {
    this.TextBox = new Text();
    this.scene.add(this.TextBox);
    this.TextBox.text = INTRO_TEXT;
    this.TextBox.font = clearSans;
    this.TextBox.fontSize = 0.035;
    this.TextBox.position.z = -0.25;

    // if gradient, color and outlinecolor don't take effect
    this.TextBox.material = GradientMaterial;

    this.TextBox.color = 0xffffff;
    // this.TextBox.outlineColor = 0xc825fa;
    this.TextBox.outlineColor = 0x8925fa;
    this.TextBox.outlineBlur = "5%";

    this.TextBox.maxWidth = 1;
    this.TextBox.sync();

    // this.TextBoxReversed = new Text();
    // this.scene.add(this.TextBoxReversed);
    // this.TextBoxReversed.rotation.y = Math.PI;
    // this.TextBoxReversed.text = INTRO_TEXT;
    // this.TextBoxReversed.font = clearSans;
    // this.TextBoxReversed.fontSize = 0.035;
    // this.TextBoxReversed.position.z = -0.25;

    // // if gradient, color and outlinecolor don't take effect
    // this.TextBoxReversed.material = GradientMaterial;

    // this.TextBoxReversed.color = 0xffffff;
    // // this.TextBox.outlineColor = 0xc825fa;
    // this.TextBoxReversed.outlineColor = 0x8925fa;
    // this.TextBoxReversed.outlineBlur = "5%";

    // this.TextBoxReversed.maxWidth = 1;
    // this.TextBoxReversed.sync();

    // this.TextBoxReversed.sync();

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
    // this.TextBoxReversed.text = newString == "" ? INTRO_TEXT : newString;
    // this.TextBoxReversed.sync();
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

    // this.TextBoxReversed.position.copy(tempFrontVec);
    // this.TextBoxReversed.lookAt(this.camProxy.position);
    // this.TextBoxReversed.geometry.applyMatrix(
    //   new Matrix4().makeRotationX(Math.PI / 2)
    // );
    // this.TextBoxReversed.anchorX = "center";
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
          if (UTIL_KEYS.includes(e.key)) {
            resolve();
            return;
          } else {
            if (State.ctrlDown) {
              if (e.key == "c") {
                navigator.clipboard.writeText(State.currentText).then(e => {
                  console.warn("tuppu: copied text");
                  resolve();
                });
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
                  console.warn("tuppu: pasted clipboard");
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
