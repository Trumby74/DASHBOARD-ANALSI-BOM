import React from "react";

export function Table({ children }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      {children}
    </table>
  );
}

export function TableHeader({ children }) {
  return <thead style={{ background: "#f0f0f0" }}>{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children }) {
  return <tr style={{ borderBottom: "1px solid #ddd" }}>{children}</tr>;
}

export function TableHead({ children }) {
  return <th style={{ padding: "8px", textAlign: "left" }}>{children}</th>;
}

export function TableCell({ children }) {
  return <td style={{ padding: "8px" }}>{children}</td>;
}
