import React from "react";
import ReactDOM from "react-dom";
import { Form, connectField, connectForm } from "react-informal";

// Form sub-components
const mapFieldProps = field => ({ ...field.input, messages: field.messages });
const TextField = connectField(mapFieldProps)(({ label, messages, ...rest }) =>
  <div>
    <div>
      {label}
    </div>
    <input {...rest} />
    {messages.length > 0 &&
      messages.map(message =>
        <div key={message}>
          {message}
        </div>
      )}
  </div>
);

const mapHandlerProps = form => ({ error: form.error });
const ErrorHandler = connectForm(mapHandlerProps)(({ error }) =>
  <div>
    {error && <p>Form submission failed</p>}
  </div>
);

const mapSubmitProps = form => ({ valid: form.valid });
const SubmitButton = connectForm(mapSubmitProps)(({ valid }) =>
  <button type="submit" disabled={!valid}>
    Submit
  </button>
);

// Mock submission function
const submit = formData =>
  new Promise(resolve => setTimeout(resolve, 350, formData));

// Validation objects
const required = { test: /(.+)/, message: "This field is required" };
const email = { test: /(.+)@(.+)\.(.+)/, message: "Email has to be valid" };

// Main view component
const View = () =>
  <Form onSubmit={submit}>
    <TextField label="Name" name="name" validations={[required]} />
    <TextField label="Email" name="email" validations={[required, email]} />
    <TextField label="Telephone" name="tel" />
    <ErrorHandler />
    <SubmitButton />
  </Form>;

// Render components to DOM
ReactDOM.render(<View />, document.getElementById("app"));
