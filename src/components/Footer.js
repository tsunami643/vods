import { Link, Typography, useMediaQuery, useTheme } from "@mui/material";
import React from "react";

const Footer = () => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("mobileCard"));

  return (
    <footer style={{ textAlign: "center", padding: "32px 16px" }}>
      <Typography fontSize={mobile ? 14 : "1rem"}>
      Visit the{" "}
        <Link
          href="https://www.youtube.com/channel/UCWPpKM7gNLRNUuA7V00Xi4g/playlists?view=1&sort=lad"
          target="_blank"
          rel="noopener"
          underline="none"
          fontWeight={700}
        >
          YouTube channel
        </Link>{" "}
        to view all the playlists.
        <br />
        <Link
          href="https://twitch.tv/tsunami643"
          target="_blank"
          rel="noopener"
          underline="none"
          fontWeight={700}
        >
          Twitch
        </Link>{" "}
        |{" "}
        <Link
          href="https://twitter.com/tsunami643"
          target="_blank"
          rel="noopener"
          underline="none"
          fontWeight={700}
        >
          Twitter
        </Link>{" "}
        |{" "}
        <Link
          href="https://instagram.com/tsunami643"
          target="_blank"
          rel="noopener"
          underline="none"
          fontWeight={700}
        >
          Instagram
        </Link>
      </Typography>
    </footer>
  );
};

export default Footer;
