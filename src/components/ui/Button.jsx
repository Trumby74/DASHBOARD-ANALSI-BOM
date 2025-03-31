import React from "react";

export function Button({ children, ...props }) {
  return (
    <button
      style={{
        padding: "8px 12px",
        borderRadius: "4px",
        background: "#007bff",
        color: "#fff",
        border: "none",
        cursor: "pointer"
      }}
      {...props}
    >
      {children}
    </button>
  );
}
