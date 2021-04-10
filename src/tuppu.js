// default scene loaded in src/engine/engine.js
import { Text } from "troika-three-text";

import { Scene, DirectionalLight } from "three";
const isVisible = true;

const scene = new Scene();

const light = new DirectionalLight(0xffffff, 3.5);
light.position.set(0, 13, 3);
scene.add(light);

const TextBox = new Text();
scene.add(TextBox);

// Set properties to configure:
const introText = `
t u p p u . e x e
Use your keyboard to enter text
use trigger on both controllers to minimize / restore text 
Ctrl+C, X, Z etc. working as usual
`;
TextBox.text = `
t u p p u . e x e
Use your keyboard to enter text
use trigger on both controllers to minimize / restore text 
Ctrl+C, X, Z etc. working as usual
`;

TextBox.font = "./fonts/ClearSans/ClearSans-Regular.ttf";
TextBox.fontSize = 0.01;
TextBox.position.z = -2;
TextBox.text = introText;

TextBox.color = 0x8925fa;
TextBox.outlineBlur = "10%";
TextBox.outlineColor = 0xc825fa;

// Update the rendering:
TextBox.sync();

const TextDiv = document.querySelector(".text");
TextDiv.addEventListener("input", e => {
  let newString = TextDiv.value;
  // newString = newString.replace("<br>", "\\n");
  TextBox.text = newString == "" ? introText : newString;
  TextBox.sync();
});

window.addEventListener("keydown", e => {
  switch (e.key) {
    case "Enter":
      TextBox.anchorY = "70%";
      break;
    default:
      break;
  }
});

const focusWindow = e => {
  TextDiv.focus();
};

window.addEventListener("focus", focusWindow);
window.addEventListener("mousedown", e => {
  e.preventDefault();
});

export { scene };
