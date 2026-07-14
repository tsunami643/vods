import { AppBar, Box, Toolbar } from "@mui/material";

import Footer from "../../shared/Footer";
import Header from "../../shared/Header";
import SearchBar from "./SearchBar";
import "../../styles/Header.css";

export default function CatalogShell({
  children,
  handleSearch,
  onRandomVod,
  onRemoveTag,
  randomVodDisabled,
  randomVodStatus,
  searchKey,
  tags,
  viewportConstrained = false,
}) {
  return (
    <Box className={`catalog-shell${viewportConstrained ? " viewport-constrained" : ""}`}>
      <AppBar className="catalog-header-app-bar" position="sticky">
        <Toolbar className="catalog-header-toolbar">
          <Header />
          <SearchBar
            key={searchKey}
            handleSearch={handleSearch}
            onRandomVod={onRandomVod}
            tags={tags}
            onRemoveTag={onRemoveTag}
            randomVodDisabled={randomVodDisabled}
            randomVodStatus={randomVodStatus}
          />
        </Toolbar>
      </AppBar>

      <Box className="catalog-shell-content">
        {children}
      </Box>

      <Footer />
    </Box>
  );
}
