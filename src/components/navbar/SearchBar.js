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
import React, { useCallback, useEffect, useState } from "react";

// Class names from https://stackoverflow.com/questions/58963242/change-border-color-on-material-ui-textfield
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

const SearchBar = ({ handleSearch, tags }) => {
  const [searchInput, setSearchInput] = useState("");
  const [inputValue, setInputValue] = React.useState("");
  const [selectedItem, setSelectedItem] = React.useState([]);

  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("mobileCard"));

  const classes = useStyles();

  // Displays initial set of games on page load and whenever search is performed
  // useEffect(() => {
  //   searchParams ? handleSearch(searchParams) : handleSearch("");
  //   document.title = searchParams
  //     ? `${searchParams} - Should I Play This?`
  //     : "Should I Play This?";
  // }, [searchParams, handleSearch]);

  const handleClick = tag => () => {
    console.log(`you clicked: ${tag}`);
    //SearchBar.sup(tag);
  }

  const handleDelete = tag => () => {
    console.log(`you tried to delete: ${tag}`);
    tags = tags.filter(item => item !== tag);
    console.log(tags);
  };

  const handleKeyDown = () => {
    //if (event.key === "Enter") {
      //setPage(1);
      handleSearch(searchInput);
    //}
  };

  /*const tagArray = (tag) => {
    console.log(`they clicked ${tag}`)
  };*/

  useEffect(() => {
    //console.log(`Search input is: ${searchInput}`)
    handleSearch(searchInput)
    //console.log(initialGames)
  }, [searchInput])

  return (
    <FormControl variant="outlined" className={classes.form}>
      <InputLabel
        htmlFor="Searchbar"
        sx={{
          color: "rgba(220, 220, 255, .7)",
          fontSize: mobile ? 14 : "1rem",
          lineHeight: mobile ? "1.6em" : "1.4375em"
        }}
      >
        Search for games...
      </InputLabel>
      <OutlinedInput
        startAdornment=
          {<Stack direction="row" spacing={1} marginRight="8px">
            {tags.map((tag) => {
                return (<Chip label={tag} onClick={handleClick(tag)} onDelete={handleDelete(tag)} size="small" key={tag}/>);
              })}
          </Stack>}
        id="Searchbar"
        type="search"
        sx={{ borderRadius: "60px", marginLeft: -1, paddingRight: 3 }}
        //defaultValue={searchParams}
        //onKeyDown={handleKeyDown}
        onChange={(e) => setSearchInput(e.target.value)}
        label="Search for games..."
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              aria-label="search for games"
              edge="end"
              onClick={handleClick}
            >
              <FontAwesomeIcon icon={faSearch} color="#C8D4FF" />
            </IconButton>
          </InputAdornment>
        }
      />
    </FormControl>
  );
};

export default SearchBar;
