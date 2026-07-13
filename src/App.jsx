import React from "react";

import CatalogPage from "./features/catalog/CatalogPage";
import CatalogShell from "./features/catalog/CatalogShell";
import PlaylistPage from "./features/catalog/PlaylistPage";
import useCatalog from "./features/catalog/useCatalog";
import VideoPage from "./features/video/VideoPage";
import useAppRoute, { APP_PAGE } from "./routes";

const App = () => {
  const { page, playlistId, videoId } = useAppRoute();
  const {
    addTag,
    clearSearch,
    error: catalogError,
    filteredGames: searchResults,
    handleSearch,
    loading: initialGamesLoad,
    removeTag,
    searchKey,
    tags: tagArray,
  } = useCatalog({ isHomePage: page === APP_PAGE.catalog });

  if (page === APP_PAGE.video) {
    return <VideoPage videoId={videoId} />;
  }

  return (
    <CatalogShell
      handleSearch={handleSearch}
      onRemoveTag={removeTag}
      searchKey={searchKey}
      tags={tagArray}
    >
      {page === APP_PAGE.playlist ? (
        <PlaylistPage playlistId={playlistId} />
      ) : (
        <CatalogPage
          addTag={addTag}
          clearSearch={clearSearch}
          error={catalogError}
          games={searchResults}
          loading={initialGamesLoad}
        />
      )}
    </CatalogShell>
  );
};

export default App;
