import React from "react";
import ReactDOM from "react-dom";
import { Form, connectField } from "react-informal";

// Barebones text field component
const TextField = connectField()(({ field, ...rest }) =>
  <input {...rest} {...field.input} />
);

// Main view component
const View = () =>
  <Form onSubmit={data => Promise.resolve(alert(JSON.stringify(data)))}>
    <TextField name="name" />
    <TextField name="email" />
    <TextField name="tel" />
    <button type="submit">Submit</button>
  </Form>;

// Render components to DOM
ReactDOM.render(<View />, document.getElementById("app"));
