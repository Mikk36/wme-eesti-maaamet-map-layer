// ==UserScript==
// @name			WME Eesti Maa-amet WMS kihid
// @version			1.0.4
// @author			Hapsal_PA. Co authors: (petrjanik, d2-mac, MajkiiTelini)
// @description		Displays WMS layers from Estonia Land Board WMS services (Maa-amet) in WME.
// @include			https://*.waze.com/*/editor*
// @include			https://*.waze.com/editor*
// @include			https://*.waze.com/map-editor*
// @include			https://*.waze.com/beta_editor*
// @include			https://editor-beta.waze.com*
// @run-at			document-end
// @namespace https://greasyfork.org/users/331322
// ==/UserScript==

/* Changelog:
 *	1.0.4 - fixed the visual style
 *	1.0.3 - fixed the new WME layer switching update
 *	1.0.2 - fixed layers
 *	1.0.1 - v2019.08.21 - first version, modifications of "Czech WMS layers".
 */

var W;
var OL;
var I18n;
init();

function init(e) {
  W = unsafeWindow.W;
  OL = unsafeWindow.OL;
  I18n = unsafeWindow.I18n;
  if (e && e.user === null) {
    return;
  }
  if (typeof W === "undefined" || typeof W.loginManager === "undefined") {
    setTimeout(init, 100);
    return;
  }
  if (!W.loginManager.user) {
    W.loginManager.events.register("login", null, init);
    W.loginManager.events.register("loginStatus", null, init);
  }
  if (document.getElementById("layer-switcher") === null && document.getElementById("layer-switcher-group_display") === null) {
    setTimeout(init, 200);
    return;
  }

  // Maa-ameti teenuse ühendus
  var serviceWmsMaaamet= {"type" : "WMS", "url" : "https://tiles.maaamet.ee/tm/?","attribution" : "Maa-amet", "comment" : "Maa-amet WMS"};

  // menüü pealkiri
  var groupTogglerWMS = addGroupToggler(false, "layer-switcher-group_wms", "Maa-ameti kihid");

  // kihid
  var layersInfo = [
    {
      key: "kaart",
      name: "Eesti kaart",
      zIndex: 200
    },
    {
      key: "foto",
      name: "Ortofoto",
      zIndex: 200
    },
    {
      key: "hybriid",
      name: "Hübriidkaart",
      zIndex: 201
    }
  ];

  var layerTogglers = {};

  for(var i = 0; i < layersInfo.length; i++) {
    var layerInfo = layersInfo[i];
    var mapLayer = addNewLayer(layerInfo.key, serviceWmsMaaamet, layerInfo.key, layerInfo.zIndex);
    layerTogglers["wms_" + layerInfo.key] = addLayerToggler(groupTogglerWMS, layerInfo.name, [mapLayer]);
  }

  W.map.events.register("addlayer", null, setZOrdering(layerTogglers));
  W.map.events.register("removelayer", null, setZOrdering(layerTogglers));

  if (localStorage.WMSLayers) {
    var JSONStorageOptions = JSON.parse(localStorage.WMSLayers);
    for (var key in layerTogglers) {
      if (JSONStorageOptions[key]) {
        document.getElementById(layerTogglers[key].htmlItem).click();
      }
    }
  }

  var saveWMSLayersOptions = function() {
    if (localStorage) {
      var JSONStorageOptions = {};
      for (var key in layerTogglers) {
        JSONStorageOptions[key] = document.getElementById(layerTogglers[key].htmlItem).checked;
      }
      localStorage.WMSLayers = JSON.stringify(JSONStorageOptions);
    }
  };
  window.addEventListener("beforeunload", saveWMSLayersOptions, false);
}

// kihi lisamine
function addNewLayer(id, service, serviceLayers, zIndex) {
  var newLayer = {};
  newLayer.uniqueName = "_" + id;
  newLayer.zIndex = (typeof zIndex === 'undefined') ? 0 : zIndex;
  newLayer.layer = new OL.Layer.WMS(
      id, service.url,
      {
        layers: serviceLayers ,
        transparent: "true",
        format: "image/png"
      },
      {
        tileSize: new OL.Size(256,256),
        isBaseLayer: false,
        visibility: false,
        transitionEffect: "resize",
        attribution: service.attribution,
        uniqueName: newLayer.uniqueName,
        projection: new OL.Projection("EPSG:3301", "+proj=lcc +lat_1=59.33333333333334 +lat_2=58 +lat_0=57.51755393055556 +lon_0=24 +x_0=500000 +y_0=6375000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs")
      }
  );
  return newLayer;
}

// kihtide peamenüü
function addGroupToggler(isDefault, layerSwitcherGroupItemName, layerGroupVisibleName) {
  var group;
  if (isDefault === true) {
    group = document.getElementById(layerSwitcherGroupItemName).parentElement.parentElement;
  }
  else {
    var layerGroupsList = document.getElementsByClassName("list-unstyled togglers")[0];
    group = document.createElement("li");
    group.className = "group";
    var togglerContainer = document.createElement("div");
    togglerContainer.className = "toggler layer-switcher-toggler-tree-category";
    var divI = document.createElement("i");
    divI.className = "toggle-category w-icon w-icon-caret-down";
    divI.id = "arrow";
    divI.addEventListener('click', listToggle);
    var spanLabel = document.createElement ("wz-toggle-switch");
    spanLabel.className = "layer-switcher-group_toggler hydrated toggle";
    spanLabel.checked = "true";
    spanLabel.id = "maaameti-kihtide-toggle";
    var label = document.createElement("label");
    label.htmlFor = spanLabel.id;
    label.className = "label-text";
    var togglerChildrenList = document.createElement("ul");
    togglerChildrenList.className = "children";
    togglerContainer.appendChild(divI);
    label.appendChild(document.createTextNode(layerGroupVisibleName));
    togglerContainer.appendChild(label);
    togglerContainer.appendChild(spanLabel);
    group.appendChild(togglerContainer);
    group.appendChild(togglerChildrenList);
    layerGroupsList.appendChild(group);
  }
  return group;
}

// kihi alammenüü
function addLayerToggler(groupToggler, layerName, layerArray, layer) {
  var layerToggler = {};
  var layerShortcut = layerName.replace(/ /g, "_").replace(".", "");
  layerToggler.htmlItem = "layer-switcher-item_" + layerShortcut;
  layerToggler.layerArray = layerArray;
  var layer_container = groupToggler.getElementsByClassName("children")[0];
  layer_container.id = "list";
  var layerGroupCheckbox = groupToggler.getElementsByClassName("toggler")[0].getElementsByClassName("toggle")[0];
  var toggler = document.createElement("li");
  var togglerContainer = document.createElement("div");
  togglerContainer.className = "wz-checkbox styledContainer";
  togglerContainer.id = layerShortcut;
  var styled = layerToggler.htmlItem;
  var checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = styled;
  checkbox.className = "toggle";
  var cutomStyle = document.createElement('style');
  document.head.appendChild(cutomStyle);

  // vana stiili kustutamine
  cutomStyle.sheet.insertRule('#layer-switcher-item_'+ layerShortcut +' {position: absolute; opacity: 0; cursor: pointer;height: 0; width: 0}');

  // muutmine
  var checkboxDivBorder = document.createElement("span");
  checkboxDivBorder.id = layerShortcut + "_styledContainer";
  checkboxDivBorder.className = "styledCheckbox";

  // uue stiili tekitamine
  cutomStyle.sheet.insertRule('.styledContainer {display: block; position: relative; padding-left: 28px; margin-bottom: 8px; cursor: pointer; user-select: none;}');
  cutomStyle.sheet.insertRule('.styledCheckbox {position: absolute; left: 0px; height: 18px; width: 18px; border: 2px solid rgb(133, 155, 166); border-radius: 3px; background-color: white}');
  cutomStyle.sheet.insertRule('.styledContainer input:checked ~ .styledCheckbox {background-color: rgb(0, 164, 235); border: 2px solid rgb(0, 164, 235)}');
  cutomStyle.sheet.insertRule('.styledContainer input[disabled]:checked ~ .styledCheckbox {background-color: #ccc; border: 2px solid #ccc}');
  cutomStyle.sheet.insertRule('.styledContainer input[disabled] ~ .styledCheckbox {border: 2px solid #ccc}');
  cutomStyle.sheet.insertRule('.styledCheckbox:after {content: " "; position: absolute; display: none;}');
  cutomStyle.sheet.insertRule('.styledContainer input:checked ~ .styledCheckbox:after {display: block}');
  cutomStyle.sheet.insertRule('.styledContainer .styledCheckbox:after {left: 5px; top: 1px; width: 5px; height: 9px; border: solid white; border-width: 0 1px 1px 0; -webkit-transform: rotate(45deg);-ms-transform: rotate(45deg);transform: rotate(45deg)');

  // cutomStyle.sheet.insertRule('#toggle input:disabled {opacity: 0.3}');
  var label = document.createElement('label');
  label.innerHTML = " " + layerName;
  label.htmlFor = checkbox.id;
  label.appendChild(checkbox);
  label.appendChild(checkboxDivBorder);
  togglerContainer.appendChild(label);
  toggler.appendChild(togglerContainer);
  layer_container.appendChild(toggler);

  for (var i = 0; i < layerArray.length; i++){
    checkbox.addEventListener("click", layerTogglerEventHandler(layerArray[i].layer));
    layerGroupCheckbox.addEventListener("click", layerTogglerGroupEventHandler(checkbox, layerArray[i].layer));
  }
  return layerToggler;
}

// lisab kihi
function layerTogglerEventHandler(layer) {
  return function() {
    if (this.checked) {
      W.map.addLayer(layer);
      layer.setVisibility(this.checked);
    } else {
      layer.setVisibility(this.checked);
      W.map.removeLayer(layer);
    }
  };
}

// Paneb kõik kihid korraga kinni ja lahti
function layerTogglerGroupEventHandler(checkbox, layer) {
  return function() {
    if (this.checked) {
      if (checkbox.checked) {
        W.map.addLayer(layer);
        layer.setVisibility(this.checked & checkbox.checked);
      }
    }
    else {
      if (checkbox.checked) {
        layer.setVisibility(this.checked & checkbox.checked);
        W.map.removeLayer(layer);
      }
    }
    checkbox.disabled = !this.checked;
  };
}

// alammenüü sulgemine  ja avamine
function listToggle (e) {
  document.getElementById("arrow").classList.toggle("upside-down");
  var listDisplay = document.getElementById("list");
  if (listDisplay.style.display === "none" ) {
    listDisplay.style.display = "block";
  } else {
    listDisplay.style.display = "none";
  }
}

// annab kaardikihile z väärtuse
function setZOrdering(layerTogglers) {
  return function() {
    for (var key in layerTogglers) {
      for (var j = 0; j < layerTogglers[key].layerArray.length; j++) {
        if (layerTogglers[key].layerArray[j].zIndex > 0) {
          var l = W.map.getLayersBy("uniqueName", layerTogglers[key].layerArray[j].uniqueName);
          if (l.length > 0) {
            l[0].setZIndex(layerTogglers[key].layerArray[j].zIndex);
          }
        }
      }
    }
  };
}
