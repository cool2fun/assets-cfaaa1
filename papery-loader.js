(function () {
  "use strict";

  var config = window.config;
  if (!config) throw new Error("Papery Planes config is missing");

  var sdk = window.PokiSDK || {};
  sdk.init = sdk.init || function () { return Promise.resolve(); };
  sdk.setDebug = sdk.setDebug || function () {};
  sdk.gameLoadingStart = sdk.gameLoadingStart || function () {};
  sdk.gameLoadingFinished = sdk.gameLoadingFinished || function () {};
  sdk.gameLoadingProgress = sdk.gameLoadingProgress || function () {};
  sdk.gameplayStart = sdk.gameplayStart || function () {};
  sdk.gameplayStop = sdk.gameplayStop || function () {};
  sdk.gameInteractive = sdk.gameInteractive || function () {};
  sdk.happyTime = sdk.happyTime || function () {};
  sdk.roundStart = sdk.roundStart || function () {};
  sdk.roundEnd = sdk.roundEnd || function () {};
  sdk.customEvent = sdk.customEvent || function () {};
  sdk.displayAd = sdk.displayAd || function () {};
  sdk.destroyAd = sdk.destroyAd || function () {};
  sdk.sendHighscore = sdk.sendHighscore || function () {};
  sdk.getLeaderboard = sdk.getLeaderboard || function () { return Promise.resolve({}); };
  sdk.commercialBreak = sdk.commercialBreak || function () { return Promise.resolve(); };
  sdk.rewardedBreak = sdk.rewardedBreak || function () { return Promise.resolve(true); };
  window.PokiSDK = sdk;
  window.poki = sdk;

  function sendMessage(method, value) {
    if (!window.pokiBridge || !window.unityGame || !window.unityGame.SendMessage) return;
    if (value === undefined) window.unityGame.SendMessage(window.pokiBridge, method);
    else window.unityGame.SendMessage(window.pokiBridge, method, value);
  }

  window.initPokiBridge = function (bridge) {
    window.pokiBridge = bridge;
    sendMessage("ready");
  };
  window.commercialBreak = function () {
    return Promise.resolve(sdk.commercialBreak()).then(function () {
      sendMessage("commercialBreakCompleted");
    });
  };
  window.rewardedBreak = function () {
    return Promise.resolve(sdk.rewardedBreak()).then(function (rewarded) {
      sendMessage("rewardedBreakCompleted", String(Boolean(rewarded)));
    });
  };

  function createLayout() {
    var style = document.createElement("style");
    style.textContent =
      "html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#073454}" +
      "#game{position:absolute;inset:0;margin:auto}" +
      "#game,#game canvas{width:100%;height:100%;display:block}" +
      "#papery-loading{position:fixed;inset:0;z-index:2;display:grid;place-items:center;background:#073454;color:#fff;font:600 18px sans-serif}" +
      "#papery-loading-box{width:min(420px,72vw);text-align:center}" +
      "#papery-progress{height:10px;margin-top:14px;border-radius:999px;overflow:hidden;background:#fff3}" +
      "#papery-progress-fill{width:0;height:100%;background:#42ddc5;transition:width .15s ease}";
    document.head.appendChild(style);

    var game = document.createElement("div");
    game.id = "game";
    var loading = document.createElement("div");
    loading.id = "papery-loading";
    loading.innerHTML =
      '<div id="papery-loading-box">Papery Planes<div id="papery-progress"><div id="papery-progress-fill"></div></div></div>';
    document.body.appendChild(game);
    document.body.appendChild(loading);
    return { game: game, loading: loading };
  }

  function fitGame(game) {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var ratio = width / height;
    var maxRatio = config.maxRatio || 16 / 9;
    var minRatio = config.minRatio || 9 / 16;
    if (ratio > maxRatio) width = height * maxRatio;
    else if (ratio < minRatio) height = width / minRatio;
    game.style.width = Math.round(width) + "px";
    game.style.height = Math.round(height) + "px";
  }

  function makeProgressEventSafe() {
    var progress = window.UnityLoader && window.UnityLoader.Progress;
    if (!progress || typeof progress.update !== "function") return;
    var nativeUpdate = progress.update;
    progress.update = function (state, key, event) {
      if (event && !event.lengthComputable) {
        var url = event.target && event.target.responseURL || "";
        if (url.indexOf("/Build/") === -1) {
          event = {
            type: event.type,
            lengthComputable: true,
            loaded: event.loaded || 0,
            total: event.total || 0,
            target: event.target
          };
        }
      }
      return nativeUpdate.call(progress, state, key, event);
    };
  }

  function boot() {
    var layout = createLayout();
    fitGame(layout.game);
    window.addEventListener("resize", function () { fitGame(layout.game); });
    sdk.gameLoadingStart();

    var loader = document.createElement("script");
    loader.src = config.unityWebglLoaderUrl;
    loader.onload = function () {
      makeProgressEventSafe();
      window.unityGame = window.UnityLoader.instantiate("game", config.unityWebglBuildUrl, {
        onProgress: function (_instance, progress) {
          document.getElementById("papery-progress-fill").style.width = Math.round(progress * 100) + "%";
          sdk.gameLoadingProgress({ percentageDone: progress * 100 });
        },
        Module: {
          onRuntimeInitialized: function () {
            layout.loading.style.display = "none";
            sdk.gameLoadingFinished();
          }
        }
      });
    };
    loader.onerror = function () {
      layout.loading.textContent = "Unable to load Papery Planes";
    };
    document.body.appendChild(loader);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
