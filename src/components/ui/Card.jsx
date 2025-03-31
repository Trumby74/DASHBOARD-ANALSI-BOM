import React from "react";

export function Card({ children }) {
  return (
    <div style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "16px", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
      {children}
    </div>
  );
}

export function CardContent({ children }) {
  return <div>{children}</div>;
}
