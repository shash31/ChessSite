import createEngine from "./wasmengine.js";

let engine = null;

// Initialize the engine inside the worker thread
createEngine({
  locateFile: (path) => path.endsWith('.wasm') ? `${import.meta.env.BASE_URL}wasmengine.wasm` : path
}).then((module) => {
  engine = module;
  const result = engine.ccall('init_engine', 'number', [], []); // Initialize
  if (result == 1) {
    // Notify main thread that the worker engine is ready
    postMessage({ type: 'READY' });
  } else {
    postMessage({ type: 'ERROR' });
  }
});

self.onmessage = (event) => {
  const { type, fen, maxTime } = event.data;

  if (type === 'SEARCH' && engine) {
    const bestMove = engine.ccall(
      'get_best_move',
      'number',
      ['string', 'number'],
      [fen, maxTime]
    );

    postMessage({ type: 'SEARCH_RESULT', bestMove });
  } else if (type === 'NEWGAME' && engine) {
    const result = engine.ccall('init_engine', 'number', [], []); // Initialize
    if (result == 1) {
      // Notify main thread that the worker engine is ready
      postMessage({ type: 'READY' });
    } else {
      postMessage({ type: 'ERROR' });
    }
  }
};

