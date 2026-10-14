// ==UserScript==
// @name            WME Eesti Maa-amet WMS kihid
// @version         1.0.6
// @author          Mikk36, Hapsal_PA. Co authors: (petrjanik, d2-mac, MajkiiTelini)
// @description     Displays WMS layers from Estonia Land Board WMS services (Maa-amet) in WME.
// @include         https://*.waze.com/*/editor*
// @include         https://*.waze.com/editor*
// @include         https://*.waze.com/map-editor*
// @include         https://*.waze.com/beta_editor*
// @include         https://editor-beta.waze.com*
// @run-at          document-end
// @namespace       https://greasyfork.org/users/331322
// @grant           GM_info
// @require         https://update.greasyfork.org/scripts/509664/WME%20Utils%20-%20Bootstrap.js
// @source          https://github.com/Mikk36/wme-eesti-maaamet-map-layer
// @downloadURL     https://update.greasyfork.org/scripts/389225/WME%20Eesti%20Maa-amet%20WMS%20kihid.user.js
// @updateURL       https://update.greasyfork.org/scripts/389225/WME%20Eesti%20Maa-amet%20WMS%20kihid.meta.js
// ==/UserScript==

/**
 * Changelog:
 * 1.0.6 - migrate layers to WME SDK
 * 1.0.5 - fix higher zoom levels
 * 1.0.4 - fixed the visual style
 * 1.0.3 - fixed the new WME layer switching update
 * 1.0.2 - fixed layers
 * 1.0.1 - v2019.08.21 - first version, modifications of "Czech WMS layers".
 */

(async function () {
  'use strict';

  const DOWNLOAD_URL = 'https://update.greasyfork.org/scripts/389225/WME%20Eesti%20Maa-amet%20WMS%20kihid.user.js';
  const SCRIPT_NAME = GM_info.script.name;

  let sdk;
  let OpenLayers, W;

  async function init() {
    try {
      sdk = await bootstrap({
        scriptUpdateMonitor: {
          downloadUrl: DOWNLOAD_URL,
        },
      });

      OpenLayers = unsafeWindow.OpenLayers;
      W = unsafeWindow.W;

      const serviceWmsMaaamet = {
        "type": "WMS",
        "url": "https://tiles.maaamet.ee/tm/?",
        "attribution": "Maa-amet",
        "comment": "Maa-amet WMS"
      };

      const layersInfo = [
        {
          key: "kaart",
          name: "Maa-amet: Eesti kaart",
          serviceLayer: "kaart",
          zIndex: 200
        },
        {
          key: "foto",
          name: "Maa-amet: Ortofoto",
          serviceLayer: "foto",
          zIndex: 200
        },
        {
          key: "hybriid",
          name: "Maa-amet: Hübriidkaart",
          serviceLayer: "hybriid",
          zIndex: 201
        }
      ];

      const savedOptions = localStorage.WMSLayers ? JSON.parse(localStorage.WMSLayers) : {};

      const layers = {};
      const checkboxNames = {};

      for (const layerInfo of layersInfo) {
        const mapLayer = addNewLayer(layerInfo.key, serviceWmsMaaamet, layerInfo.serviceLayer, layerInfo.zIndex);
        layers[layerInfo.key] = mapLayer;
        checkboxNames[layerInfo.key] = layerInfo.name;

        const isChecked = savedOptions[`wms_${layerInfo.key}`] || false;

        sdk.LayerSwitcher.addLayerCheckbox({
          name: layerInfo.name,
          isChecked: isChecked,
        });

        if (isChecked) {
          W.map.addLayer(mapLayer.layer);
          mapLayer.layer.setVisibility(true);
        }
      }

      sdk.Events.on({
        eventName: 'wme-layer-checkbox-toggled',
        eventHandler: (checkboxInfo) => {
          for (const layerInfo of layersInfo) {
            if (checkboxInfo.name === checkboxNames[layerInfo.key]) {
              const layer = layers[layerInfo.key].layer;
              if (checkboxInfo.checked) {
                W.map.addLayer(layer);
                layer.setVisibility(true);
              } else {
                layer.setVisibility(false);
                W.map.removeLayer(layer);
              }
              saveWMSLayersOptions();
            }
          }
        }
      });

      W.map.events.register("addlayer", null, setZOrdering(layers));
      W.map.events.register("removelayer", null, setZOrdering(layers));

      const saveWMSLayersOptions = () => {
        if (localStorage) {
          const JSONStorageOptions = {};
          for (const layerInfo of layersInfo) {
            JSONStorageOptions[`wms_${layerInfo.key}`] = layers[layerInfo.key].layer.getVisibility();
          }
          localStorage.WMSLayers = JSON.stringify(JSONStorageOptions);
        }
      };

      window.addEventListener("beforeunload", saveWMSLayersOptions, false);

    } catch (error) {
      console.error(`${SCRIPT_NAME}: Initialization failed:`, error);
    }
  }

  function addNewLayer(id, service, serviceLayers, zIndex) {
    const newLayer = {};
    newLayer.uniqueName = `_${id}`;
    newLayer.zIndex = (typeof zIndex === "undefined") ? 0 : zIndex;
    newLayer.layer = new OpenLayers.Layer.WMS(
      id,
      service.url,
      {
        layers: serviceLayers,
        transparent: "true",
        format: "image/png"
      },
      {
        tileSize: new OpenLayers.Size(256, 256),
        isBaseLayer: false,
        visibility: false,
        transitionEffect: "resize",
        attribution: service.attribution,
        uniqueName: newLayer.uniqueName,
        serverResolutions: [38.218514137268066, 19.109257068634033, 9.554628534317017, 4.777314267158508, 2.388657133579254, 1.194328566789627, 0.5971642833948135],
        resolutions: [38.218514137268066, 19.109257068634033, 9.554628534317017, 4.777314267158508, 2.388657133579254, 1.194328566789627, 0.5971642833948135, 0.29858214169740677, 0.14929107084870338, 0.07464553542435169, 0.037322767712175846],
      }
    );
    return newLayer;
  }

  function setZOrdering(layers) {
    return function () {
      for (const layerInfo of Object.values(layers)) {
        if (layerInfo.zIndex > 0) {
          const l = W.map.getLayersBy("uniqueName", layerInfo.uniqueName);
          if (l.length > 0) {
            l[0].setZIndex(layerInfo.zIndex);
          }
        }
      }
    };
  }

  init();
})();
