import React from "react";

export function Input({ ...props }) {
  return (
    <input
      style={{
        padding: "8px",
        borderRadius: "4px",
        border: "1px solid #ccc",
        width: "100%",
        marginBottom: "8px"
      }}
      {...props}
    />
  );
}
