import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../utils/constants';
import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/playlist/${id}`)
      .then(res => setPlaylist(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Typography>Loading...</Typography>;
  if (!playlist) return <Typography>Not found</Typography>;

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>{playlist.name || `Playlist #${playlist.id}`}</Typography>
      <List>
        {playlist.videos.map(v => (
          <ListItem key={v.id} button component={RouterLink} to={`/video/${v.id}`}>
            <ListItemText
              primary={v.name || `Video #${v.id}`}
              secondary={new Date(v.createdAt).toLocaleString()}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}




