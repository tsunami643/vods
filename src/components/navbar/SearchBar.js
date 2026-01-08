import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
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
import { makeStyles } from "@mui/styles";
import React, { useEffect, useState } from "react";

const useStyles = makeStyles((theme) => ({
  form: {
    margin: "16px 0px 16px 16px",
    minWidth: "30%",
    "& .MuiInputLabel-outlined.Mui-focused, .MuiInputLabel-outlined": {
      marginLeft: -8,
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
  },
}));

const SearchBar = ({ handleSearch, tags, onRemoveTag }) => {
  const [searchInput, setSearchInput] = useState("");

  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("mobileCard"));

  const classes = useStyles();

  const handleDelete = (tag) => () => {
    if (onRemoveTag) {
      onRemoveTag(tag);
    }
  };

  useEffect(() => {
    handleSearch(searchInput);
  }, [searchInput, handleSearch]);

  return (
    <FormControl variant="outlined" className={classes.form}>
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
            <Stack direction="row" spacing={1} marginRight="8px">
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
  );
};

export default SearchBar;
