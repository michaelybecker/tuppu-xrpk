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
  Raycaster,
  MeshBasicMaterial,
  BufferGeometry,
  LineBasicMaterial,
  Line,
} from "three";
import { Text } from "troika-three-text";
import Camera from "../engine/camera";
import Renderer from "../engine/renderer";
import { loadScene } from "../engine/engine";
import State from "../engine/state";
import { v4 as uuidv4 } from "uuid";
const utils = require("./utils");

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
State.isFocused = true;

State.debugMode = false;

const CURSOR_SPEED_MS = 500;
const INTRO_TEXT = `
tuppu: a simple, networked text editor
--------------------------------------
- Drag around to reposition
- hit both triggers to RESET editor position
- Ctrl+left/right arrow keys to CHANGE FONT
- Ctrl+up/down arrow keys to CHANGE SIZE
- Ctrl+X to CLEAR all text
- Ctrl+C to COPY all text
- Ctrl+V to PASTE from clipboard
- aim outside the text and hit trigger to UNFOCUS
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
    color1: { value: new Color("#31c7de") },
    color2: { value: new Color("#de3c31") },
  },
  vertexShader: `
 
    varying vec3 vUv; 

    void main() {
      vUv = position;    
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
     
   uniform vec3 color1;
    uniform vec3 color2;

 
    varying vec3 vUv;

    void main() {     
     
      gl_FragColor = vec4(mix(color1, color2, vUv.x+vUv.y), 1.0);
    }
`,
});
GradientMaterial.side = DoubleSide;

const FocusedMaterial = new MeshBasicMaterial({ color: 0xffff00 });
FocusedMaterial.side = DoubleSide;

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

    this.createTextbox();
    this.syncState();
    this.initInputs();

    this.subscribe("tuppoview", "update-text-view", this.handleUpdate);
    this.subscribe("tuppoview", "reposition", this.reposition);
    this.subscribe("tuppoview", "reset-height", this.resetHeight);
    this.subscribe("tuppoview", "update-text-font", this.updateTextFont);
    this.subscribe("tuppoview", "update-text-size", this.updateTextSize);
    this.subscribe("tuppoview", "change-focus", this.changeFocus);
  }

  resetHeight() {
    this.TextBox.anchorY = "70%";
  }
  createTextbox() {
    this.TextBox = new Text();
    this.TextBox.modelId = uuidv4();
    this.scene.add(this.TextBox);
    this.TextBox.text = INTRO_TEXT;
    this.TextBox.font = fontArr[State.fontArrIndex];
    this.TextBox.fontSize = State.fontSize;
    this.TextBox.position.z = -0.25;
    this.TextBox.curveRadius = 0.75;

    // if gradient, color and outlinecolor don't take effect
    this.TextBox.material = GradientMaterial;

    this.TextBox.color = 0x000000;
    // this.TextBox.outlineColor = 0xc825fa;
    // this.TextBox.outlineColor = 0x8925fa;
    // this.TextBox.outlineBlur = "5%";

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

    this.resetTextPos();
  }
  handleUpdate(newString) {
    this.TextBox.text = newString == "" ? INTRO_TEXT : newString;
    this.TextBox.sync();
  }
  reposition(data) {
    if (
      !State.isFocused ||
      !this._controller1 ||
      !this._controller2 ||
      this._controller1._isGrabbing ||
      this._controller2._isGrabbing
    )
      return;
    const tv = new Vector3().fromArray(data.tpva);
    const tq = new Quaternion().fromArray(data.tpqa);
    this.TextBox.position.copy(tv);
    this.TextBox.quaternion.copy(tq);
  }

  async asyncUpdateText(e) {
    if (!State.isFocused) return;
    await this.handleLocalInput(e);
    this.publish("tuppomodel", "update-text-model", State.currentText);
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

    if (this.sceneModel.isFocused) {
      this.changeFocus(this.sceneModel.isFocused);
    }
  }

  broadcastFontArrIndexUpdate(dir) {
    if (!State.isFocused) return;

    if (State.fontArrIndex + dir > fontArr.length - 1) {
      State.fontArrIndex = 0;
    } else if (State.fontArrIndex + dir < 0) {
      State.fontArrIndex = fontArr.length - 1;
    } else State.fontArrIndex += dir;
    this.publish("tuppomodel", "update-text-font", State.fontArrIndex);
  }

  broadcastFontSizeUpdate(dir) {
    if (!State.isFocused) return;

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
    if (!State.isFocused) return;

    // const a = new Object3D();
    // a.applyMatrix4(Camera.matrixWorld);
    // console.log(a.position);

    const tempCamVec = new Vector3();
    const tempFrontVec = new Vector3();
    const tempQuat = new Quaternion();
    const tempScale = new Vector3();

    this.frontAnchor.matrixWorld.decompose(tempFrontVec, tempQuat, tempScale);
    Camera.matrixWorld.decompose(tempCamVec, tempQuat, tempScale);
    console.log(tempCamVec);
    console.log(tempFrontVec);
    this.camProxy.position.copy(tempCamVec);
    this.TextBox.position.copy(tempFrontVec);
    this.TextBox.lookAt(this.camProxy.position);
    this.TextBox.anchorX = "center";

    let _tv = new Vector3();
    let _tq = new Quaternion();
    this.TextBox.getWorldPosition(_tv);
    this.TextBox.getWorldQuaternion(_tq);
    const tpva = _tv.toArray();
    const tpqa = _tq.toArray();
    const moveData = { tpva, tpqa };
    this.publish("tuppomodel", "reposition", moveData);
  }

  onSelectStart(event) {
    if (!State._dblClick) {
      State._dblClick = true;
      this.grabObject(this.getControllerFromInputSource(event));
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
  }
  onSelectEnd(event) {
    this.releaseObject(this.getControllerFromInputSource(event));
  }

  releaseObject(controller) {
    if (controller._grabbedObj) {
      controller._isGrabbing = false;
      this.scene.attach(controller._grabbedObj);
    }
  }

  grabObject(controller) {
    if (
      controller._raycastAt != undefined &&
      controller._raycastAt.type == "Mesh"
    ) {
      controller._isGrabbing = true;
      controller.attach(controller._raycastAt);
      this.publish("tuppomodel", "change-focus", true);
      controller._grabbedObj = controller._raycastAt;
    } else {
      this.publish("tuppomodel", "change-focus", false);
    }
  }

  changeFocus(isFocused) {
    State.isFocused = isFocused;
    if (isFocused) {
      this.TextBox.material.uniforms.color1.value = new Color("#ffff00");
      this.TextBox.material.uniforms.color2.value = new Color("#ff77ff");
    } else {
      this.TextBox.material.uniforms.color1.value = new Color("#31c7de");
      this.TextBox.material.uniforms.color2.value = new Color("#de3c31");
    }
  }

  initInputs() {
    // 2D inputs
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

    // XR controllers
    this._raycaster = new Raycaster();
    this._tempMatrix = new Matrix4();
    this._controller1 = Renderer.xr.getController(0);
    this._controller2 = Renderer.xr.getController(1);
    this._controller1.handedness = "left";
    this._controller2.handedness = "right";
    this._controllers = [this._controller1, this._controller2];
    this._controllers.forEach(controller => {
      controller.type = "controller";
      controller._isGrabbing = false;
      this.scene.add(controller);
      this.addRayCastVisualizer(controller);
      controller.Update = () => {
        controller._raycastAt = this.raycast(controller);
        this.translateRaycastModel(controller);
        controller.children[0].material.opacity =
          controller._raycastAt == undefined ? 0 : 1;
        if (!controller._raycastAt) return;

        const d = controller.position.distanceTo(
          controller._raycastAt.position
        );
        controller.children[0].scale.setScalar(d);

        controller.children[0].geometry.needsUpdate = true;
      };
    });
    // mat decomp for grabbedobj event broadcasting
    this._tempMatrix = new Matrix4();
    this._tempPosVec = new Vector3();
    this._tempQuat = new Quaternion();
    this._tempSca = new Vector3();

    State.eventHandler.addEventListener(
      "selectstart",
      this.onSelectStart.bind(this)
    );
    State.eventHandler.addEventListener(
      "selectend",
      this.onSelectEnd.bind(this)
    );
    State.eventHandler.addEventListener("xrsessionstarted", e => {
      // hack campos bug
      setTimeout(() => {
        this.resetTextPos();
      }, 400);
    });
  }
  addRayCastVisualizer(controller) {
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -1),
    ]);

    const mat = new LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
    });
    const line = new Line(geometry, mat);
    line.name = "line";
    controller.add(line.clone());
  }
  raycast(controller) {
    if (!controller) {
      console.error("no controller found!");
      return;
    }
    this._tempMatrix.identity().extractRotation(controller.matrixWorld);
    this._raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this._raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this._tempMatrix);

    const intersects = this._raycaster.intersectObject(this.TextBox, true);
    return this.getIntersections(intersects);
  }

  getIntersections(intersects) {
    if (!intersects.length) return;
    for (let i = 0; i < intersects.length; i++) {
      return intersects[0].object;
    }
  }

  translateRaycastModel(controller) {
    if (!controller._isGrabbing) return;
    let _tv = new Vector3();
    let _tq = new Quaternion();
    controller._grabbedObj.getWorldPosition(_tv);
    controller._grabbedObj.getWorldQuaternion(_tq);
    const tpva = _tv.toArray();
    const tpqa = _tq.toArray();
    const moveData = { tpva, tpqa };
    this.publish("tuppomodel", "reposition", moveData);
  }

  getControllerFromInputSource(event) {
    const c = this._controllers.find(
      controller => controller.handedness === event.inputSource.handedness
    );
    if (!c)
      throw Error(
        `no controller matching event's handedness found!\n${this._controllers[0].handedness}\n${this._controllers[1].handedness}\n${event.inputSource.handedness}`
      );
    else return c;
  }
}
