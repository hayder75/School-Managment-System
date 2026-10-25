import * as faceapi from "@vladmandic/face-api";

export const FACE_MODEL_URL = "/face-models";
export const DESCRIPTOR_LENGTH = 128;

let modelsPromise = null;

export function loadFaceModels() {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const tf = faceapi.tf;
      for (const backend of ["webgl", "cpu"]) {
        try {
          if (await tf.setBackend(backend)) break;
        } catch {
          /* try next */
        }
      }
      await tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL),
      ]);
      return faceapi;
    })().catch((err) => {
      modelsPromise = null;
      throw err;
    });
  }
  return modelsPromise;
}

function detectorOptions(options = {}) {
  return new faceapi.TinyFaceDetectorOptions({
    inputSize: options.inputSize ?? 320,
    scoreThreshold: options.minScore ?? 0.45,
  });
}

// Detection + landmarks only (cheap; used for the live guidance / liveness loop).
export async function detectLandmarks(video, options = {}) {
  if (!video || video.readyState < 2) return null;
  const result = await faceapi.detectSingleFace(video, detectorOptions(options)).withFaceLandmarks();
  if (!result) return null;
  return {
    score: result.detection.score,
    box: result.detection.box,
    landmarks: result.landmarks,
    descriptor: null,
  };
}

// Detection + landmarks + 128-d descriptor (used for capture / recognition).
export async function detectFace(video, options = {}) {
  if (!video || video.readyState < 2) return null;
  const result = await faceapi
    .detectSingleFace(video, detectorOptions(options))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) return null;
  return {
    score: result.detection.score,
    box: result.detection.box,
    landmarks: result.landmarks,
    descriptor: Array.from(result.descriptor),
  };
}

export function estimateHeadPose(landmarks) {
  const pts = landmarks.positions;
  const left = pts[0];
  const right = pts[16];
  const nose = pts[30];
  const top = pts[27];
  const chin = pts[8];
  const faceW = Math.max(1, right.x - left.x);
  const faceH = Math.max(1, chin.y - top.y);
  return {
    yaw: (nose.x - (left.x + right.x) / 2) / faceW,
    pitch: (nose.y - (top.y + chin.y) / 2) / faceH,
  };
}

const LEFT_EYE = [36, 37, 38, 39, 40, 41];
const RIGHT_EYE = [42, 43, 44, 45, 46, 47];

function dist(p, q) {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

export function eyeAspectRatio(landmarks) {
  const pts = landmarks.positions;
  const ratio = (eye) => {
    const [p1, p2, p3, p4, p5, p6] = eye.map((i) => pts[i]);
    const vertical = dist(p2, p6) + dist(p3, p5);
    const horizontal = dist(p1, p4) * 2;
    return horizontal > 0 ? vertical / horizontal : 0;
  };
  return (ratio(LEFT_EYE) + ratio(RIGHT_EYE)) / 2;
}

export function newBlinkState() {
  return { baseline: 0, blinks: 0, minEar: 1 };
}

// Returns true on the frame a full blink is completed.
export function updateBlinkTracker(state, ear) {
  if (state.baseline === 0) state.baseline = ear;
  state.minEar = Math.min(state.minEar, ear);
  const closed = ear < state.baseline * 0.72;
  const recovered = ear > state.baseline * 0.88;
  if (closed) {
    state.blinks += 1;
    return false;
  }
  if (recovered && state.blinks > 0) {
    state.blinks = 0;
    return true;
  }
  state.baseline = state.baseline * 0.98 + ear * 0.02;
  return false;
}

export function euclideanDistance(a, b) {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// Rough quality score (0..1): bigger, more centred, front-facing faces score higher.
export function faceQuality(face, video) {
  if (!face || !face.box || !video) return 0;
  const w = face.box.width;
  const h = face.box.height;
  const frameW = video.videoWidth || 640;
  const frameH = video.videoHeight || 480;
  const sizeScore = Math.min(1, (w * h) / (frameW * frameH * 0.18));
  const cx = face.box.x + w / 2;
  const cy = face.box.y + h / 2;
  const centre = 1 - Math.min(1, Math.hypot(cx - frameW / 2, cy - frameH / 2) / (frameW / 2));
  const pose = face.landmarks ? estimateHeadPose(face.landmarks) : { yaw: 0, pitch: 0 };
  const poseScore = 1 - Math.min(1, Math.abs(pose.yaw) * 2 + Math.abs(pose.pitch) * 2);
  return Math.max(0, Math.min(1, sizeScore * 0.45 + centre * 0.3 + poseScore * 0.25));
}