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
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";

const SearchBar = ({
  availableTags = [],
  handleSearch,
  onAddTag,
  onRandomVod,
  onRemoveTag,
  randomVodDisabled = false,
  randomVodStatus = "idle",
  tags,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRefs = useRef([]);

  const findingRandomVod = randomVodStatus === "loading";
  const tagSuggestions = useMemo(() => {
    const normalizedSearch = searchInput.trim().toLocaleLowerCase();
    if (!normalizedSearch || tags.length >= 3) return [];

    return availableTags
      .filter((tag) => (
        !tags.includes(tag)
        && tag.toLocaleLowerCase().includes(normalizedSearch)
      ))
      .sort((firstTag, secondTag) => {
        const firstStartsWithSearch = firstTag.toLocaleLowerCase().startsWith(normalizedSearch);
        const secondStartsWithSearch = secondTag.toLocaleLowerCase().startsWith(normalizedSearch);

        if (firstStartsWithSearch !== secondStartsWithSearch) {
          return firstStartsWithSearch ? -1 : 1;
        }

        return firstTag.localeCompare(secondTag);
      })
      .slice(0, 8);
  }, [availableTags, searchInput, tags]);
  const suggestionsVisible = showSuggestions && tagSuggestions.length > 0;

  useEffect(() => {
    if (highlightedSuggestion < 0) return;

    suggestionRefs.current[highlightedSuggestion]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [highlightedSuggestion]);

  const handleDelete = (tag) => () => {
    if (onRemoveTag) {
      onRemoveTag(tag);
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setSearchInput(value);
    setHighlightedSuggestion(-1);
    setShowSuggestions(true);
    handleSearch(value);
  };

  const handleTagSelect = (tag) => {
    onAddTag?.(tag);
    setSearchInput("");
    setHighlightedSuggestion(-1);
    setShowSuggestions(false);
    handleSearch("");
  };

  const handleInputKeyDown = (event) => {
    if (!suggestionsVisible) return;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      setHighlightedSuggestion((currentIndex) => (
        currentIndex < 0 ? 0 : (currentIndex + 1) % tagSuggestions.length
      ));
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      setHighlightedSuggestion((currentIndex) => (
        currentIndex <= 0 ? tagSuggestions.length - 1 : currentIndex - 1
      ));
    } else if (event.key === "Enter" && highlightedSuggestion >= 0) {
      event.preventDefault();
      handleTagSelect(tagSuggestions[highlightedSuggestion]);
    } else if (event.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedSuggestion(-1);
    }
  };

  const renderActiveTags = (className) => (
    <Box className={className}>
      {tags.map((tag) => (
        <Chip
          label={tag}
          onDelete={handleDelete(tag)}
          size="small"
          key={tag}
        />
      ))}
    </Box>
  );

  return (
    <Box className="catalog-header-controls">
      <FormControl className="catalog-search-form" variant="outlined">
        <InputLabel
          className="catalog-search-label"
          htmlFor="Searchbar"
        >
          Search games or tags...
        </InputLabel>
        <OutlinedInput
          startAdornment={
            tags.length > 0
              ? renderActiveTags("catalog-search-tags catalog-search-tags-input")
              : null
          }
          id="Searchbar"
          className="catalog-search-input"
          type="search"
          autoComplete="off"
          value={searchInput}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setShowSuggestions(false)}
          onKeyDown={handleInputKeyDown}
          aria-autocomplete="list"
          aria-controls={suggestionsVisible ? "catalog-tag-suggestions" : undefined}
          aria-expanded={suggestionsVisible}
          aria-activedescendant={
            highlightedSuggestion >= 0
              ? `catalog-tag-suggestion-${highlightedSuggestion}`
              : undefined
          }
          label="Search games or tags..."
          endAdornment={
            <InputAdornment position="end">
              <IconButton aria-label="search games or tags" edge="end">
                <FontAwesomeIcon className="catalog-search-icon" icon={faSearch} />
              </IconButton>
            </InputAdornment>
          }
        />
        {tags.length > 0
          ? renderActiveTags("catalog-search-tags catalog-search-tags-mobile")
          : null}
        {suggestionsVisible && (
          <Box
            className="catalog-tag-suggestions"
            id="catalog-tag-suggestions"
            role="listbox"
            aria-label="Matching tags"
            onMouseDown={(event) => event.preventDefault()}
          >
            <Typography className="catalog-tag-suggestions-label">
              Tags:
            </Typography>
            <Box className="catalog-tag-suggestion-strip">
              {tagSuggestions.map((tag, index) => (
                <Chip
                  className={`catalog-tag-suggestion${
                    index === highlightedSuggestion ? " highlighted" : ""
                  }`}
                  id={`catalog-tag-suggestion-${index}`}
                  key={tag}
                  label={tag}
                  role="option"
                  aria-selected={index === highlightedSuggestion}
                  onClick={() => handleTagSelect(tag)}
                  onMouseEnter={() => setHighlightedSuggestion(index)}
                  ref={(element) => {
                    suggestionRefs.current[index] = element;
                  }}
                  size="small"
                  tabIndex={-1}
                />
              ))}
            </Box>
          </Box>
        )}
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
