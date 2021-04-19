const getModelId = model => {
  if (!model) {
    console.warn("no model provided!");
    return;
  }
  let modelId = null;
  if (model.modelId) {
    modelId = model.modelId;
    return modelId;
  } else {
    model.traverse(model => {
      if (model.modelId && model.type != "controller") {
        modelId = model.modelId;
      }
    });
  }
  if (!modelId) {
    model.traverseAncestors(model => {
      if (model.modelId && model.type != "controller") {
        modelId = model.modelId;
      }
    });
  }
  if (modelId) return modelId;
  else {
    console.error("no modelId found!");
  }
};

module.exports = {
  getModelId: getModelId,
};
