import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app.js"), "utf8");

function createClassList() {
  const values = new Set();
  return {
    add(...names) {
      names.forEach((name) => values.add(name));
    },
    contains(name) {
      return values.has(name);
    },
    remove(...names) {
      names.forEach((name) => values.delete(name));
    },
    toggle(name, force) {
      const shouldAdd = force === undefined ? !values.has(name) : Boolean(force);
      if (shouldAdd) {
        values.add(name);
      } else {
        values.delete(name);
      }
      return shouldAdd;
    },
  };
}

function createStubElement(selector = "element") {
  const attributes = new Map();
  return {
    selector,
    children: [],
    classList: createClassList(),
    className: "",
    dataset: {},
    disabled: false,
    hidden: false,
    innerHTML: "",
    textContent: "",
    title: "",
    value: "0",
    style: {
      removeProperty() {},
      setProperty() {},
    },
    addEventListener() {},
    append(...children) {
      this.children.push(...children);
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    close() {},
    contains() {
      return false;
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    getBoundingClientRect() {
      return { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 };
    },
    prepend(child) {
      this.children.unshift(child);
    },
    querySelector(childSelector) {
      return createStubElement(`${selector} ${childSelector}`);
    },
    querySelectorAll() {
      return [];
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    showModal() {},
  };
}

class ImageStub {
  constructor() {
    this.decoding = "";
    this.src = "";
  }
}

function loadRadarTimeRules(initialNowMs) {
  const elementCache = new Map();
  let fixedNowMs = initialNowMs;

  function getStubElement(selector) {
    if (!elementCache.has(selector)) {
      elementCache.set(selector, createStubElement(selector));
    }

    return elementCache.get(selector);
  }

  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [fixedNowMs]));
    }

    static now() {
      return fixedNowMs;
    }
  }

  const localStorageStub = {
    getItem() {
      return null;
    },
    setItem() {},
  };

  const documentStub = {
    activeElement: null,
    visibilityState: "visible",
    addEventListener() {},
    createElement: createStubElement,
    createTextNode(text) {
      return { textContent: text };
    },
    querySelector: getStubElement,
    querySelectorAll() {
      return [];
    },
  };

  const windowStub = {
    addEventListener() {},
    clearInterval() {},
    clearTimeout() {},
    dataLayer: [],
    gtag: undefined,
    localStorage: localStorageStub,
    location: {
      hostname: "mymeteo.test",
      origin: "https://mymeteo.test",
      search: "",
    },
    matchMedia() {
      return {
        addEventListener() {},
        matches: false,
        removeEventListener() {},
      };
    },
    setInterval() {
      return 1;
    },
    setTimeout() {
      return 1;
    },
  };

  const context = {
    Date: FixedDate,
    Image: ImageStub,
    ResizeObserver: undefined,
    URLSearchParams,
    console,
    document: documentStub,
    navigator: {},
    window: windowStub,
  };

  windowStub.document = documentStub;
  windowStub.navigator = context.navigator;

  vm.createContext(context);
  vm.runInContext(
    `${appSource}
globalThis.__mymeteoRadarTimeTest = {
  isCurrent(dateMs, nowMs) {
    return isRadarDateCurrent(new Date(dateMs), new Date(nowMs));
  },
  isDelayed(referenceMs, nowMs) {
    return isKnmiRadarReferenceDelayed(new Date(referenceMs), new Date(nowMs));
  },
  setKnmiRange(startMs, frameCount) {
    const frameDurationMs = knmiRadarConfig.frameMinutes * 60 * 1000;
    displayedRadarSource = "knmi";
    knmiStartDate = new Date(startMs);
    knmiFrameUrls = Array.from({ length: frameCount }, (_, index) => "frame-" + index);
    knmiFrameDates = Array.from(
      { length: frameCount },
      (_, index) => new Date(startMs + index * frameDurationMs),
    );
    elements.radarSlider.min = "0";
    elements.radarSlider.max = String(Math.max((frameCount - 1) * 100, 0));
    elements.radarSlider.value = "0";
  },
  alignAndGetDefault(nowMs) {
    const now = new Date(nowMs);
    alignRadarSliderStartWithCurrentTime(now);
    const defaultValue = Math.round(getDefaultRadarSliderValue(now));
    elements.radarSlider.value = String(defaultValue);
    radarSliderWasAtStart = isRadarSliderAtStart(defaultValue);
    return {
      max: Number(elements.radarSlider.max),
      min: Number(elements.radarSlider.min),
      value: Number(elements.radarSlider.value),
      wasAtStart: radarSliderWasAtStart,
    };
  },
};`,
    context,
    { filename: "app.js" },
  );

  return context.__mymeteoRadarTimeTest;
}

const minuteMs = 60 * 1000;
const nowMs = Date.UTC(2026, 7, 29, 8, 30);
const rules = loadRadarTimeRules(nowMs);

function assertSliderState(actual, expected, message) {
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(actual[key], value, `${message}: ${key}`);
  }
}

assert.equal(rules.isCurrent(nowMs - 10 * minuteMs, nowMs), true, "10 minutes past is still Now");
assert.equal(rules.isCurrent(nowMs - 10 * minuteMs - 1, nowMs), false, "older than 10 minutes is not Now");
assert.equal(rules.isCurrent(nowMs + 5 * minuteMs, nowMs), true, "5 minutes ahead is still Now");
assert.equal(rules.isCurrent(nowMs + 5 * minuteMs + 1, nowMs), false, "more than 5 minutes ahead is not Now");
assert.equal(rules.isCurrent(Number.NaN, nowMs), false, "an invalid radar time is not Now");

assert.equal(rules.isDelayed(nowMs - 15 * minuteMs, nowMs), false, "exactly 15 minutes old is not delayed");
assert.equal(rules.isDelayed(nowMs - 15 * minuteMs - 1, nowMs), true, "older than 15 minutes is delayed");
assert.equal(rules.isDelayed(nowMs + minuteMs, nowMs), false, "a future reference time is not delayed");
assert.equal(rules.isDelayed(Number.NaN, nowMs), false, "an invalid reference time is not delayed");

rules.setKnmiRange(nowMs - 60 * minuteMs, 7);
assertSliderState(
  rules.alignAndGetDefault(nowMs),
  {
    max: 600,
    min: 0,
    value: 600,
    wasAtStart: false,
  },
  "an entirely historical radar range defaults to its latest frame",
);

rules.setKnmiRange(nowMs - 32.5 * minuteMs, 20);
assertSliderState(
  rules.alignAndGetDefault(nowMs),
  {
    max: 1900,
    min: 650,
    value: 650,
    wasAtStart: true,
  },
  "a range spanning now moves its start and default selection to the current-time position",
);

console.log("Radar time-state tests passed.");
