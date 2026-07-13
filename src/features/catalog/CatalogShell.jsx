import { AppBar, Box, Toolbar } from "@mui/material";

import Footer from "../../shared/Footer";
import Header from "../../shared/Header";
import SearchBar from "./SearchBar";

export default function CatalogShell({
  children,
  handleSearch,
  onRemoveTag,
  searchKey,
  tags,
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar
        position="sticky"
        sx={{
          bgcolor: "#242A43",
          backgroundImage: "none",
          boxShadow: "0px 2px 40px 0px rgb(0 0 0 / 40%)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Header />
          <SearchBar
            key={searchKey}
            handleSearch={handleSearch}
            tags={tags}
            onRemoveTag={onRemoveTag}
          />
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>

      <Footer />
    </Box>
  );
}
