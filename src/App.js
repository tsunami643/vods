import {
  AppBar,
  Box,
  Divider,
  Pagination,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { NumberParam, useQueryParam, withDefault } from "use-query-params";
import Footer from "./components/Footer";
import GameBox from "./components/GameBox";
import GameBoxSkeleton from "./components/GameBoxSkeleton";
import Logo from "./components/navbar/Logo";
import SearchBar from "./components/navbar/SearchBar";
import { API_URL, } from "./utils/constants";
import axios from "axios";
import { allPlaylists } from "./allPlaylists";
//import initialGamesFunction from "./components/InitialGames";

//const YOUTUBE_API_KEY = "REDACTED";
//const YOUTUBE_CHANNEL_ID = "UCWPpKM7gNLRNUuA7V00Xi4g";

//var games = {"test": "test"};
/*
function getGames () {axios.get('https://youtube.googleapis.com/youtube/v3/playlists', {
  params: {
    part: "snippet,contentDetails",
    channelId : YOUTUBE_CHANNEL_ID,
    fields: "nextPageToken,items(id,snippet(title,description),contentDetails(itemCount))",
    maxResults: 20,
    key: YOUTUBE_API_KEY,
    },
  })
  .then((response) => {
    //console.log(response);
    var games = [];
    //If there are more than 20 results, get nextPageToken for another request
    if (response.data.nextPageToken){console.log(response.data.nextPageToken)}
    //Go through each playlist and parse info
    response.data.items.map(elem => {
      var gameName = elem.snippet.title;
      var tags = elem.snippet.description.split(',');
      var streams = elem.contentDetails.itemCount;
      var playlistId = elem.id;
      //Get cover image from shouldiplay API
      var gameCover = axios.get(`${API_URL}/hltb/${gameName.toLowerCase()}`)
      .then((result) => {
        return result.data.data[0].game_image;
        //console.log(`https://howlongtobeat.com/games/`+gameCover+`?width=160`)
      })
      .catch((error) => {
        return "no_boxart.png";
      })
      //Go through each video in playlist and parse info
      axios.get(
        'https://youtube.googleapis.com/youtube/v3/playlistItems', {
          params: {
            part: "contentDetails",
            playlistId: playlistId,
            fields: "items(contentDetails)",
            maxResults: 50,
            key: YOUTUBE_API_KEY,
            },
        })
      .then((response) => {
        var dateCompleted = new Date(response.data.items[response.data.items.length-1].contentDetails.videoPublishedAt);
        //dateCompleted = dateCompleted.toDateString().slice(4);
        var firstVideo = response.data.items[0].contentDetails.videoId;
        //var videoLink = "https://www.youtube.com/watch?v=" + firstVideo + "&list=" + playlistId;
        games.push({gameName, dateCompleted, streams, tags, playlistId, firstVideo, gameCover});
        const sortByDate = (data) =>
          data.sort (({dateCompleted: a}, {dateCompleted: b}) => a > b ? -1 : a < b ? 1 : 0)
        sortByDate(games);
        console.log(games);
        return games;
      })
    })
  })
  .catch((error) => {
    console.log("it broke")
  })
}
*/
//getGames();

//console.log(InitialGames());

const App = () => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(Boolean);
  const [searchResults, setSearchResults] = useState([]);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useQueryParam("page", withDefault(NumberParam, 1));
  const [nextPageToken, setnextPageToken] = useState("");
  const [initialGamesLoad, setinitialGamesLoad] = useState(Boolean);
  const [initialGames, setinitialGames] = useState([]);
  const [q, setQ] = useState("");
  const [searchParam] = useState(["gameName"]);
  const [tagArray, setTagArray] = useState([])

  useEffect(() => {
    document.title = "tsunami's twitch vods"
    setinitialGamesLoad(true);
    setinitialGames([]);
    /*setinitialGames(allPlaylists);
    setSearchResults(allPlaylists);
    setinitialGamesLoad(false);*/
    let gameDatabase;
    axios.get(`${API_URL}/getvods`)
    .then((response) => {
      gameDatabase = response.data;
      setinitialGames(gameDatabase)
      setSearchResults(gameDatabase)
      setinitialGamesLoad(false)
    })
    //Get all channel playlists (capped by maxResults)
    /*axios.get('https://youtube.googleapis.com/youtube/v3/playlists', {
        params: {
        part: "snippet,contentDetails",
        channelId : process.env.REACT_APP_YOUTUBE_CHANNEL_ID,
        fields: "nextPageToken,items(id,snippet(title,description),contentDetails(itemCount))",
        maxResults: 50,
        key: process.env.REACT_APP_YOUTUBE_API_KEY,
        //pageToken: "CDIQAA",
        },
    })
    .then((response) => {
        if (response.data.nextPageToken){setnextPageToken(response.data.nextPageToken);}
        //console.log(response.data.nextPageToken);
        let streamList = response.data.items;
        //console.log(streamList)
        let nextPageToken = response.data.nextPageToken;
        const promises = [];
        
        /*while(nextPageToken){
          axios.get('https://youtube.googleapis.com/youtube/v3/playlists', {
            params: {
            part: "snippet,contentDetails",
            channelId : process.env.REACT_APP_YOUTUBE_CHANNEL_ID,
            fields: "nextPageToken,items(id,snippet(title,description),contentDetails(itemCount))",
            maxResults: 50,
            key: process.env.REACT_APP_YOUTUBE_API_KEY,
            pageToken: nextPageToken,
            },
          })
          .then((response) => {
            let additionalStreamList = response.data.items;
            let streamList = streamList.concat(additionalStreamList);
            nextPageToken = additionalStreamList.data.nextPageToken;
          })
        }*/
/*
        const allPlaylists = streamList.map(stream => (
          {
            gameName: stream.snippet.title,
            tags: stream.snippet.description.split(','),
            playlistId: stream.id,
            streams: stream.contentDetails.itemCount
          }
        )
      )
        //Go through all playlists
        allPlaylists.forEach(elem => {
          /*elem.gameName = elem.snippet.title;
          elem.tags = elem.snippet.description.split(',');
          elem.streams = elem.contentDetails.itemCount;
          elem.playlistId = elem.id;*/
/*          
          //Get individual playlist data 
          promises.push(axios.get(
            'https://youtube.googleapis.com/youtube/v3/playlistItems', {
              params: {
                part: "contentDetails",
                playlistId: elem.playlistId,
                fields: "items(contentDetails)",
                maxResults: 50,
                key: process.env.REACT_APP_YOUTUBE_API_KEY,
                },
            })
          .then((response) => {
            elem.dateCompleted = new Date(response.data.items[response.data.items.length-1].contentDetails.videoPublishedAt);
            elem.firstVideo = response.data.items[0].contentDetails.videoId;
          }))
        })
        
        //Get cover image from shouldiplay API
        allPlaylists.forEach(elem => {
          promises.push(axios.get(`${API_URL}/hltb/${elem.gameName.toLowerCase()}`)
          .then((result) => {
            elem.gameCover = result.data.data[0].game_image;
            //console.log(`https://howlongtobeat.com/games/`+gameCover+`?width=160`)
          })
          .catch((error) => {
            elem.gameCover = "no_boxart.png";
          })
          )
        })

        //Wait for all API responses, then sort games by date
        Promise.allSettled(promises).then(() => {
          const sortByDate = (data) =>
            data.sort (({dateCompleted: a}, {dateCompleted: b}) => a > b ? -1 : a < b ? 1 : 0)
          setinitialGames(sortByDate(allPlaylists))
          setinitialGamesLoad(false)
        })
    });*/
  }, []);

  /*useEffect(() => {
    //setSearchResults(initialGames)
    console.log(`Next Page Token: ${nextPageToken}`)
    console.log(initialGames)
  }, [initialGamesLoad])*/

  // https://github.com/pbeshai/use-query-params/blob/master/examples/no-router/src/App.js
  // const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  // useEffect(() => {
  //   // listen for changes to the URL and force the app to re-render
  //   history.listen(() => {
  //     forceUpdate();
  //   });
  // }, []);

  /*const handleSearch = useCallback(
    (value) => {
      setLoading(true);
      setSearchResults([]);
      fetch(`${API_URL}/hltb/${value.toLowerCase()}?page=${page}`)
        .then((response) => response.json())
        .then((result) => {
          setLoading(false);
          setSearchResults(result.data);
          setPageCount(result.pageTotal);
        });
      window.gtag("event", "search", {
        search_term: value.toLowerCase(),
      });
    },
    [page]
  );*/

  const handleSearch = useCallback(
    (value) => {
      let results = initialGames.filter((item) => {
        return searchParam.some((newItem) => {
            return (
                item[newItem]
                    .toString()
                    .toLowerCase()
                    .indexOf(value.toLowerCase()) > -1
              );
          });
      });
      //console.log(results)
      setSearchResults(results)
    }, [initialGamesLoad]);
  
  function addTag(tag) {
    //console.log(`you clicked ${tag}`);
    if(tagArray.includes(tag) === false){
      tagArray.push(tag);
      setTagArray(tagArray);
    }
    //console.log(tagArray);
  }

  const handleChange = (event, value) => {
    setPage(value);
  };

  //GAME SEARCH FUNCTION AND INITIAL LOADER
  // function search(initialGames) {
  //   return initialGames.filter((item) => {
  //       return searchParam.some((newItem) => {
  //           return (
  //               item[newItem]
  //                   .toString()
  //                   .toLowerCase()
  //                   .indexOf(q.toLowerCase()) > -1
  //           );
  //       });
  //   });
  // }

  return (
    <Box display={"flex"} flexDirection={"column"}>
      <AppBar
        position="sticky"
        sx={{
          bgcolor: "#242A43",
          backgroundImage: "none",
          boxShadow: "0px 2px 40px 0px rgb(0 0 0 / 40%)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Logo />
            {/*{React.createElement("input", {
                type: "search",
                name: "search-form",
                id: "search-form",
                className: "search-input",
                placeholder: "Search for...",
                value: q,
                onChange: e => setQ(e.target.value) }) /*#__PURE__*/}
          {/*<SearchBar tags={["Choices Matter"]} />*/}
          <SearchBar handleSearch={handleSearch} tags={tagArray} />
        </Toolbar>
      </AppBar>
      <Box
        p={mobile ? "8px 8px 16px 8px" : 2}
        display={"flex"}
        flexWrap={"wrap"}
        justifyContent={"center"}
        alignContent={"flex-start"}
        minHeight={{
          xs: "calc(100vh - 384px)",
          mobileCard: "calc(100vh - 387px)",
          sm: "calc(100vh - 369px)",
        }}
      >
        {initialGamesLoad ? (
          <GameBoxSkeleton />
        ) : searchResults.length ? (
          searchResults.map((gameData, index) => {
            return <GameBox data={gameData} addTag={addTag} key={index}/>;
          })
        ) : (
          <Typography variant="h5" padding={3}>
            No Results
          </Typography>
        )}
      </Box>

      <Pagination
        count={pageCount}
        size={mobile ? "small" : ""}
        page={page}
        onChange={handleChange}
        sx={{ mb: 2, alignSelf: "center" }}
      />

      <Divider flexItem />

      <Footer />
    </Box>
  );
};

export default App;
