import { faSearch, faShuffle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const SearchBar = ({
  handleSearch,
  onRandomVod,
  onRemoveTag,
  randomVodDisabled = false,
  randomVodStatus = "idle",
  tags,
}) => {
  const [searchInput, setSearchInput] = useState("");

  const findingRandomVod = randomVodStatus === "loading";

  const handleDelete = (tag) => () => {
    if (onRemoveTag) {
      onRemoveTag(tag);
    }
  };

  useEffect(() => {
    handleSearch(searchInput);
  }, [searchInput, handleSearch]);

  return (
    <Box className="catalog-header-controls">
      <FormControl className="catalog-search-form" variant="outlined">
        <InputLabel
          className="catalog-search-label"
          htmlFor="Searchbar"
        >
          Search for games...
        </InputLabel>
        <OutlinedInput
          startAdornment={
            tags.length > 0 ? (
              <Box className="catalog-search-tags">
                {tags.map((tag) => {
                  return (
                    <Chip
                      label={tag}
                      onDelete={handleDelete(tag)}
                      size="small"
                      key={tag}
                    />
                  );
                })}
              </Box>
            ) : null
          }
          id="Searchbar"
          className="catalog-search-input"
          type="search"
          autoComplete="off"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          label="Search for games..."
          endAdornment={
            <InputAdornment position="end">
              <IconButton aria-label="search for games" edge="end">
                <FontAwesomeIcon className="catalog-search-icon" icon={faSearch} />
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>

      {onRandomVod && (
        <Button
          aria-label="Play a random VoD"
          className={`random-vod-header-button${findingRandomVod ? " finding" : ""}`}
          disabled={randomVodDisabled || findingRandomVod}
          disableRipple
          onClick={onRandomVod}
          variant="outlined"
        >
          <Box component="span" className="random-vod-icon-container">
            <FontAwesomeIcon
              className="random-vod-icon"
              icon={faShuffle}
            />
          </Box>
          <Box component="span" className="random-vod-label">
            {randomVodStatus === "loading"
              ? "Finding..."
              : randomVodStatus === "error"
                ? "Try Again"
                : "Random VoD"}
          </Box>
        </Button>
      )}
    </Box>
  );
};

export default SearchBar;
