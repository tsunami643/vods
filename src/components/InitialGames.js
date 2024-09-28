import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../utils/constants";

const initialGamesFunction = () => {

    const [initialGamesLoad, setinitialGamesLoad] = useState(Boolean);
    const [initialGames, setinitialGames] = useState([]);

    setinitialGamesLoad(true);
    setinitialGames([]);

    axios.get('https://youtube.googleapis.com/youtube/v3/playlists', {
        params: {
        part: "snippet,contentDetails",
        channelId : process.env.REACT_APP_YOUTUBE_CHANNEL_ID,
        fields: "nextPageToken,items(id,snippet(title,description),contentDetails(itemCount))",
        maxResults: 20,
        key: process.env.REACT_APP_YOUTUBE_API_KEY,
        },
    })
    .then((response) => {
        if (response.data.nextPageToken){var nextPageToken = response.data.nextPageToken;}
        //console.log(response.data.nextPageToken);
        setinitialGames([response.data.items])
        const promises = [];
        //Get individual playlist data
        initialGames.forEach(elem => {
        elem.game_name = elem.snippet.title;
        //elem.tags = elem.snippet.description.split(',');
        //elem.streams = elem.contentDetails.itemCount;
        //elem.playlistId = elem.id;
        
        promises.push(axios.get(
            'https://youtube.googleapis.com/youtube/v3/playlistItems', {
            params: {
                part: "contentDetails",
                playlistId: elem.id,
                fields: "items(contentDetails)",
                maxResults: 50,
                key: process.env.REACT_APP_YOUTUBE_API_KEY,
                },
            })
        .then((response) => {
            elem.date_completed = new Date(response.data.items[response.data.items.length-1].contentDetails.videoPublishedAt);
            elem.first_video = response.data.items[0].contentDetails.videoId;
        }))
        })
        
        //Get cover image from shouldiplay API
        initialGames.forEach(elem => {
        promises.push(axios.get(`${API_URL}/hltb/${elem.game_name.toLowerCase()}`)
        .then((result) => {
            elem.game_image = result.data.data[0].game_image;
            //console.log(`https://howlongtobeat.com/games/`+game_image+`?width=160`)
        })
        .catch((error) => {
            elem.game_image = "no_boxart.png";
        }))

        Promise.allSettled(promises).then(() => {
            const sortByDate = (data) =>
                data.sort (({date_completed: a}, {date_completed: b}) => a > b ? -1 : a < b ? 1 : 0)
              initialGames = sortByDate(initialGames);
            console.log("Next Page Token: "+nextPageToken);
            console.log(initialGames)
            //setinitialGamesLoad(false)
          })
        })
    })
}

export default initialGamesFunction;