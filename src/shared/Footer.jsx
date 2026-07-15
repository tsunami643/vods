import { faInstagram, faTwitch, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Link, Typography, useMediaQuery, useTheme } from "@mui/material";
import React from "react";

const socialLinkStyles = {
  alignItems: "center",
  display: "inline-flex",
  fontSize: "1.35em",
  transition: "opacity 0.2s",
  "&:hover": { opacity: 0.75 },
};

const Footer = () => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("mobileCard"));

  return (
    <footer style={{ textAlign: "center", padding: "32px 16px" }}>
      <Typography sx={{ fontSize: mobile ? 14 : "1rem" }}>
      Visit the{" "}
        <Link
          href="https://www.youtube.com/channel/UCWPpKM7gNLRNUuA7V00Xi4g/playlists?view=1&sort=lad"
          target="_blank"
          rel="noopener"
          underline="none"
          sx={{ fontWeight: 700 }}
        >
          YouTube channel
        </Link>{" "}
        to view all the playlists.
        <br />
        <Box component="span" sx={{ display: "inline-flex", gap: 5, mt: 3 }}>
          <Link
            href="https://x.com/tsunami643"
            target="_blank"
            rel="noopener"
            underline="none"
            aria-label="X"
            sx={socialLinkStyles}
          >
            <FontAwesomeIcon icon={faXTwitter} />
          </Link>
          <Link
            href="https://twitch.tv/tsunami643"
            target="_blank"
            rel="noopener"
            underline="none"
            aria-label="Twitch"
            sx={socialLinkStyles}
          >
            <FontAwesomeIcon icon={faTwitch} />
          </Link>
          <Link
            href="https://instagram.com/tsunami643"
            target="_blank"
            rel="noopener"
            underline="none"
            aria-label="Instagram"
            sx={socialLinkStyles}
          >
            <FontAwesomeIcon icon={faInstagram} />
          </Link>
        </Box>
      </Typography>
    </footer>
  );
};

export default Footer;
