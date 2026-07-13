import { faSearch, faShuffle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { keyframes } from "@emotion/react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const shuffleAnimation = keyframes`
  0%, 100% { transform: translateX(-2px) rotate(-8deg); }
  50% { transform: translateX(2px) rotate(8deg) scale(1.12); }
`;

const findingAnimation = keyframes`
  0%, 100% { box-shadow: 0 0 0 rgba(220, 220, 255, 0); }
  50% { box-shadow: 0 0 12px rgba(220, 220, 255, 0.55); }
`;

const formStyles = (theme) => ({
  flex: "1 1 280px",
  minWidth: 0,
  "& .MuiInputLabel-outlined.Mui-focused, & .MuiInputLabel-outlined": {
    marginLeft: "-8px",
    [theme.breakpoints.down("mobileCard")]: {
      marginLeft: 0,
    },
  },
  "& .MuiInputLabel-outlined.Mui-focused": {
    color: "#DCDCFF",
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#DCDCFF",
  },
  "&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(255, 255, 255, 0.50)",
  },
});

const SearchBar = ({
  handleSearch,
  onRandomVod,
  onRemoveTag,
  randomVodDisabled = false,
  randomVodStatus = "idle",
  tags,
}) => {
  const [searchInput, setSearchInput] = useState("");

  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("mobileCard"));
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
    <Box
      sx={{
        alignItems: "center",
        display: "flex",
        flex: "0 1 750px",
        gap: { xs: 0.5, sm: 1 },
        margin: "16px 0 16px 16px",
        minWidth: 0,
      }}
    >
      <FormControl variant="outlined" sx={formStyles}>
        <InputLabel
          htmlFor="Searchbar"
          sx={{
            color: "rgba(220, 220, 255, .7)",
            fontSize: mobile ? 14 : "1rem",
            lineHeight: mobile ? "1.6em" : "1.4375em",
          }}
        >
          Search for games...
        </InputLabel>
        <OutlinedInput
          startAdornment={
            tags.length > 0 ? (
              <Stack direction="row" spacing={1} sx={{ mr: "8px" }}>
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
              </Stack>
            ) : null
          }
          id="Searchbar"
          type="search"
          autoComplete="off"
          value={searchInput}
          sx={{ borderRadius: "60px", marginLeft: -1, paddingRight: 3 }}
          onChange={(e) => setSearchInput(e.target.value)}
          label="Search for games..."
          endAdornment={
            <InputAdornment position="end">
              <IconButton aria-label="search for games" edge="end">
                <FontAwesomeIcon icon={faSearch} color="#C8D4FF" />
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>

      {onRandomVod && (
        <Button
          aria-label="Play a random VoD"
          disabled={randomVodDisabled || findingRandomVod}
          disableRipple
          onClick={onRandomVod}
          title={randomVodStatus === "error" ? "No eligible VOD found. Try again." : "Play a random VoD"}
          variant="outlined"
          sx={{
            borderColor: "rgba(220, 220, 255, 0.5)",
            borderRadius: "60px",
            color: "#DCDCFF",
            display: "flex",
            flexShrink: 0,
            height: 42,
            justifyContent: { xs: "center", mobileCard: "flex-start" },
            minWidth: { xs: 42, mobileCard: 160 },
            px: { xs: 0, mobileCard: 1.5 },
            whiteSpace: "nowrap",
            width: { xs: 42, mobileCard: 160 },
            animation: findingRandomVod
              ? `${findingAnimation} 900ms ease-in-out infinite`
              : "none",
            "&.Mui-disabled": {
              borderColor: findingRandomVod
                ? "rgba(220, 220, 255, 0.65)"
                : undefined,
              color: findingRandomVod ? "#DCDCFF" : undefined,
            },
            "& .random-vod-icon": {
              animation: findingRandomVod
                ? `${shuffleAnimation} 500ms ease-in-out infinite`
                : "none",
            },
            "& .random-vod-icon-container": {
              alignItems: "center",
              display: "flex",
              flex: "0 0 20px",
              justifyContent: "center",
            },
            "& .random-vod-label": {
              flex: "1 1 auto",
              minWidth: 0,
              textAlign: "center",
            },
            "&:hover": {
              borderColor: "#DCDCFF",
              backgroundColor: "rgba(220, 220, 255, 0.08)",
            },
          }}
        >
          <Box component="span" className="random-vod-icon-container">
            <FontAwesomeIcon
              className="random-vod-icon"
              icon={faShuffle}
            />
          </Box>
          <Box
            component="span"
            className="random-vod-label"
            sx={{ display: { xs: "none", mobileCard: "block" } }}
          >
            {randomVodStatus === "loading"
              ? "Finding..."
              : randomVodStatus === "error"
                ? "Try Again"
                : "Random VOD"}
          </Box>
        </Button>
      )}
    </Box>
  );
};

export default SearchBar;
