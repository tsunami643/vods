import { Box, Link, Typography, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { routes } from "../routes";
import logo from "./logo.png";

const Header = () => {
  const theme = useTheme();

  return (
    <Link
      component={RouterLink}
      to={routes.home}
      underline="none"
      sx={{
        alignItems: "center",
        display: "flex",
        transition: 'text-shadow 150ms linear',
        '&:hover': {
          textShadow: '0 0 10px rgba(220, 220, 255, 0.9)'
        },
        '& img': {
          transition: 'all 150ms linear',
        },
        '&:hover img': {
          boxShadow: '0 0 5px rgba(220, 220, 255, 0.9)',
          filter: 'brightness(1.25)',
        }
      }}
    >
      <img src={logo} height={50} style={{borderRadius: '9000px'}}alt="logo" />
      <Box sx={{ ml: 2, display: { xs: "none", sm: "block" } }}>
        <Typography sx={{ fontSize: 25, fontWeight: 700, transition: 'text-shadow 120ms ease' }}>
          tsunami's twitch vods
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 500,
            color: theme.palette.text.primary,
            transition: 'text-shadow 120ms ease',
          }}
        >
          A catalog of games played on stream
        </Typography>
      </Box>
    </Link>
  );
};

export default Header;
