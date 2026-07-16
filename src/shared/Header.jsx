import { Box, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import { routes } from "../routes";
import logo from "./logo.png";

const Header = ({ onClearFilters }) => {
  return (
    <Link
      className="catalog-brand"
      component={RouterLink}
      to={routes.home}
      underline="none"
      onClick={onClearFilters}
    >
      <img className="catalog-brand-logo" src={logo} alt="logo" />
      <Box className="catalog-brand-copy">
        <Typography className="catalog-brand-title">
          tsunami's twitch vods
        </Typography>
        <Typography className="catalog-brand-subtitle">
          A catalog of games played on stream
        </Typography>
      </Box>
    </Link>
  );
};

export default Header;
