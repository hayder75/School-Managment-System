export function extractApiErrors(error) {
  if (!error) return {};
  const errData = error;
  if (errData?.error?.details && Array.isArray(errData.error.details)) {
    const fieldErrors = {};
    for (const detail of errData.error.details) {
      const path = detail.path?.[1] || detail.path?.[0] || 'form';
      fieldErrors[path] = detail.message || 'Invalid value';
    }
    return fieldErrors;
  }
  if (errData?.error?.message) {
    return { form: errData.error.message };
  }
  return {};
}

export function getFieldError(errors, field) {
  return errors?.[field] || null;
}
