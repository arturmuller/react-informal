import R from "ramda";

// Utils

const isValid = R.propEq("valid", true);
const setValid = R.assoc("valid", true);
const setInvalid = R.assoc("valid", false);
const setDirty = R.assoc("dirty", true);
const setPristine = R.assoc("dirty", false);
const setEdited = R.assoc("edited", true);
const setSubmitted = R.assoc("submitted", true);
const setActive = R.assoc("active", true);
const setInactive = R.assoc("active", false);
const setVisited = R.assoc("visited", true);
const updateValue = R.assoc("value");

const adjustDirty = R.ifElse(
  field => field.value === field.defaultValue,
  setPristine,
  setDirty,
);

const validateField = field => {
  // Collect failing validations
  const failing = R.reject(
    R.ifElse(
      R.propIs(RegExp, "test"),
      validation => R.test(validation.test, field.value),
      validation => validation.test(field.value),
    ),
    field.validations,
  );
  const messages = R.map(R.prop("message"), failing);

  const update = R.compose(
    R.ifElse(R.propSatisfies(R.isEmpty, "messages"), setValid, setInvalid),
    R.assoc("messages", messages),
  );

  return update(field);
};

const adjustFormField = R.curryN(3, (name, fn, form) =>
  R.over(R.lensPath(["fields", name]), fn, form),
);

const allValid = R.compose(R.all(isValid), R.values);

const setFormFieldsSubmitted = R.over(
  R.lensProp("fields"),
  R.map(setSubmitted),
);

const validateForm = R.ifElse(
  R.propSatisfies(allValid, "fields"),
  setValid,
  setInvalid,
);

const withInputDefaults = field => ({
  value: field.defaultValue || "",
  defaultValue: field.defaultValue || "",
  validations: field.validations || [],
  submitted: false,
  active: false,
  edited: false,
  visited: false,
  dirty: false,
});

const initField = R.compose(validateField, withInputDefaults);

// Exported utils

export const getFormValues = form => R.map(field => field.value, form.fields);

// Exported state transformations

export const addField = field => {
  return state => {
    const updateState = R.compose(
      validateForm,
      R.assocPath(["fields", field.name], initField(field)),
    );

    return updateState(state);
  };
};

export const removeField = name => {
  return state => {
    const updateState = R.compose(validateForm, R.dissocPath(["fields", name]));

    return updateState(state);
  };
};

export const onFieldChange = (name, value) => {
  return state => {
    const updateState = R.compose(
      validateForm,
      adjustFormField(
        name,
        R.compose(setEdited, adjustDirty, validateField, updateValue(value)),
      ),
    );

    return updateState(state);
  };
};

export const onFieldFocus = name => {
  return state => {
    return adjustFormField(name, setActive, state);
  };
};

export const onFieldBlur = name => {
  return state => {
    return adjustFormField(name, R.compose(setInactive, setVisited), state);
  };
};

export const onFormSubmitInvalid = () => {
  return state => {
    const updateState = R.compose(setFormFieldsSubmitted, setSubmitted);
    return updateState(state);
  };
};

export const onFormSubmit = () => {
  return state => {
    const updateState = R.compose(
      setFormFieldsSubmitted,
      setSubmitted,
      R.assoc("status", "pending"),
    );

    return updateState(state);
  };
};

export const onFormSubmitSuccess = data => {
  return state => {
    const updateState = R.compose(
      R.assoc("data", data),
      R.assoc("status", "fulfilled"),
    );

    return updateState(state);
  };
};

export const onFormSubmitError = error => {
  return state => {
    const updateState = R.compose(
      R.assoc("error", error),
      R.assoc("status", "rejected"),
    );

    return updateState(state);
  };
};
