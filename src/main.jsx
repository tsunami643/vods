import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#242A43",
      paper: "rgba(255, 255, 255, 0.05)",
    },
    text: {
      primary: "#DCDCFF",
      secondary: "#B2B2DF"
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      mobileCard: 480,
      sm: 681,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  typography: {
    fontFamily: [
      "Montserrat",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),
  },
  components: {
    MuiLink: {
      styleOverrides: {
        root: {
          color: "white",
        },
      },
    },
  },
});

const root = createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <BrowserRouter
        basename={import.meta.env.BASE_URL}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <CssBaseline />
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
