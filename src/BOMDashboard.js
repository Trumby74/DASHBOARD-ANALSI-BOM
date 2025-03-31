import { useEffect, useState, useMemo, useRef } from "react";

import * as XLSX from "xlsx";
import Select from "react-select";
import { FaTruck, FaCalendarAlt, FaFileAlt, FaExclamationTriangle } from "react-icons/fa";
import "./index.css";
import CountUp from "react-countup";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function BOMDashboard() {
const tdStyle = {
  padding: '6px',
  border: '1px solid #ddd',
  textAlign: 'center',
  wordWrap: 'break-word',
  overflowWrap: 'anywhere',
  whiteSpace: 'normal',
};

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
const [showInfo, setShowInfo] = useState(false);
const [showKpiFornitori, setShowKpiFornitori] = useState(false);


const modalStyle = {

  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  maxWidth: '90vw',
  minWidth: '600px',
  maxHeight: '80vh',
  overflowY: 'auto',
  backgroundColor: '#ffffff',
  border: '2px solid #a5d6a7',
  padding: '28px 36px',
  borderRadius: '16px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  fontFamily: "'Segoe UI', sans-serif",
  color: '#2e7d32',
  zIndex: 9999,
};

const kpiPanelRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 18;
  const [filters, setFilters] = useState({});
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [totalCosto, setTotalCosto] = useState(null);
// All'inizio di BOMDashboard()
const tableContainerRef = useRef(null);
const tableRef = useRef(null);
const scrollMirrorRef = useRef(null);
  const visibleColumns = [
    "BOM FILENAME",
    "NUMERO ORDINE CLIENTE",
    "DATA CONSEGNA PIANIFICATA",
    "TIPO MATERIALE",
    "POSIZIONE",
    "DENOMINAZIONE",
    "ANNOTAZIONI",
    "Q.TA'",
    "ANOMALIA SU  Q.TA' DA PROD_COMM.",
    "DESCRIZIONE MATERIALE",
    "MISURE GREZZE",
    "Q.TA' NECESSARIA DA ORDINARE (Kg/PZ)",
    "ANOMALIA SU Q.TA' MP",
    "MISURE FINITE",
    "FORNITORE",
    "DATA ORDINE A FORNITORE",
    "DATA CONSEGNA PREVISTA FORNITORE",
    "DATA DI ARRIVO EFFETTIVA",
    "NR. ORDINE FORNITORE",
    "PREZZO X U.M.",
    "STATO ORDINI",
    "ORDINI SCADUTI",
    "RIFERIMENTO ORDINI",
    "RIFERIMENTO PREZZO",
    "ANOMALIA PREZZO",
    "GG. ALLA CONSEGNA DL",
    "COSTO MP",
    "COSTO COMM.",
    "COSTO LAV.EST.",
    "COSTO PROG.EST.",
    "COSTO TRASPORTO",
    "COSTO TOTALE"
  ];
  useEffect(() => {
  if (showKpiFornitori && kpiPanelRef.current) {
    kpiPanelRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [showKpiFornitori]);

  useEffect(() => {
  const syncScroll = () => {
    if (tableRef.current && scrollMirrorRef.current) {
      const tableWidth = tableRef.current.scrollWidth;
      scrollMirrorRef.current.firstChild.style.width = `${tableWidth}px`;
    }
  };

  // Chiamo subito per sincronizzare la larghezza
  syncScroll();
  window.addEventListener("resize", syncScroll);

  // Eseguo la fetch dei dati
  fetch("/BOM-UNICA.xlsm")
    .then((res) => res.arrayBuffer())
    .then((ab) => {
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets["NUOVE BOM"];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const parsed = json.map((row) => {
        const newRow = {};
        for (const col of visibleColumns) {
          const matchingKey = Object.keys(row).find(k =>
            k.trim().toUpperCase() === col.trim().toUpperCase()
          );
          newRow[col] = matchingKey ? row[matchingKey] : "";
        }

        [
          "DATA CONSEGNA PIANIFICATA",
          "DATA CONSEGNA PREVISTA FORNITORE",
          "DATA ORDINE A FORNITORE",
          "DATA DI ARRIVO EFFETTIVA"
        ].forEach((field) => {
          const value = newRow[field];
          if (!value || value === "") {
            newRow[field] = "";
          } else if (!isNaN(value)) {
            newRow[field] = XLSX.SSF.format("dd/mm/yyyy", value);
          } else {
            const parsedDate = Date.parse(value);
            newRow[field] = isNaN(parsedDate)
              ? value
              : new Date(parsedDate).toLocaleDateString("it-IT");
          }
        });

        const costi = ["COSTO MP", "COSTO COMM.", "COSTO LAV.EST.", "COSTO PROG.EST.", "COSTO TRASPORTO"];
        let total = 0;

        costi.forEach((key) => {
          const val = parseFloat(newRow[key]);
          if (!isNaN(val)) total += val;
          newRow[key] = !isNaN(val)
            ? val.toLocaleString("it-IT", { style: "currency", currency: "EUR" })
            : "€ 0,00";
        });

        newRow["COSTO TOTALE"] = total.toLocaleString("it-IT", {
          style: "currency",
          currency: "EUR"
        });

        return newRow;
      });

      setData(parsed);
      setFilteredData(parsed);

      // Dopo il parsing, aggiorna larghezza scroll
      setTimeout(syncScroll, 100);
    });

  return () => {
    window.removeEventListener("resize", syncScroll);
  };
}, []);

 // DA QUI INIZIA IL BLOCCO useMemo

const uniqueBOMs = useMemo(() => [...new Set(data.map(r => r["BOM FILENAME"]))], [data]);

const bomVuote = useMemo(() => {
  const raggruppate = {};
  data.forEach(r => {
    const filename = r["BOM FILENAME"];
    if (!raggruppate[filename]) raggruppate[filename] = [];
    raggruppate[filename].push(r);
  });
  return Object.entries(raggruppate)
    .filter(([, righe]) => righe.every(r => !r["TIPO MATERIALE"]))
    .map(([nome]) => nome);
}, [data]);

const bomCostoZero = useMemo(() => {
  const tipiValidi = ["ACQUISTO MP", "ACQUISTI ALTRO MATERIALE", "LAVORAZIONE ESTERNA"];
  const validi = data.filter(r => tipiValidi.includes(r["TIPO MATERIALE"]));
  const raggruppate = {};
  validi.forEach(r => {
    const filename = r["BOM FILENAME"];
    if (!raggruppate[filename]) raggruppate[filename] = [];
    raggruppate[filename].push(r);
  });
  return Object.entries(raggruppate)
    .filter(([, righe]) =>
      righe.every(r => {
        const valore = parseFloat((r["COSTO TOTALE"] || "").replace(/[€\s.]/g, "").replace(",", "."));
        return isNaN(valore) || valore === 0;
      })
    )
    .map(([nome]) => nome);
}, [data]);

const percentualeVuote = ((bomVuote.length / uniqueBOMs.length) * 100).toFixed(1);
const percentualeZero = ((bomCostoZero.length / uniqueBOMs.length) * 100).toFixed(1);

  

  const applyFilters = (activeFilters) => {
    return data.filter((row) => {
      return Object.entries(activeFilters).every(([key, selected]) => {
        if (!selected) return true;
        return row[mapping[key]] === selected.value;
      });
    });
  };

const mapping = {
    source: "BOM FILENAME",
    dataPianificata: "DATA CONSEGNA PIANIFICATA",
    tipoMateriale: "TIPO MATERIALE",
    fornitore: "FORNITORE",
    dataPrevista: "DATA CONSEGNA PREVISTA FORNITORE",
    anomaliaQtaH: "ANOMALIA SU  Q.TA' DA PROD_COMM.",
    anomaliaQtaK: "ANOMALIA SU Q.TA' MP",
    statoOrdini: "STATO ORDINI",
    ordiniScaduti: "ORDINI SCADUTI",
    riferimentoPrezzo: "RIFERIMENTO PREZZO",
    riferimentoOrdini: "RIFERIMENTO ORDINI"
  };
    const buildOptions = (key) => {
  const tempFilters = { ...filters, [key]: null };
  const tempFiltered = applyFilters(tempFilters);
  const values = [...new Set(tempFiltered.map((row) => row[mapping[key]]).filter(Boolean))];

  let sortedValues;
  if (key.toLowerCase().includes("data")) {
    // Ordinamento reale per date nel formato gg/mm/aaaa
    sortedValues = values.sort((a, b) => {
      const [da, ma, ya] = a.split("/").map(Number);
      const [db, mb, yb] = b.split("/").map(Number);
      return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da); // decrescente
    });
  } else {
    // Ordinamento normale per testi
    sortedValues = values.sort((a, b) => a.localeCompare(b));
  }

  return sortedValues.map((v) => ({ value: v, label: v }));
};
  const handleSelectChange = (selected, { name }) => {
    const updatedFilters = { ...filters, [name]: selected };
    setFilters(updatedFilters);
    setCurrentPage(1);
    setFilteredData(applyFilters(updatedFilters));

    // Calcolo costo totale della BOM selezionata
    if (name === "source" && selected) {
      const relatedRows = data.filter(r => r["BOM FILENAME"] === selected.value);
      const somma = relatedRows.reduce((acc, row) => {
        const value = row["COSTO TOTALE"];
        const number = parseFloat(value.replace(/[€.,]/g, "").replace(/\s/g, "")) / 100;
        return acc + (isNaN(number) ? 0 : number);
      }, 0);
      setTotalCosto(somma.toLocaleString("it-IT", { style: "currency", currency: "EUR" }));
    } else {
      setTotalCosto(null);
    }
  };

  const stats = ["ACQUISTO MP", "ACQUISTI ALTRO MATERIALE", "LAVORAZIONE ESTERNA"].map(tipo => {
  const kpiFilters = ["source", "fornitore", "dataPianificata"];
  const isKpiFilterActive = kpiFilters.some(key => filters[key]);

  const source = isKpiFilterActive ? filteredData : data;
  const rows = source.filter(row => row["TIPO MATERIALE"] === tipo);
  const total = rows.length;
  const daEmettere = rows.filter(row => row["STATO ORDINI"] === "📌 ORDINE DA EMETTERE").length;
  const scaduti = rows.filter(row => row["STATO ORDINI"] === "⚠️ RICEVIMENTO SCADUTO").length;
  const ok = total - daEmettere - scaduti;
 
  return {
    tipo,
    total,
    daEmettere,
    daEmetterePerc: ((daEmettere / total) * 100 || 0).toFixed(1),
    scaduti,
    scadutiPerc: ((scaduti / total) * 100 || 0).toFixed(1),
    ok,
    okPerc: ((ok / total) * 100 || 0).toFixed(1)
  };
});

const kpiPerFornitore = useMemo(() => {
  const fornitori = [...new Set(data.map(r => r["FORNITORE"]).filter(Boolean))];

  return fornitori
    .filter(f => !["DI LODOVICO D.O.O.", "MAGAZZINO 1", "MAGAZZINO 2"].includes(f))
    .map(forn => {
      const righe = data.filter(r => r["FORNITORE"] === forn);

      const ordiniInCorso = righe.length;

      const valoreTotale = righe.reduce((acc, r) => {
        const num = parseFloat((r["COSTO TOTALE"] || "").replace(/[^\d,.-]/g, "").replace(".", "").replace(",", "."));
        return acc + (isNaN(num) ? 0 : num);
      }, 0);

      const giorniAttesa = righe
        .map(r => {
          const ordine = parseDate(r["DATA ORDINE A FORNITORE"]);
          const prevista = parseDate(r["DATA CONSEGNA PREVISTA FORNITORE"]);
          return ordine && prevista ? (prevista - ordine) / (1000 * 60 * 60 * 24) : null;
        })
        .filter(v => v !== null);

      const giorniArrivo = righe
        .map(r => {
          const ordine = parseDate(r["DATA ORDINE A FORNITORE"]);
          const arrivo = parseDate(r["DATA DI ARRIVO EFFETTIVA"]);
          return ordine && arrivo ? (arrivo - ordine) / (1000 * 60 * 60 * 24) : null;
        })
        .filter(v => v !== null);

      const ritardoPrevisto = righe
        .map(r => {
          const pianificata = parseDate(r["DATA CONSEGNA PIANIFICATA"]);
          const prevista = parseDate(r["DATA CONSEGNA PREVISTA FORNITORE"]);
          return pianificata && prevista ? (prevista - pianificata) / (1000 * 60 * 60 * 24) : null;
        })
        .filter(v => v !== null);

      const ritardoEffettivo = righe
        .map(r => {
          const pianificata = parseDate(r["DATA CONSEGNA PIANIFICATA"]);
          const arrivo = parseDate(r["DATA DI ARRIVO EFFETTIVA"]);
          return pianificata && arrivo ? (arrivo - pianificata) / (1000 * 60 * 60 * 24) : null;
        })
        .filter(v => v !== null);

      const media = (array) =>
        array.length ? (array.reduce((a, b) => a + b) / array.length).toFixed(1) : "—";

      return {
        fornitore: forn,
        ordiniInCorso,
        valoreTotale: valoreTotale.toLocaleString("it-IT", { style: "currency", currency: "EUR" }),
        mediaAttesa: media(giorniAttesa),
        mediaArrivo: media(giorniArrivo),
        ritardoPrevisto: media(ritardoPrevisto),
        ritardoEffettivo: media(ritardoEffettivo),
      };
    });
}, [data]);

function parseDate(str) {
  if (!str || typeof str !== "string") return null;
  const [d, m, y] = str.split("/");
  if (!d || !m || !y) return null;
  return new Date(+y, +m - 1, +d);
}

const generaReportAutomatico = () => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "A4"
  });

  const logo = new Image();
  logo.src = "/logo.jpg";

  logo.onload = () => {
    const columns = [
      "BOM FILENAME", "NUMERO ORDINE", "CLIENTE", "DATA CONSEGNA PIANIFICATA",
      "TIPO MATERIALE", "POSIZIONE", "DENOMINAZIONE", "ANNOTAZIONI", "Q.TA'",
      "DESCRIZIONE MATERIALE", "MISURE GREZZE", "Q.TA' NECESSARIA DA ORDINARE (Kg/PZ)",
      "MISURE FINITE", "FORNITORE", "DATA ORDINE", "DATA CONSEGNA PREVISTA",
      "DATA DI ARRIVO EFFETTIVA", "NR. ORDINE", "PREZZO X U.M."
    ];

    const gruppiFiltri = [
      { titolo: "📌 ORDINE DA EMETTERE", colonna: "STATO ORDINI", valore: "📌 ORDINE DA EMETTERE" },
      { titolo: "⚠️ RICEVIMENTO SCADUTO", colonna: "STATO ORDINI", valore: "⚠️ RICEVIMENTO SCADUTO" },
      { titolo: "📌 PREZZO MANCANTE", colonna: "RIFERIMENTO PREZZO", valore: "📌 Prezzo Mancante" },
      { titolo: "📌 NR ORDINE MANCANTE", colonna: "RIFERIMENTO ORDINI", valore: "📌 Nr. Ordine Mancante" },
      { titolo: "⚠️ Q.TA' NON INSERITA", colonna: "ANOMALIA Q.TA' DA PRODURRE/COMM.", valore: "⚠️ Q.ta' non inserita" },
      { titolo: "⚠️ Q.TA' NON INSERITA", colonna: "ANOMALIA SU Q.TA' MP", valore: "⚠️ Q.ta' non inserita" },
      { titolo: "⚠️ Q.TA' NON NUMERICA", colonna: "ANOMALIA Q.TA' DA PRODURRE/COMM.", valore: "⚠️ Q.ta' non numerica" },
      { titolo: "⚠️ Q.TA' NON NUMERICA", colonna: "ANOMALIA SU Q.TA' MP", valore: "⚠️ Q.ta' non numerica" }
    ];

    gruppiFiltri.forEach((filtro, idx) => {
      const datiFiltro = filteredData.filter(row => row[filtro.colonna] === filtro.valore);

      const righe = datiFiltro.map(row => {
        const visibili = columns.map(col => row[col] ?? "");
        const invisibili = {
          "STATO ORDINI": row["STATO ORDINI"] ?? "",
          "RIFERIMENTO PREZZO": row["RIFERIMENTO PREZZO"] ?? "",
          "RIFERIMENTO ORDINI": row["RIFERIMENTO ORDINI"] ?? "",
          "ANOMALIA Q.TA' DA PRODURRE/COMM.": row["ANOMALIA Q.TA' DA PRODURRE/COMM."] ?? "",
          "ANOMALIA SU Q.TA' MP": row["ANOMALIA SU Q.TA' MP"] ?? ""
        };
        return Object.assign([...visibili], invisibili);
      });

      autoTable(doc, {
        head: [columns],
        body: righe,
        startY: 90,
        styles: {
          font: "helvetica",
          fontSize: 6,
          cellPadding: 2,
          overflow: "linebreak",
          valign: "middle"
        },
        headStyles: {
          fillColor: [33, 150, 243],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 6.2,
          halign: "center",
          valign: "top"
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 65, left: 30, right: 30 },
        theme: "grid",
        didDrawPage: (data) => {
          const pageHeight = doc.internal.pageSize.getHeight();
          const pageWidth = doc.internal.pageSize.getWidth();

          doc.addImage(logo, "JPEG", 30, 25, 80, 40);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(0);
          doc.text("Riepilogo automatico delle anomalie", 130, 30);

          // Highlight giallo per filtro attivo
          doc.setFont("helvetica", "italic");
doc.setFontSize(8);
doc.setTextColor(80);
const testoPulito = filtro.titolo.replace(/[^\x20-\x7E]/g, "");
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.text(`Filtro applicato: ${testoPulito}`, 130, 44);


          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(`Documento generato il ${new Date().toLocaleDateString("it-IT")}`, 30, pageHeight - 20);
          doc.text("Firma: Umysoft", 30, pageHeight - 8);
          doc.text(`Pagina ${doc.internal.getNumberOfPages()}`, pageWidth - 70, pageHeight - 8);
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            const colIndex = data.column.index;
            const colName = columns[colIndex];
            const row = data.row.raw;

            if (colName === "DATA ORDINE" && row["STATO ORDINI"] === "📌 ORDINE DA EMETTERE") {
              data.cell.styles.fillColor = [255, 102, 102];
            }

            if (colName === "DATA CONSEGNA PREVISTA" && row["STATO ORDINI"] === "⚠️ RICEVIMENTO SCADUTO") {
              data.cell.styles.fillColor = [255, 204, 153];
            }

            if (colName === "PREZZO X U.M." && row["RIFERIMENTO PREZZO"] === "📌 Prezzo Mancante") {
              data.cell.styles.fillColor = [255, 102, 102];
            }

            if (colName === "NR. ORDINE" && row["RIFERIMENTO ORDINI"] === "📌 Nr. Ordine Mancante") {
              data.cell.styles.fillColor = [255, 102, 102];
            }

            if (colName === "Q.TA'") {
  const anomaliaComm = row["ANOMALIA Q.TA' DA PRODURRE/COMM."];
  if (anomaliaComm === "⚠️ Q.ta' non inserita") {
    data.cell.styles.fillColor = [255, 204, 153]; // arancione
  } else if (anomaliaComm === "⚠️ Q.ta' non numerica") {
    data.cell.styles.fillColor = [255, 255, 153]; // giallo
  }
}

if (colName === "Q.TA' NECESSARIA DA ORDINARE (Kg/PZ)") {
  const anomaliaMP = row["ANOMALIA SU Q.TA' MP"];
  if (anomaliaMP === "⚠️ Q.ta' non inserita") {
    data.cell.styles.fillColor = [255, 204, 153]; // arancione
  } else if (anomaliaMP === "⚠️ Q.ta' non numerica") {
    data.cell.styles.fillColor = [255, 255, 153]; // giallo
  }
}

          }
        }
      });

      if (idx < gruppiFiltri.length - 1) {
        doc.addPage();
      }
    });

    window.open(doc.output("bloburl"), "_blank");
  };
};








const esportaPDF = () => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "A4",
  });

  const logo = new Image();
  logo.src = "/logo.jpg";

  logo.onload = () => {
    const columns = [
      "BOM FILENAME", "NUMERO ORDINE", "CLIENTE", "DATA CONSEGNA PIANIFICATA",
      "TIPO MATERIALE", "POSIZIONE", "DENOMINAZIONE", "ANNOTAZIONI", "Q.TA'",
      "DESCRIZIONE MATERIALE", "MISURE GREZZE", "Q.TA' NECESSARIA DA ORDINARE (Kg/PZ)",
      "MISURE FINITE", "FORNITORE", "DATA ORDINE", "DATA CONSEGNA PREVISTA",
      "DATA DI ARRIVO EFFETTIVA", "NR. ORDINE", "PREZZO X U.M."
    ];

    const intestazioni = [columns];

    const righe = filteredData.map(row => {
  // Colonne visibili nella tabella PDF
  const visibili = columns.map(col => row[col] ?? "");

  // Colonne NASCOSTE ma usate nei controlli dei colori
  const invisibili = {
    "STATO ORDINI": row["STATO ORDINI"] ?? "",
    "RIFERIMENTO PREZZO": row["RIFERIMENTO PREZZO"] ?? "",
    "RIFERIMENTO ORDINI": row["RIFERIMENTO ORDINI"] ?? "",
    "ANOMALIA Q.TA' DA PRODURRE/COMM.": row["ANOMALIA Q.TA' DA PRODURRE/COMM."] ?? "",
    "ANOMALIA SU Q.TA' MP": row["ANOMALIA SU Q.TA' MP"] ?? ""
  };

  return Object.assign([...visibili], invisibili);
});


    const filtriAttivi = Object.entries(filters).filter(([_, val]) => val);

    autoTable(doc, {
  head: [columns],
  body: righe,
  startY: 90,
  styles: {
    font: "helvetica",
    fontSize: 6,
    cellPadding: 2,
    overflow: "linebreak",
    valign: "middle"
  },
  headStyles: {
    fillColor: [33, 150, 243],
    textColor: 255,
    fontStyle: "bold",
    fontSize: 6.2,
    halign: "center",
    valign: "top"
  },
  alternateRowStyles: {
    fillColor: [245, 245, 245]
  },
  margin: { top: 65, left: 30, right: 30 },
  theme: "grid",
  


});

    // Apri PDF
    window.open(doc.output("bloburl"), "_blank");
  };
};



  return (
    <div className="container fade-in">
  <div className="title-bar sticky-header">
  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
    <span role="img" aria-label="box">📦</span>
    <h1 style={{ margin: 0 }}>Dashboard Analisi BOM</h1>
  </div>
  <img
  src="/LOGO.jpg"
  alt="Logo Di Lodovico"
  style={{
    height: "65px",       // più grande
    maxWidth: "160px",    // evita che invada troppo
    objectFit: "contain",
    marginLeft: "20px"
  }}
/>

</div>


  <div className="filters sticky-header">
    {[
  "source", "dataPianificata", "tipoMateriale", "fornitore", "dataPrevista",
  "anomaliaQtaH", "anomaliaQtaK", "statoOrdini", "ordiniScaduti", "riferimentoPrezzo", "riferimentoOrdini"
].map((key, index) => {
  const filteredCount = applyFilters({ ...filters }).length;

  return (
    <div
      className={`filter ${index >= 5 ? "special-filter" : ""} ${key === "riferimentoOrdini" ? "narrow-filter" : ""}`}
      key={key}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Select
          classNamePrefix={`select-${index < 5 ? "blu" : "rosso"}${filters[key] ? "-active" : ""}`}
          name={key}
          options={buildOptions(key, key.toLowerCase().includes("data") ? "desc" : "asc")}
          placeholder={`Filtra per ${mapping[key]}`}
          value={filters[key]}
          onChange={handleSelectChange}
          isClearable
        />
        {filters[key] && (
          <span className="badge-count">{filteredCount}</span>
        )}
      </div>
    </div>
  );
})}

  </div> {/* ⬅️ FINE .filters */}

 



      {totalCosto && (
  <div className="total-cost-display">Costo totale BOM selezionata: <strong>{totalCosto}</strong></div>
)}

<div className="top-stats-wrapper horizontal-stats" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
{/* 🔘 PULSANTE INFO */}
<button
  onClick={() => setShowInfo(!showInfo)}
  style={{
    marginTop: "12px",
    backgroundColor: "#1565c0",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
  }}
>
  📋 Info Dashboard
</button>
<button
  onClick={() => setShowKpiFornitori(!showKpiFornitori)}
  style={{
    marginTop: "12px",
    marginLeft: "10px",
    backgroundColor: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
  }}
>
  📊 KPI Fornitori
</button>
<button
  onClick={esportaPDF}
  style={{
    marginTop: "12px",
    marginLeft: "10px",
    backgroundColor: "#6a1b9a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
  }}
>
  📄 Esporta in PDF
</button>
<button
  onClick={generaReportAutomatico}
  style={{
    marginTop: "12px",
    marginLeft: "10px",
    backgroundColor: "#f57c00",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
  }}
>
  🧠 Genera PDF Automatico
</button>

  {/* Box statistiche giallo */}
  <div className="bom-stats-box">
    <table>
      <tbody>
        <tr>
          <td>Nr BOM attive:</td>
          <td><span className="value"><CountUp end={uniqueBOMs.length} duration={2.5} /></span></td>
        </tr>
        <tr>
          <td>BOM non compilate:</td>
          <td>
            <span className="value"><CountUp end={bomVuote.length} duration={2.5} /></span>
            &nbsp;<span className="percent">({percentualeVuote}%)</span>
          </td>
        </tr>
        <tr>
          <td>BOM con costo totale = 0 (su tipi significativi):</td>
          <td>
            <span className="value"><CountUp end={bomCostoZero.length} duration={2.5} /></span>
            &nbsp;<span className="percent">({percentualeZero}%)</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  {/* Box KPI + pulsanti scroll affiancati */}
<div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
  <div className="summary">
    <div className="summary-title">KPI Ordini</div>
    <table className="summary-table">
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Totale</th>
          <th>Da Emettere</th>
          <th>Scaduti</th>
          <th>OK</th>
        </tr>
      </thead>
      <tbody>
        {stats.map((s, idx) => (
          <tr key={idx}>
            <td>{s.tipo}</td>
            <td><span className="value"><CountUp end={s.total} duration={2.5} /></span></td>
            <td><span className="value"><CountUp end={s.daEmettere} duration={2.5} /></span> (<span className="percent">{s.daEmetterePerc}%</span>)</td>
            <td><span className="value"><CountUp end={s.scaduti} duration={2.5} /></span> (<span className="percent">{s.scadutiPerc}%</span>)</td>
            <td><span className="value"><CountUp end={s.ok} duration={2.5} /></span> (<span className="percent">{s.okPerc}%</span>)</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Pulsanti scroll orizzontali */}
 <button
      onClick={() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollLeft = 0;
        }
      }}
      style={{
        padding: '8px 16px',
        backgroundColor: '#455a64',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}
    >
      ⬅️ Torna all’inizio
    </button>
  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
   

    <button
      onClick={() => {
        if (tableContainerRef.current) {
          const costoCol = document.querySelector(".col-total-cost");
          if (costoCol) {
            const offsetLeft = costoCol.offsetLeft;
            tableContainerRef.current.scrollLeft = offsetLeft - 200;
          }
        }
      }}
      style={{
        padding: '8px 16px',
        backgroundColor: '#1976d2',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}
    >
      ➡️ Vai ai Costi
    </button>


  </div>
</div>


</div>



      
      {/* Paginazione in alto */}
      <div className="pagination" style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
  Righe {Math.min(filteredData.length, (currentPage - 1) * rowsPerPage + 1)}-
  {Math.min(currentPage * rowsPerPage, filteredData.length)} di {filteredData.length}
</span>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Array.from({ length: Math.ceil(filteredData.length / rowsPerPage) }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              style={{
                padding: '4px 8px',
                fontWeight: currentPage === i + 1 ? 'bold' : 'normal',
                backgroundColor: currentPage === i + 1 ? '#1976d2' : '#e3f2fd',
                color: currentPage === i + 1 ? '#fff' : '#000',
                border: '1px solid #90caf9',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
   

{/* Pulsanti di scroll tabella */}

<div
  className="table-scroll-mirror"
  style={{
    overflowX: "scroll",
    overflowY: "hidden",
    height: "16px",
    marginBottom: "2px"
  }}
  ref={(el) => {
    scrollMirrorRef.current = el;
    if (el && tableContainerRef.current) {
      el.onscroll = () => {
        tableContainerRef.current.scrollLeft = el.scrollLeft;
      };
      tableContainerRef.current.onscroll = () => {
        el.scrollLeft = tableContainerRef.current.scrollLeft;
      };
    }
  }}
>
  <div style={{ height: "1px" }} />
</div>



     <div className="table-container reduced-height" ref={tableContainerRef}>

        <table ref={tableRef}>
<thead>
  <tr>
    {visibleColumns.map((col, index) => {
      let className = "";
      if (index === 0) className = "sticky-header-col-1";
      else if (index === 1) className = "sticky-header-col-2";
      else if (index === 2) className = "sticky-header-col-3";

      return (
        <th key={col} className={className}>
          {col}
        </th>
      );
    })}
  </tr>
</thead>


<tbody>
  {filteredData
            .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
            .map((row, i) => {
    const globalIndex = (currentPage - 1) * rowsPerPage + i;
const isSelected = selectedRowIndex === globalIndex;


    return (
      <tr
        key={i}
        className={isSelected ? "selected-row" : ""}
        onClick={() => setSelectedRowIndex(i)}
      >
        {visibleColumns.map((col, j) => {
          let className = "";
          if (j === 0) className = "sticky-body-col-1";
else if (j === 1) className = "sticky-body-col-2";
else if (j === 2) className = "sticky-body-col-3";

          return (
  <td
  key={j}
  className={className + (col === "COSTO TOTALE" ? " col-total-cost" : "")}
  style={{
    backgroundColor:
      (col === "DATA CONSEGNA PREVISTA FORNITORE" && row["STATO ORDINI"] === "⚠️ RICEVIMENTO SCADUTO") ? "#ffcdd2" :
      (col === "PREZZO X U.M." && !row[col]) ? "#f28b82" :
      (col === "NR. ORDINE FORNITORE" && !row[col]) ? "#f28b82" :
      "",
    color:
      (col === "DATA CONSEGNA PREVISTA FORNITORE" && row["STATO ORDINI"] === "⚠️ RICEVIMENTO SCADUTO") ? "#b71c1c" :
      (["PREZZO X U.M.", "NR. ORDINE FORNITORE"].includes(col) && !row[col]) ? "#f28b82" :
      "",
    fontWeight:
      (["PREZZO X U.M.", "NR. ORDINE FORNITORE", "DATA CONSEGNA PREVISTA FORNITORE"].includes(col) &&
      (!row[col] || row["STATO ORDINI"] === "⚠️ RICEVIMENTO SCADUTO")) ? "bold" :
      ""
  }}
>
  {row[col]}
</td>


          );
        })}
      </tr>
    );
  })}
</tbody>






        </table>
      </div>
{showInfo && (
  <div
    className="info-panel"
    style={{
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "860px",
padding: "32px 42px",
fontSize: "17px",

      background: "linear-gradient(145deg, #fdf6e3, #fffaf0)",
      border: "2px solid #d2b48c",
      borderRadius: "16px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
      fontFamily: "'Georgia', serif",
      color: "#3e2723",
      zIndex: 9999
    }}
  >
    <h2 style={{ textAlign: "center", marginTop: 0, color: "#6d4c41" }}>📜 Info Dashboard</h2>
    <hr style={{ border: "1px solid #c0a16b", marginBottom: "16px" }} />

    <p><strong>🔎 Filtri attivi:</strong></p>
    <ul>
      {Object.entries(filters)
        .filter(([key, val]) => val)
        .map(([key, val]) => (
          <li key={key}>
            {mapping[key]}: <strong>{val.label}</strong>
          </li>
        ))}
    </ul>

    <p style={{ marginTop: "18px" }}><strong>📊 Totale risultati:</strong> {filteredData.length}</p>
    <p>
      <strong>💰 Totale COSTO TOTALE:</strong><br />
      {
        filteredData.reduce((acc, row) => {
          const num = parseFloat(
            row["COSTO TOTALE"].replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".")
          );
          return acc + (isNaN(num) ? 0 : num);
        }, 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" })
      }
    </p>

    <div style={{ marginTop: "18px" }}>
      <strong>⚠️ Dettaglio anomalie:</strong>
      <ul>
        <li>❌ Prezzo mancante: {filteredData.filter(r => !r["PREZZO X U.M."]).length}</li>
        <li>❌ Nr Ordine mancante: {filteredData.filter(r => !r["NR. ORDINE FORNITORE"]).length}</li>
        <li>⚠️ Q.ta' da produrre/commessa: {filteredData.filter(r => r["ANOMALIA SU  Q.TA' DA PROD_COMM."]).length}</li>
        <li>⚠️ Q.ta' MP anomala: {filteredData.filter(r => r["ANOMALIA SU Q.TA' MP"]).length}</li>
      </ul>
    </div>

    <div style={{ textAlign: "center", marginTop: "26px" }}>
      <button
        onClick={() => setShowInfo(false)}
        style={{
          padding: "8px 20px",
          border: "none",
          borderRadius: "8px",
          backgroundColor: "#8d6e63",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
        }}
      >
        Chiudi
      </button>
    </div>
  </div>
)}


{showKpiFornitori && (
  <div
    className="info-panel"
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'auto',
      maxWidth: '95vw',
      minWidth: '700px',
      backgroundColor: '#fefefe',
      border: '1px solid #ccc',
      borderRadius: '14px',
      boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
      fontFamily: 'Segoe UI, Tahoma, sans-serif',
      color: '#333',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* HEADER FISSO */}
    <div
      style={{
        backgroundColor: '#fff',
        padding: '20px 32px',
        borderBottom: '1px solid #ddd',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <h2 style={{ margin: 0, textAlign: 'center', color: '#1a237e', fontWeight: 'bold' }}>
        📊 KPI per Fornitore
      </h2>
    </div>

    {/* CONTENUTO SCROLLABILE */}
    <div style={{
      maxHeight: '70vh',
  overflowY: 'auto',
  padding: '0 32px',
  position: 'relative',
}}>
     <table
  className="summary-table"
  style={{
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    fontSize: '0.85rem',
    backgroundColor: '#fff',
  }}
>
  <thead>
  <tr style={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "#e8eaf6" }}>
    {[
      'Fornitore',
      'Nr Ordini',
      'Valore Totale',
      'Media Attesa (gg)',
      'Media Arrivo Eff. (gg)',
      'Ritardo Medio Previsto',
      'Ritardo Medio Effettivo',
    ].map((header, i) => (
      <th
        key={i}
        style={{
          padding: '10px 6px',
          border: '1px solid #ccc',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          backgroundColor: '#e8eaf6',
          zIndex: 21,
        }}
      >
        {header}
      </th>
    ))}
  </tr>
</thead>

  <tbody>
    {kpiPerFornitore.map((kpi, i) => (
      <tr key={i}>
        <td style={{ ...tdStyle, textAlign: 'left' }}>{kpi.fornitore}</td>

        <td style={tdStyle}>{kpi.ordiniInCorso}</td>
        <td style={tdStyle}>{kpi.valoreTotale}</td>
        <td style={tdStyle}>{kpi.mediaAttesa}</td>
        <td style={tdStyle}>{kpi.mediaArrivo}</td>
        <td style={tdStyle}>{kpi.ritardoPrevisto}</td>
        <td style={tdStyle}>{kpi.ritardoEffettivo}</td>
      </tr>
    ))}
  </tbody>
</table>


      <div style={{ textAlign: 'center', marginTop: '28px' }}>
        <button
          onClick={() => setShowKpiFornitori(false)}
          style={{
            padding: '10px 24px',
            backgroundColor: '#1a237e',
            color: '#fff',	
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  </div>
)}




      {/* Paginazione */}
      <div className="pagination" style={{ marginTop: '10px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
        {Array.from({ length: Math.ceil(filteredData.length / rowsPerPage) }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            style={{
              padding: '4px 8px',
              fontWeight: currentPage === i + 1 ? 'bold' : 'normal',
              backgroundColor: currentPage === i + 1 ? '#1976d2' : '#e3f2fd',
              color: currentPage === i + 1 ? '#fff' : '#000',
              border: '1px solid #90caf9',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

    </div>
  );
} 