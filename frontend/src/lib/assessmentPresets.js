export function primaryPreset() {
  return {
    mode: "weighted",
    pass_pct: 50,
    groups: [
      { code: "ca", name: "Continuous Assessment", weight_pct: 20, is_final: false, components: [
        { code: "homework", name: "Homework", max_marks: 10, input_type: "number" },
        { code: "classwork", name: "Class work", max_marks: 10, input_type: "number" },
        { code: "assignment", name: "Assignment", max_marks: 10, input_type: "number" },
        { code: "worksheet", name: "Worksheet", max_marks: 10, input_type: "number" },
        { code: "quiz", name: "Quiz", max_marks: 10, input_type: "number" },
      ] },
      { code: "test", name: "Tests", weight_pct: 10, is_final: false, components: [
        { code: "test_1", name: "Test 1", max_marks: 20, input_type: "number" },
        { code: "test_2", name: "Test 2", max_marks: 20, input_type: "number" },
      ] },
      { code: "mid", name: "Mid Exam", weight_pct: 20, is_final: false, components: [
        { code: "mid", name: "Mid Exam", max_marks: 50, input_type: "number" },
      ] },
      { code: "final", name: "Final Exam", weight_pct: 50, is_final: true, components: [
        { code: "final", name: "Final Exam", max_marks: 100, input_type: "number" },
      ] },
    ],
  };
}

export function languagePreset() {
  return {
    mode: "weighted",
    pass_pct: 50,
    groups: [
      { code: "ca", name: "Continuous Assessment", weight_pct: 20, is_final: false, components: [
        { code: "homework", name: "Homework", max_marks: 10, input_type: "number" },
        { code: "classwork", name: "Class work", max_marks: 10, input_type: "number" },
        { code: "assignment", name: "Assignment", max_marks: 10, input_type: "number" },
        { code: "worksheet", name: "Worksheet", max_marks: 10, input_type: "number" },
        { code: "quiz", name: "Quiz", max_marks: 10, input_type: "number" },
      ] },
      { code: "skill", name: "Listening, Reading, Writing, Speaking", weight_pct: 20, is_final: false, components: [
        { code: "listening", name: "Listening", max_marks: 10, input_type: "number" },
        { code: "reading", name: "Reading", max_marks: 10, input_type: "number" },
        { code: "writing", name: "Writing", max_marks: 10, input_type: "number" },
        { code: "speaking", name: "Speaking", max_marks: 10, input_type: "number" },
      ] },
      { code: "test", name: "Tests", weight_pct: 10, is_final: false, components: [
        { code: "test_1", name: "Test 1", max_marks: 20, input_type: "number" },
        { code: "test_2", name: "Test 2", max_marks: 20, input_type: "number" },
      ] },
      { code: "mid", name: "Mid Exam", weight_pct: 20, is_final: false, components: [
        { code: "mid", name: "Mid Exam", max_marks: 50, input_type: "number" },
      ] },
      { code: "final", name: "Final Exam", weight_pct: 30, is_final: true, components: [
        { code: "final", name: "Final Exam", max_marks: 100, input_type: "number" },
      ] },
    ],
  };
}

export function kgPreset() {
  return {
    mode: "weighted",
    pass_pct: 50,
    groups: [
      { code: "test", name: "Test", weight_pct: 20, is_final: false, components: [{ code: "test", name: "Test", max_marks: 100, input_type: "number" }] },
      { code: "mid", name: "Mid", weight_pct: 30, is_final: false, components: [{ code: "mid", name: "Mid", max_marks: 100, input_type: "number" }] },
      { code: "rhyme", name: "Rhyme", weight_pct: 25, is_final: false, components: [{ code: "rhyme", name: "Rhyme", max_marks: 100, input_type: "number" }] },
      { code: "song", name: "Song", weight_pct: 25, is_final: false, components: [{ code: "song", name: "Song", max_marks: 100, input_type: "number" }] },
    ],
  };
}

export function presetFor(levelGroup) {
  if (levelGroup === "kg" || levelGroup === "nursery") return kgPreset();
  return primaryPreset();
}
