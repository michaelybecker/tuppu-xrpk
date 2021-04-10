// default scene loaded in src/engine/engine.js
import * as Croquet from "@croquet/croquet";
import PMAEventHandler from "pluto-mae";

import { Text } from "troika-three-text";

import { Scene, DirectionalLight, ShaderMaterial, Color } from "three";

const clearSans = require("./fonts/ClearSans/ClearSans-Regular.ttf");
const CURSOR_SPEED_MS = 500;

let isVisible = true;

const scene = new Scene();

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
- Ctrl+C, X, Z etc. works
`;
TextBox.text = introText;
TextBox.font = clearSans;
TextBox.fontSize = 0.01;
TextBox.position.z = -0.5;
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
    // this.count = 0;
    // this.subscribe("counter", "reset", this.resetCounter);
    // this.future(1000).tick();

    this.subscribe("tuppomodel", "update-text-model", this.updateText);
  }

  // resetCounter() {
  //     this.count = 0;
  //     this.publish("counter", "update", this.count);
  // }

  // tick() {
  //     this.count++;
  //     this.publish("counter", "update", this.count);
  //     this.future(1000).tick();
  // }

  updateText(text) {
    this.publish("tuppoview", "update-text-view", text);
  }
}

TuppuModel.register("TuppuModel");

class TuppuView extends Croquet.View {
  constructor(model) {
    super(model);

    const TextDiv = document.querySelector(".text");
    const focusWindow = e => {
      TextDiv.focus();
    };

    window.addEventListener("focus", focusWindow);
    window.addEventListener("mousedown", e => {
      e.preventDefault();
    });
    TextDiv.addEventListener("input", e => {
      this.publish("tuppomodel", "update-text-model", TextDiv.value);
      // let newString = TextDiv.value;
    });

    this.subscribe("tuppoview", "update-text-view", this.handleUpdate);
    // countDisplay.onclick = event => this.onclick(event);
    // this.subscribe("counter", "update", this.handleUpdate);
  }

  handleUpdate(newString) {
    TextBox.text = newString == "" ? introText : newString;
    TextBox.sync();
  }
}

const pmaEventHandler = new PMAEventHandler();
const xrpkAppId = pmaEventHandler.getAppState().appId;
const name = xrpkAppId ? xrpkAppId : "tupputuppuwritemynameyes";
Croquet.Session.join({
  appId: "com.plutovr.tuppu",
  name: name,
  password: "secret",
  model: TuppuModel,
  view: TuppuView,
  autoSleep: false,
});

export { scene };
